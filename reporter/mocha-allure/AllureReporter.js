/**
 * A lot of credit to Sergey Korol <serhii.s.korol@gmail.com> who made
 * Allure-mocha reporter: "https://github.com/allure-framework/allure-js/tree/master/packages/allure-mocha"
 */

const { LabelName, Stage, Status, ContentType } = require('allure-js-commons');
const path = require('path');
const { createHash } = require('crypto');
const AllureInterface = require('./AllureInterface');
const { tagToLabel, tagToLink } = require('../gherkinToLabel');
const stubbedAllure = require('../stubbedAllure');
const callbacks = ['then', 'spread', 'each', 'within'];

module.exports = class AllureReporter {
    constructor(runtime, options) {
        this.suites = [];
        this.steps = [];
        this.commands = [];
        this.currentChainer = null;
        this.screenshots = [];
        this.runningTest = null;
        this.runtime = runtime;
        this.currentHook = null;
        this.parentStep = null;
        this.logCypress = options.logCypress || false;
    }

    /**
     * @returns {Allure}
     */
    getInterface() {
        return new AllureInterface(this, this.runtime);
    }

    get currentExecutable() {
        return (
            this.currentStep ||
            this.parentStep ||
            this.currentHook ||
            this.currentTest ||
            this.currentSuite
        );
    }

    get currentSuite() {
        if (this.suites.length === 0) {
            return null;
        }
        return this.suites[this.suites.length - 1];
    }

    get currentStep() {
        if (this.steps.length > 0) {
            return this.steps[this.steps.length - 1];
        }
        return null;
    }

    get currentTest() {
        return this.runningTest;
    }

    set currentTest(test) {
        this.runningTest = test;
    }

    startSuite(suiteName) {
        const scope = this.currentSuite || this.runtime;
        const suite = scope.startGroup(suiteName || 'Global');
        this.pushSuite(suite);
    }

    endSuite() {
        if (this.currentSuite !== null) {
            if (this.currentStep !== null) {
                this.currentStep.endStep();
            }
            this.currentSuite.endGroup();
            this.popSuite();
        }
    }

    startCase(test) {
        if (this.currentSuite === null) {
            throw new Error('No active suite');
        }

        this.commands = [];
        this.currentTest = this.currentSuite.startTest(test.title);
        this.currentTest.fullName = test.title;
        this.currentTest.historyId = createHash('md5')
            .update(test.fullTitle())
            .digest('hex');
        this.currentTest.stage = Stage.RUNNING;

        if (test.parent) {
            const titlePath = test.parent.titlePath();
            // only suite available:
            if (titlePath.length === 1) {
                this.currentTest.addLabel(LabelName.SUITE, titlePath.pop());
            } else {
                const [parentSuite, suite, ...subSuites] = titlePath;
                if (parentSuite) {
                    this.currentTest.addLabel(
                        LabelName.PARENT_SUITE,
                        parentSuite
                    );
                }
                if (suite) {
                    this.currentTest.addLabel(LabelName.SUITE, suite);
                }
                if (subSuites.length > 0) {
                    this.currentTest.addLabel(
                        LabelName.SUB_SUITE,
                        subSuites.join(' > ')
                    );
                }
            }
        }
    }

    // accept cucumber tags from cypress-cucumber-preprocessor as commands
    handleCucumberTags() {
        if (globalThis && globalThis.testState) {
            const { testState } = globalThis;
            const { currentTest } = this;
            /**
             * tags set on test level has higher priority
             * to not be overwritten by feature tags
             */
            ['feature', 'currentScenario'].forEach(function (type) {
                testState[type] &&
                    testState[type].tags
                        // check for labels
                        .filter(function ({ name }) {
                            const match = tagToLabel.exec(name);
                            if (match) {
                                const [, command, value] = match;
                                currentTest.addLabel(command, value);
                            }
                            return !match;
                        })
                        // check for links
                        .filter(function ({ name }) {
                            const match = tagToLink.exec(name);
                            if (match) {
                                const [, command, name, url] = match;
                                const urlPrefix = Cypress.env(
                                    command === 'issue'
                                        ? 'issuePrefix'
                                        : 'tmsPrefix'
                                );
                                currentTest.addLink(
                                    urlPrefix ? `${urlPrefix}${url}` : url,
                                    name,
                                    command
                                );
                            }
                            return !match;
                        })
                        // add other tags
                        .forEach(function ({ name }) {
                            currentTest.addLabel('tag', name.replace('@', ''));
                        });
            });
            currentTest.addLabel('feature', testState.feature.name);
        }
    }

    // Process Cypress screenshots automatically
    processScreenshots() {
        const { screenshots, currentTest, currentSuite } = this;
        const executable = currentTest || currentSuite;
        executable &&
            screenshots.forEach(function (s) {
                executable.addAttachment(
                    `${s.specName}:${s.takenAt}`,
                    ContentType.PNG,
                    Cypress && Cypress.platform === 'win32'
                        ? s.path.split('\\').pop()
                        : path.basename(s.path)
                );
            });
        this.screenshots = [];
    }

    passTestCase(test) {
        if (this.currentTest === null) {
            this.startCase(test);
        }
        this.endTest(Status.PASSED);
    }

    pendingTestCase(test) {
        this.startCase(test);
        this.endTest(Status.SKIPPED, { message: 'Test ignored' });
    }

    failTestCase(test, error) {
        if (this.currentTest === null) {
            this.startCase(test);
        } else {
            const latestStatus = this.currentTest.status;
            // if test already has a failed state, we should not overwrite it
            if (
                latestStatus === Status.FAILED ||
                latestStatus === Status.BROKEN
            ) {
                return;
            }
        }
        this.endTest(Status.FAILED, {
            message: error.message,
            trace: error.stack
        });
        /**
         * in case error comes from hook
         */
        if (test.type === 'hook') {
            this.endHook(test);
        }
    }

    writeAttachment(content, type) {
        return this.runtime.writeAttachment(content, type);
    }

    pushStep(step) {
        this.steps.push(step);
    }

    popStep() {
        return this.steps.pop();
    }

    finishAllSteps(status = Status.PASSED) {
        this.steps.forEach((step) => {
            step.info.stage = Stage.FINISHED;
            step.info.status = status;
            step.endStep();
        });
        this.steps = [];
        if (this.parentStep) {
            this.parentStep.info.stage = Stage.FINISHED;
            this.parentStep.info.status = status;
            this.parentStep.endStep();
        }
    }

    startHook(hook) {
        const parent = this.currentSuite;
        const allureHook = hook.title.includes('before')
            ? parent.addBefore()
            : parent.addAfter();
        this.currentHook = allureHook;
    }

    endHook(hook) {
        if (hook.title.includes('all')) {
            this.currentHook = null;
            return;
        }
        if (hook.err) {
            this.currentHook.info.status = Status.FAILED;
            this.currentHook.info.statusDetails = {
                message: hook.err.message,
                trace: hook.err.stack
            };
        } else {
            this.currentHook.info.stage = Stage.FINISHED;
            this.currentHook.info.status = Status.PASSED;
        }
        this.currentHook = null;
    }

    restartSuite() {
        const { name } = this.currentSuite;
        this.endSuite();
        this.startSuite(name);
    }

    pushSuite(suite) {
        this.suites.push(suite);
    }

    popSuite() {
        this.suites.pop();
    }

    endTest(status, details) {
        if (this.currentTest === null) {
            throw new Error('finishing test while no test is running');
        }
        this.logCypress && this.cyCommandsFinish(status);
        this.finishAllSteps(status);
        this.parentStep = null;

        details && (this.currentTest.statusDetails = details);
        this.currentTest.status = status;
        this.currentTest.stage = Stage.FINISHED;
        this.processScreenshots();
        this.currentTest.endTest();
    }

    cyCommandExecutable(command) {
        if (command.parent) {
            const parent = this.commands.find(
                (c) => c.id === command.parent && c.step && !c.finished
            );

            if (!parent) {
                return this.currentExecutable;
            }

            // such commands contain argument
            // which is basically a function that will be executed
            if (callbacks.includes(parent.name)) {
                return this.cyCommandExecutable(parent);
            }

            // in case latest step in newer then parent - attach to user defined step
            return this.currentStep &&
                this.currentStep.info.start > parent.step.info.start
                ? this.currentStep
                : parent.step;
        }
        return this.currentExecutable;
    }

    cyCommandEnqueue(attributes) {
        // skipped are:
        // assertions, as they don't receive command:start and command:end events and are hardly trackable
        // allure custom command used for interacting with allure api
        // commands, where second argument has {log: false}
        // commands, which are child commands of cy.allure command
        const commandShouldBeSkipped = (attributes) => {
            return (
                attributes.type === 'assertion' ||
                attributes.name === 'allure' ||
                (attributes.args.length &&
                    attributes.args.find((arg) => arg && arg.log === false)) ||
                (Object.getOwnPropertyNames(
                    stubbedAllure.reporter.getInterface()
                ).includes(attributes.name) &&
                    attributes.type === 'child')
            );
        };

        if (commandShouldBeSkipped(attributes)) {
            return;
        }

        // prepare chainer command object with specific information to process it with events
        const command = {
            id: attributes.chainerId,
            name: attributes.name,
            type: attributes.type,
            parent: this.currentChainer && this.currentChainer.chainerId,
            children: [],
            passed: true, // will be set false in case failed or failed child command
            finished: false,
            step: null,
            commandLog: null
        };

        this.commands.push(command);

        // in case command in enqueued while there was active chainer - treat it as parent
        // so this command should be added as child to track if we should finish parent command step
        if (command.parent) {
            const parent = this.commands.find(
                (c) => c.id === command.parent && !c.finished && c.step
            );
            // set new child from start as command queue works as LIFO (last in - first out) approach
            parent.children.unshift(command.id);
        }
    }

    cyCommandStart(attributes) {
        // check if we have enqueued command
        const command = this.commands.find(
            (command) =>
                command.id === attributes.chainerId &&
                command.name === attributes.name &&
                !command.step &&
                !command.finished
        );

        if (!command) {
            return;
        }

        command.commandLog = attributes;

        // add dummy allure step implementation for "then" commands to avoid adding them to report
        // as they mostly expose other plugin internals and other functions not related to test
        // on other hand, if they produce info for command log - step will be created when command end
        if (callbacks.includes(command.name)) {
            command.step = {
                info: {},
                stepResult: {},
                endStep() {}
            };
        } else {
            const executable = this.cyCommandExecutable(command);

            const commandArgs =
                attributes.args.length &&
                attributes.args.map((a) => `"${String(a)}"`).join('; ');

            const step = executable.startStep(
                `${command.name}${commandArgs ? ` (${commandArgs})` : ''}`
            );

            command.step = step;
        }
        this.currentChainer = attributes;
    }

    cyCommandEnd(attributes, failed = false) {
        // check if we have enqueued command
        const command = this.commands.find(
            (command) =>
                command.id === attributes.chainerId &&
                command.name === attributes.name &&
                command.step &&
                !command.finished
        );

        if (!command) {
            return;
        }
        this.currentChainer = null;

        // in case no children enqueued - finish this step
        if (!command.children.length || failed) {
            // check if command has some entries for command log
            if (command.commandLog.logs.length) {
                // set first command log (which refers to current command) as last
                // and process other child logs first (asserts are processed such way)

                command.commandLog.logs.push(command.commandLog.logs.shift());

                command.commandLog.logs.forEach((entry, index) => {
                    const log = entry.toJSON();

                    // for main log (which we set last) we should finish command step
                    if (index === command.commandLog.logs.length - 1) {
                        // in case "then" command has some logging - create step for that
                        if (callbacks.includes(command.name)) {
                            const executable = this.cyCommandExecutable(
                                command
                            );

                            const step = this.cyStartStepForLog(
                                executable,
                                log
                            );

                            command.step = step;

                            if (log.name === 'step') {
                                this.finishAllSteps(
                                    command.passed
                                        ? Status.PASSED
                                        : Status.FAILED
                                );
                                this.steps.push(step);
                                this.parentStep = step;
                            }
                        }

                        const commandPassed = this.cyCommandEndStep(
                            command.step,
                            log,
                            command.passed
                        );

                        !commandPassed && (command.passed = false);
                    } else {
                        // handle case when other logs refer to chained assertions
                        // so steps should be created
                        const executable = this.cyCommandExecutable({
                            id: log.id,
                            parent: command.parent
                        });

                        const step = this.cyStartStepForLog(executable, log);

                        const commandPassed = this.cyCommandEndStep(step, log);

                        !commandPassed && (command.passed = false);
                    }
                });
            } else {
                this.cyCommandEndStep(
                    command.step,
                    {
                        state: command.passed ? 'passed' : 'failed'
                    },
                    command.passed
                );
            }
            command.finished = true;
            !command.passed && (failed = true);
            // notify parent that one of child commands is finished
            // and pass status
            this.cyRemoveChildFromParent(command, failed);
        }
    }

    cyRemoveChildFromParent(child, failed = false) {
        if (child.parent) {
            const parent = this.commands.find(
                (c) => c.id === child.parent && c.step && !c.finished
            );

            // better to skip case when no parent found
            if (!parent) {
                return;
            }

            const childIndex = parent.children.indexOf(child.id);

            // if found child - remove it from parent
            if (childIndex > -1) {
                parent.children.splice(childIndex, 1);
                // update status of parent in case any of children failed
                if (!child.passed || failed) {
                    parent.passed = false;
                }
            }

            // finish parent step when no children left or when test is failed
            if (!parent.children.length || failed) {
                !parent.passed && (failed = true);
                this.cyCommandEnd(parent.commandLog, failed);
            }
        }
    }

    cyCommandsFinish(state = 'failed') {
        // process all not finished steps from chainer left
        // usually is executed on fail
        this.commands
            .filter((c) => !c.finished && c.step)
            .reverse()
            .forEach((command) => {
                !command.finished &&
                    this.cyCommandEnd(command.commandLog, state === 'failed');
            });
        this.currentChainer = null;
    }

    cyCommandEndStep(step, log, commandStatus) {
        let passed =
            commandStatus !== undefined
                ? commandStatus
                : log.state !== 'failed';

        step.info.stage = Stage.FINISHED;

        if (log && log.err) {
            passed = false;
        }

        step.info.status = passed ? Status.PASSED : Status.FAILED;

        log.name !== 'step' && step.endStep();
        return passed;
    }

    cyStartStepForLog(executable, log) {
        // define step name based on cypress log name or messages
        const messages = {
            xhr: () =>
                `${
                    (log.consoleProps.Stubbed === 'Yes' ? 'STUBBED ' : '') +
                    log.consoleProps.Method
                } ${log.consoleProps.URL}`,
            step: () => `${log.displayName}${log.message.replace(/\*/g, '')}`,
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
            executable = this.currentTest;
        }

        return executable.startStep(message());
    }
};
