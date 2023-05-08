const inspect = require('object-inspect');
const logger = require('../debug');
const stubbedAllure = require('../stubbedAllure');
const { commandIsGherkinStep } = require('./CucumberHandler');
const callbacks = ['then', 'spread', 'each', 'within'];
const { Stage, Status } = require('@shelex/allure-js-commons-browser');
const Chain = require('./CypressChain');

module.exports = class CypressHandler {
    constructor(reporter) {
        this.reporter = reporter;
        this.chain = new Chain();
    }

    shouldBeLogged(command) {
        return commandIsGherkinStep(command)
            ? this.reporter.config.shouldLogGherkinSteps()
            : this.reporter.config.shouldLogCypress();
    }

    findAllureExecutableFor(command) {
        if (!command.parent) {
            return this.reporter.currentExecutable;
        }

        const parent = this.chain.getParent(command.parent);

        if (!parent) {
            return this.reporter.currentExecutable;
        }

        // such commands contain argument
        // which is basically a function that will be executed
        if (callbacks.includes(parent.name)) {
            return this.findAllureExecutableFor(parent);
        }

        // in case latest step in newer then parent - attach to user defined step
        return this.reporter.currentStep &&
            this.reporter.currentStep.info.start > parent.step.info.start
            ? this.reporter.currentStep
            : parent.step;
    }

    enqueued(command) {
        logger.cy(`enqueued: %s %O`, command.name, command);
        // rules for skipping commands:
        const skippingRules = {
            // assertions, as they don't receive command:start and command:end events and are hardly trackable
            isAssertion: command.type === 'assertion',

            // allure custom command used for interacting with allure api (cy.allure())
            isAllureCustomCommand: command.name === 'allure',

            // commands, which are child commands of cy.allure command
            isAllureCustomChildCommand:
                Object.getOwnPropertyNames(
                    stubbedAllure.reporter.getInterface()
                ).includes(command.name) && command.type === 'child',

            // commands, where second argument has {log: false}
            isNotLogged:
                command.args &&
                command.args.length &&
                command.args.some(
                    (arg) =>
                        arg &&
                        typeof arg.log !== 'undefined' &&
                        arg.log === false
                )
        };

        const shouldBeSkipped = Object.keys(skippingRules).some(
            (rule) => skippingRules[rule]
        );

        if (shouldBeSkipped) {
            logger.cy(`command should be skipped`);
            return;
        }

        // gather command info to use for later processing
        const chainable = this.chain.add(command);

        logger.cy(`tracking command: %O`, chainable);
    }

    started(command) {
        logger.cy(`started: %s %O`, command.name, command);
        // check if we have enqueued command
        const chainable = this.chain.getCommand(command);

        if (!chainable) {
            logger.cy(`command not available`);
            return;
        }

        logger.cy(`tracked info about command: %O`, command);

        chainable.commandLog = command;

        // add dummy allure step implementation for "then" commands to avoid adding them to report
        // as they mostly expose other plugin internals and other functions not related to test
        // on other hand, if they produce info for command log - step will be created when command end
        if (callbacks.includes(chainable.name)) {
            chainable.step = {
                info: {},
                stepResult: {},
                endStep() {}
            };
        } else {
            const executable = this.findAllureExecutableFor(chainable);

            const displayArg = (arg) => {
                if (!arg) {
                    return arg;
                }

                logger.cy(`checking argument %O and provide to step`, arg);
                if (typeof arg === 'function') {
                    return '[function]';
                }
                if (typeof arg === 'object') {
                    // for jquery objects log selector only
                    if (arg.selector) {
                        return arg.selector;
                    }

                    // for html elements check name and class
                    if (arg.localName) {
                        return `${arg.localName}${
                            arg.className ? `.${arg.className}` : ''
                        }`;
                    }

                    // log just native types - object, array, etc
                    if (
                        arg.constructor &&
                        typeof arg.constructor.toString === 'function' &&
                        arg.constructor.toString().endsWith('{ [native code] }')
                    ) {
                        try {
                            return displayObject(arg);
                        } catch (e) {
                            logger.cy(
                                `failed to stringify object %O, returning placeholder`,
                                arg
                            );
                            return '[Object]';
                        }
                    }

                    return '[Object]';
                }

                return arg;
            };

            const commandArgs =
                command.args.length &&
                command.args.map((arg) => `"${displayArg(arg)}"`).join('; ');

            const step =
                this.shouldBeLogged(command) &&
                executable.startStep(
                    `${chainable.name}${commandArgs ? ` (${commandArgs})` : ''}`
                );

            if (step) {
                logger.cy(`started allure step %s %O`, step.info.name, step);

                chainable.step = step;
            }
        }
        this.chain.currentChainer = command;
    }

    finished(chainable, failed = false) {
        logger.cy(`finished: %s %O`, chainable.name, chainable);
        // check if we have enqueued command
        const command = this.chain.getCommand(chainable, true);

        if (!command) {
            logger.cy(`command not available`);
            return;
        }

        logger.cy(`tracked info about command: %O`, command);
        this.chain.currentChainer = null;

        // in case no children enqueued - finish this step
        if (!command.children.length || failed) {
            logger.cy(`no children enqueued left, finishing step`);
            // check if command has some entries for command log
            if (command.commandLog.logs.length) {
                logger.cy(
                    `found command log entries %O`,
                    command.commandLog.logs
                );
                // set first command log (which refers to current command) as last
                // and process other child logs first (asserts are processed such way)
                // NOTE: applies to older cypress versions, where "commandLogId" not existed
                !command.commandLog.logs.some(
                    (log) =>
                        log && log.attributes && log.attributes.commandLogId
                ) &&
                    command.commandLog.logs.push(
                        command.commandLog.logs.shift()
                    );

                command.commandLog.logs.forEach((entry, index) => {
                    let log;

                    // try...catch for handling case when Cypress.log has error in consoleProps function
                    try {
                        log = entry.toJSON();
                    } catch (e) {
                        logger.cy(
                            `could not call toJSON for command log entry #%d, %O`,
                            index,
                            entry
                        );
                        return;
                    }
                    logger.cy(`checking entry #%d, %O`, index, log);

                    // for main log (which we set last) we should finish command step
                    if (index === command.commandLog.logs.length - 1) {
                        logger.cy(`last entry, finishing step`);
                        // in case "then" command has some logging - create step for that
                        if (callbacks.includes(command.name)) {
                            const executable =
                                this.findAllureExecutableFor(command);

                            if (
                                !this.reporter.config.shouldLogGherkinSteps() ||
                                commandIsGherkinStep(chainable)
                            ) {
                                return;
                            }

                            const step = this.startStep(executable, log);
                            logger.cy(`creating step for then's %O`, step);

                            command.step = step;

                            if (
                                log.name === 'step' ||
                                commandIsGherkinStep(command)
                            ) {
                                logger.cy(
                                    `found gherkin step, finishing all current steps`
                                );
                                this.reporter.finishRemainingSteps(
                                    command.passed
                                        ? Status.PASSED
                                        : Status.FAILED
                                );
                                this.reporter.steps.push(step);
                                this.reporter.parentStep = step;
                            }
                        }

                        const commandPassed = this.finishStep(
                            command.step,
                            log,
                            command.passed
                        );

                        !commandPassed && (command.passed = false);
                    } else {
                        // handle case when other logs refer to chained assertions
                        // so steps should be created
                        const executable = this.findAllureExecutableFor({
                            id: log.id,
                            parent: command.parent
                        });

                        const step = this.startStep(executable, log);
                        logger.cy(
                            `attaching command log entries as allure steps %O`,
                            step
                        );

                        const commandPassed = this.finishStep(step, log);

                        !commandPassed && (command.passed = false);
                    }
                });
            } else {
                logger.cy(
                    `no command log entries, finish step %O`,
                    command.step
                );
                this.finishStep(
                    command.step,
                    {
                        state: command.passed ? Status.PASSED : Status.FAILED
                    },
                    command.passed
                );
            }
            command.finished = true;
            !command.passed && (failed = true);
            // notify parent that one of child commands is finished
            // and pass status
            this.informParent(command, failed);
        }
    }

    informParent(child, failed = false) {
        if (!child.parent) {
            return;
        }
        const parent = this.chain.getParent(child.parent);

        // better to skip case when no parent found
        if (!parent) {
            return;
        }

        logger.cy(`command has parent, %O`, parent);

        const childIndex = parent.children.indexOf(child.id);

        // if found child - remove it from parent
        if (childIndex > -1) {
            logger.cy(`removing child from parent %O`, parent);
            parent.children.splice(childIndex, 1);
            // update status of parent in case any of children failed
            if (!child.passed || failed) {
                parent.passed = false;
            }
        }

        // finish parent step when no children left or when test is failed
        if (!parent.children.length || failed) {
            logger.cy(
                `finish parent step as no other children left %O`,
                parent
            );
            !parent.passed && (failed = true);
            this.finished(parent.commandLog, failed);
        }
    }

    handleRemainingCommands(status = Status.FAILED) {
        // process all not finished steps from chainer left
        // usually is executed on fail
        this.chain.getCommandsWithSteps().forEach((command) => {
            !command.finished &&
                this.finished(command.commandLog, status === Status.FAILED);
        });
        this.chain.currentChainer = null;
    }

    finishStep(step, log, commandStatus) {
        this.attachRequestsMaybe(step, log);

        const shouldOverrideName = ![
            'request',
            'step',
            'GET',
            'POST',
            'PUT',
            'DELETE',
            'PATCH'
        ].includes(log.name);

        if (
            step &&
            step.info &&
            step.info.name &&
            log.name &&
            log.message &&
            shouldOverrideName
        ) {
            step.info.name = `${log.name} ${log.message}`;
            logger.cy(`changing step name to "%s" %O`, step.info.name, step);
        }

        const passed =
            log && log.err
                ? false
                : commandStatus || log.state !== Status.FAILED;

        if (!step) {
            return passed;
        }

        step.info.stage = Stage.FINISHED;

        step.info.status = passed ? Status.PASSED : Status.FAILED;

        log.name !== 'step' && step.endStep();
        return passed;
    }

    startStep(executable, log) {
        logger.cy(`creating step for command log entry %O`, log);
        // define step name based on cypress log name or messages
        const messages = {
            xhr: () =>
                `${
                    (log.consoleProps.Stubbed === 'Yes' ? 'STUBBED ' : '') +
                    log.consoleProps.Method
                } ${log.consoleProps.URL}`,
            step: () =>
                `${log.displayName || ''}${log.message.replace(/\*/g, '')}`,
            stub: () =>
                `${log.name} [ function: ${log.functionName} ] ${
                    log.alias ? `as ${log.alias}` : ''
                }`,
            route: () => `${log.name} ${log.method} ${log.url}`,
            default: () =>
                log.message ? `${log.message} ${log.name}` : `${log.name}`
        };

        // handle cases with stubs name containing increments (stub-1, stub-2, etc.)
        const lookupName = log.name.startsWith('stub') ? 'stub' : log.name;

        const message = messages[lookupName] || messages.default;

        // in case log name is "step" - assumed that it comes from cucumber preprocessor
        // in case it is cucumber step - executable should be current test
        if (log.name === 'step') {
            executable = this.reporter.currentTest;
        }

        const logName = message();

        // skip empty callbacks (usually come from cucumber plugin)
        if (logName === 'function(){} then') {
            return;
        }

        const newStep = executable.startStep(logName);

        // parse docString for gherkin steps
        if (
            log.name === 'step' &&
            log.consoleProps &&
            log.consoleProps.step &&
            log.consoleProps.step.argument &&
            log.consoleProps.step.argument.content
        ) {
            newStep.addParameter(
                log.consoleProps.step.argument.type,
                log.consoleProps.step.argument.content
            );
        }

        // add expected and actual for asserts
        if (log.name === 'assert') {
            const displayValue = (value) =>
                typeof value === 'object' && value !== null
                    ? JSON.stringify(value, getCircularReplacer(), 2)
                    : value;

            logger.cy(
                '[allure:cy] adding actual and expected as a parameter %O',
                log
            );

            log.actual &&
                newStep.addParameter('actual', displayValue(log.actual));
            log.expected &&
                newStep.addParameter('expected', displayValue(log.expected));
        }

        return newStep;
    }

    attachRequestsMaybe(step, log) {
        // just cy.request output
        const isCyRequest =
            log.consoleProps &&
            (log.consoleProps.Request || log.consoleProps.Requests);

        // output from https://github.com/filiphric/cypress-plugin-api
        const isCyApiRequest =
            log.consoleProps &&
            log.consoleProps.yielded &&
            log.consoleProps.yielded.allRequestResponses &&
            log.consoleProps.yielded.allRequestResponses.length;

        if (
            // check for logs where console props contain request info
            !isCyRequest &&
            !isCyApiRequest
        ) {
            return;
        }

        if (log.renderProps && log.renderProps.message) {
            step.info.name = log.renderProps.message;
        }

        if (isCyApiRequest) {
            const { status, statusText } = log.consoleProps.yielded;
            step.info.name = `${log.name} "${log.message}" - ${status} | ${statusText}`;
        }

        if (!this.reporter.config.shouldAttachRequests()) {
            return;
        }

        const request =
            log.consoleProps.Request ||
            Cypress._.last(log.consoleProps.Requests) ||
            Cypress._.last(log.consoleProps.yielded.allRequestResponses);
        const response =
            log.consoleProps.Yielded ||
            Cypress._.last(log.consoleProps.yielded.allRequestResponses);

        const attach = (step, name, content) => {
            if (!content) {
                return;
            }

            let jsonContent;

            try {
                jsonContent =
                    typeof content === 'string' ? JSON.parse(content) : content;
            } catch (e) {
                // content is not json
            }

            const fileType = jsonContent ? 'application/json' : 'text/plain';
            const fileName = this.reporter.writeAttachment(
                jsonContent ? JSON.stringify(jsonContent, null, 2) : content,
                fileType
            );
            step.addAttachment(name, fileType, fileName);
        };

        if (request) {
            attach(step, 'requestHeaders', request['Request Headers']);
            attach(step, 'request', request['Request Body']);
        }
        if (response) {
            attach(
                step,
                'responseHeaders',
                response.headers || response['Response Headers']
            );
            attach(
                step,
                'response',
                response.body || response['Response Body']
            );
        }
    }
};

const getCircularReplacer = () => {
    const seen = new WeakSet();
    return (_, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return;
            }
            seen.add(value);
        }
        return value;
    };
};

const displayObject = (obj) =>
    inspect(obj, {
        depth: 2,
        maxStringLength: 40
    });
