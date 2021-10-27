/**
 * A lot of credit to Sergey Korol <serhii.s.korol@gmail.com> who made
 * Allure-mocha reporter: "https://github.com/allure-framework/allure-js/tree/master/packages/allure-mocha"
 */

const {
    LabelName,
    Stage,
    Status
} = require('@shelex/allure-js-commons-browser');
const crypto = require('crypto-js');
const AllureInterface = require('./AllureInterface');
const { tagToLabel, tagToLink, exampleNumber } = require('../gherkinToLabel');
const { languageLabel } = require('../languageLabel');
const stubbedAllure = require('../stubbedAllure');
const logger = require('../debug');
const callbacks = ['then', 'spread', 'each', 'within'];

module.exports = class AllureReporter {
    constructor(runtime, options) {
        this.suites = [];
        this.steps = [];
        this.commands = [];
        this.files = [];
        this.labelStorage = [];
        this.gherkinExamplesStorage = [];
        this.currentChainer = null;
        this.runningTest = null;
        this.previousTestName = null;
        this.runtime = runtime;
        this.currentHook = null;
        this.parentStep = null;
        this.logCypress = options.logCypress || false;
        this.logGherkinSteps = options.logGherkinSteps || false;
        this.attachRequests = options.attachRequests || false;
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

    get currentSuiteIsGlobal() {
        return (
            this.currentSuite &&
            this.currentSuite.testResultContainer.name === 'Global'
        );
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
        if (this.runningTest) {
            this.previousTestName = this.runningTest.info.name;
        }
        this.runningTest = test;
        // in case labels were defined outside of test
        // we could attach them from storage
        if (this.runningTest) {
            this.runningTest.info.labels.push(...this.labelStorage);
        }
    }

    get testNameForAttachment() {
        const cyTest = cy.state().test;
        return (
            (cyTest && cyTest.title) ||
            (this.currentTest && this.currentTest.info.name) ||
            this.previousTestName
        );
    }

    originalNameOf(hook) {
        return hook.hookName || hook.originalTitle || hook.title;
    }

    startSuite(suiteName) {
        if (this.currentSuite) {
            if (this.currentSuiteIsGlobal) {
                /**
                 * cypress creates suite for spec file
                 * where global hooks and other nested suites are held
                 * in order to have global hooks available
                 * this global suite can just be renamed
                 * to the first user's suite
                 */
                this.currentSuite.testResultContainer.name = suiteName;
                return;
            } else {
                /**
                 * but if previous suite is not global
                 * it should be finished, and new one created
                 */
                logger.allure(`finish previous suite %O`, this.currentSuite);
                this.endSuite(true);
            }
        }
        const scope = this.currentSuite || this.runtime;
        const suite = scope.startGroup(suiteName || 'Global');
        logger.allure(`start suite %O`, suite);
        this.pushSuite(suite);
    }

    endSuite(isGlobal = false) {
        if (this.currentSuite && isGlobal) {
            this.cyCommandsFinish(Status.PASSED);
            logger.allure(`finished cypress commands`);
            this.finishAllSteps(Status.PASSED);
            logger.allure(`finished steps`);
            this.currentStep !== null && this.currentStep.endStep();
            this.currentTest &&
                this.currentTest.testResult.stage !== Stage.FINISHED &&
                this.endTest();
            this.currentSuite.endGroup();
            this.popSuite();
            logger.allure(`finished suite`);
        }
        // restrict label storage to single suite scope
        this.labelStorage = [];
    }

    startCase(test, config) {
        logger.allure(`starting case %s %O`, test.title, test);
        if (this.currentSuite === null) {
            logger.allure(`no active suite available`);
            throw new Error('No active suite');
        }

        /**
         * skipped test sometimes initially receives pending event
         * where test will be created
         * and then comes start test event followed by end test
         * so start for skipped test should be omitted
         * when current test is already skipped with same name
         */
        if (
            this.currentTest &&
            this.currentTest.info.status === 'skipped' &&
            this.currentTest.info.name === test.title
        ) {
            logger.allure(`skipped test already exists`);
            return;
        }

        this.commands = [];
        this.currentTest = this.currentSuite.startTest(test.title);
        this.currentTest.fullName = test.title;
        this.currentTest.historyId = crypto
            .MD5(test.fullTitle())
            .toString(crypto.enc.Hex);
        this.currentTest.stage = Stage.RUNNING;

        if (
            config &&
            config.clearFilesForPreviousAttempt() &&
            test._currentRetry > 0
        ) {
            logger.allure(`clearing screenshots from previous retries`);
            // remove screenshots from previous attempt
            this.files = this.files.filter(
                (file) => file.testName !== test.title
            );
        }

        if (config && config.addAnalyticLabels()) {
            logger.allure(`adding analytic labels`);
            this.currentTest.addLabel(LabelName.FRAMEWORK, 'Cypress');
            const language = languageLabel(test);
            language && this.currentTest.addLabel(LabelName.LANGUAGE, language);
        }

        if (test.parent) {
            const titlePath = test.parent.titlePath();
            // should add suite label for test if it has parent
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

    populateGherkinLinksFromExampleTable() {
        if (globalThis && globalThis.testState) {
            const { testState } = globalThis;

            if (testState.currentScenario.keyword === 'Scenario Outline') {
                logger.allure(`populating gherkin links from examples table`);
                const scenario = testState.currentScenario;

                !this.gherkinExamplesStorage.length &&
                    this.gherkinExamplesStorage.push(...scenario.examples);

                const example =
                    this.gherkinExamplesStorage.length &&
                    this.gherkinExamplesStorage.pop();

                if (example) {
                    const findCellIndex = (type) =>
                        example.tableHeader.cells.findIndex(
                            (cell) => cell.value === type
                        );

                    const tmsCellIndex = findCellIndex('tms');
                    const issueCellIndex = findCellIndex('issue');

                    const exampleRowNumber = parseInt(
                        exampleNumber.exec(scenario.name).pop()
                    );

                    if (!exampleRowNumber) {
                        return;
                    }

                    const exampleRowIndex = exampleRowNumber - 1;

                    const findTableCellValue = (headerIndex) =>
                        example.tableBody[exampleRowIndex].cells[headerIndex]
                            .value;

                    const addScenarioTag = (type, value) => {
                        const current =
                            globalThis.testState.runScenarios[scenario.name];

                        globalThis.testState.runScenarios[scenario.name].tags =
                            [
                                ...current.tags,
                                {
                                    type: 'Tag',
                                    name: `@${type}("${value}")`
                                }
                            ];
                    };

                    if (tmsCellIndex !== -1) {
                        const tmsId = findTableCellValue(tmsCellIndex);
                        logger.allure(`found tms link: %s`, issueId);
                        addScenarioTag('tms', tmsId);
                    }

                    if (issueCellIndex !== -1) {
                        const issueId = findTableCellValue(issueCellIndex);
                        logger.allure(`found issue link: %s`, issueId);
                        addScenarioTag('issue', issueId);
                    }
                }
            }
        }
    }

    // accept cucumber tags from cypress-cucumber-preprocessor as commands
    handleCucumberTags() {
        if (globalThis && globalThis.testState) {
            logger.allure(`parsing gherkin tags`);
            const { testState } = globalThis;
            const { currentTest } = this;

            // set bdd feature by default
            currentTest.addLabel('feature', testState.feature.name);

            /**
             * tags set on test level has higher priority
             * to not be overwritten by feature tags
             */
            ['feature', 'currentScenario'].forEach(function (type) {
                logger.allure(`tags for %s`, type);
                testState[type] &&
                    testState[type].tags
                        // check for labels
                        .filter(function ({ name }) {
                            const match = tagToLabel.exec(name);
                            if (match) {
                                const [, command, value] = match;
                                // feature and suite should be overwritten to avoid duplicates
                                if (['feature', 'suite'].includes(command)) {
                                    const index =
                                        currentTest.info.labels.findIndex(
                                            (label) => label.name === command
                                        );
                                    currentTest.info.labels[index] = {
                                        name: command,
                                        value: value
                                    };
                                } else {
                                    currentTest.addLabel(command, value);
                                }
                            }
                            return !match;
                        })
                        // check for links
                        .filter(function ({ name }) {
                            const match = tagToLink.exec(name);
                            if (match) {
                                const [, command, name, matchUrl] = match;

                                const url = matchUrl || name;

                                const prefixBy = {
                                    issue: Cypress.env('issuePrefix'),
                                    tms: Cypress.env('tmsPrefix'),
                                    link: null
                                };
                                const urlPrefix = prefixBy[command];

                                const pattern =
                                    urlPrefix && urlPrefix.includes('*')
                                        ? urlPrefix
                                        : `${urlPrefix}*`;
                                currentTest.addLink(
                                    urlPrefix && pattern
                                        ? pattern.replace(/\*/g, url)
                                        : url,
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
        }
    }

    passTestCase(test) {
        if (this.currentTest === null) {
            logger.allure(`not found allure test, created new`);
            this.startCase(test);
        }
        this.updateTest(Status.PASSED);
        logger.allure(`set passed for test: %s %O`, test.title, test);
    }

    pendingTestCase(test) {
        this.startCase(test);
        this.updateTest(Status.SKIPPED, { message: 'Test ignored' });
        logger.allure(
            `created new test and set to pending: %s %O`,
            test.title,
            test
        );
    }

    failTestCase(test, error) {
        logger.allure(
            `received test failed event: %s, %O, %O`,
            test.title,
            test,
            error
        );
        if (this.currentTest === null) {
            logger.allure(`not found test, created new`);
            this.startCase(test);
        }

        this.updateTest(Status.FAILED, {
            message: error.message,
            trace: error.stack
        });
        /**
         * in case error comes from hook
         */
        if (test.type === 'hook') {
            logger.allure(`test error origin is hook`);
            this.endHook(test, true);
            /**
             * in case of before all cypress creates new test
             * which not produce any mocha events
             * as result should be finished manually
             */

            if (
                test.hookName &&
                ['before all', 'before each'].includes(test.hookName)
            ) {
                logger.allure(
                    `finishing test as no events received for failed test in before all hook`
                );

                // mark failed tests as broken due to before all hook failure
                if (test.parent && test.parent.tests) {
                    test.parent.tests.forEach((test, index) => {
                        logger.allure(
                            `found cancelled test due to before all hook: %O`,
                            test
                        );
                        if (index === 0) {
                            this.currentTest.info.name = test.title;
                        } else {
                            this.startCase(test);
                        }
                        this.updateTest(Status.BROKEN, {
                            message: error.message,
                            trace: error.stack
                        });
                        this.endTest();
                    });
                } else {
                    this.endTest();
                }
            }
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
            if (step.info.steps.length) {
                step.info.status = step.info.steps.some(
                    (step) => step.status === Status.FAILED
                )
                    ? Status.FAILED
                    : Status.PASSED;
            } else {
                step.info.status = status;
            }
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
        logger.allure(`starting hook %s`, hook.title);
        if (!this.currentSuite || isEmpty(hook)) {
            logger.allure(`no suite or hook is empty function`);
            return;
        }
        /**
         * When hook is global - it is attached to suite
         * and will be displayed as precondition
         * `each` hooks will be available as test steps
         */
        if (this.originalNameOf(hook).includes('all')) {
            const parent = this.currentSuite;
            const allureHook = this.originalNameOf(hook).includes('before')
                ? parent.addBefore()
                : parent.addAfter();
            this.currentHook = allureHook;
        } else {
            if (!this.logCypress) {
                return;
            }
            const customHookName = hook.title.replace(
                /\"(before|after) each\" hook:? */g,
                ''
            );

            const step = this.currentTest.startStep(
                customHookName || hook.title
            );
            this.currentHook = step;
        }
    }

    endHook(hook, failed = false) {
        logger.allure(`finishing hook %s`, hook.title);
        if (!this.currentSuite || !this.currentHook || isEmpty(hook)) {
            logger.allure(`no suite or no hook or hook is empty function`);
            return;
        }
        // should define results property for all or each hook
        const currentHookInfo = this.originalNameOf(hook).includes('all')
            ? this.currentHook.info
            : this.currentHook.stepResult;

        if (hook.err) {
            currentHookInfo.status = Status.FAILED;
            currentHookInfo.stage = Stage.FINISHED;
            currentHookInfo.statusDetails = {
                message: hook.err.message,
                trace: hook.err.stack
            };
        } else {
            currentHookInfo.status = Status.PASSED;
            currentHookInfo.stage = Stage.FINISHED;
        }

        // in case hook is a step we should complete it
        if (this.originalNameOf(hook).includes('each')) {
            this.currentHook && this.currentHook.endStep();
        }
        !failed && (this.currentHook = null);
    }

    pushSuite(suite) {
        this.suites.push(suite);
    }

    popSuite() {
        this.suites.pop();
    }

    updateTest(status, details) {
        if (this.currentTest === null) {
            throw new Error('finishing test while no test is running');
        }
        (this.logCypress || this.logGherkinSteps) &&
            this.cyCommandsFinish(status);
        this.finishAllSteps(status);
        this.parentStep = null;

        logger.allure(
            `updating test %O to have status:%s and details: %O`,
            this.currentTest,
            status,
            details
        );

        details && (this.currentTest.statusDetails = details);
        this.currentTest.status = status;
        this.currentTest.stage = Stage.FINISHED;
        this.currentTest.testResult.stop = Date.now();
    }

    endTest() {
        logger.allure(`finishing current test`);
        this.currentTest && this.currentTest.endTest();
    }

    cyCommandShouldBeLogged(attributes) {
        // handle case when nothing should be logged
        if (!this.logCypress && !this.logGherkinSteps) {
            logger.cy(`logging cy commands is disabled`);
            return false;
        }

        // handle case when should log gherkin steps but not cy commands
        if (
            this.logGherkinSteps &&
            !this.logCypress &&
            !attributeIsGherkinStep(attributes)
        ) {
            logger.cy(`is not a gherkin step`);
            return false;
        }
        return true;
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
        logger.cy(`cyCommandEnqueue: %s %O`, attributes.name, attributes);
        // skipped are:
        // assertions, as they don't receive command:start and command:end events and are hardly trackable
        // allure custom command used for interacting with allure api
        // commands, where second argument has {log: false}
        // commands, which are child commands of cy.allure command
        const commandShouldBeSkipped = (attributes) => {
            return (
                attributes.type === 'assertion' ||
                attributes.name === 'allure' ||
                (Object.getOwnPropertyNames(
                    stubbedAllure.reporter.getInterface()
                ).includes(attributes.name) &&
                    attributes.type === 'child') ||
                (attributes.args &&
                    attributes.args.length &&
                    attributes.args.find((arg) => arg && arg.log === false))
            );
        };

        if (commandShouldBeSkipped(attributes)) {
            logger.cy(`command should be skipped`);
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
        logger.cy(`tracking command: %O`, command);

        // in case command in enqueued while there was active chainer - treat it as parent
        // so this command should be added as child to track if we should finish parent command step
        if (command.parent) {
            const parent = this.commands.find(
                (c) => c.id === command.parent && !c.finished && c.step
            );
            // set new child from start as command queue works as LIFO (last in - first out) approach
            parent && parent.children.unshift(command.id);
            logger.cy(`added as child of command: %O`, parent);
        }
    }

    cyCommandStart(attributes) {
        logger.cy(`cyCommandStart: %s %O`, attributes.name, attributes);
        // check if we have enqueued command
        const command = this.commands.find(
            (command) =>
                command.id === attributes.chainerId &&
                command.name === attributes.name &&
                !command.step &&
                !command.finished
        );

        if (!command) {
            logger.cy(`command not available`);
            return;
        }

        logger.cy(`tracked info about command: %O`, command);

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

            const displayArg = (arg) => {
                logger.cy(`checking argument %O and provide to step`, arg);
                if (typeof arg === 'function') {
                    return '[function]';
                }
                if (typeof arg === 'object') {
                    if (
                        arg &&
                        arg.constructor &&
                        arg.constructor.toString &&
                        typeof arg.constructor.toString === 'function' &&
                        ((arg.constructor.toString().includes('HTML') &&
                            arg.constructor.toString().includes('Element')) ||
                            arg.constructor
                                .toString()
                                .includes('The jQuery object'))
                    ) {
                        return '[Object]';
                    }

                    return JSON.stringify(arg, getCircularReplacer(), 2);
                }

                return arg;
            };

            const commandArgs =
                attributes.args.length &&
                attributes.args.map((arg) => `"${displayArg(arg)}"`).join('; ');

            const step =
                this.cyCommandShouldBeLogged(attributes) &&
                executable.startStep(
                    `${command.name}${commandArgs ? ` (${commandArgs})` : ''}`
                );

            if (step) {
                logger.cy(`started allure step %s %O`, step.info.name, step);

                command.step = step;
            }
        }
        this.currentChainer = attributes;
    }

    cyCommandEnd(attributes, failed = false) {
        logger.cy(`cyCommandEnd: %s %O`, attributes.name, attributes);
        // check if we have enqueued command
        const command = this.commands.find(
            (command) =>
                command.id === attributes.chainerId &&
                command.name === attributes.name &&
                command.step &&
                !command.finished
        );

        if (!command) {
            logger.cy(`command not available`);
            return;
        }

        logger.cy(`tracked info about command: %O`, command);
        this.currentChainer = null;

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

                command.commandLog.logs.push(command.commandLog.logs.shift());

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
                                this.cyCommandExecutable(command);

                            if (
                                !this.logGherkinSteps &&
                                attributeIsGherkinStep(attributes)
                            ) {
                                return;
                            }

                            const step = this.cyStartStepForLog(
                                executable,
                                log
                            );
                            logger.cy(`creating step for then's %O`, step);

                            command.step = step;

                            if (log.name === 'step') {
                                logger.cy(
                                    `found gherkin step, finishing all current steps`
                                );
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
                        logger.cy(
                            `attaching command log entries as allure steps %O`,
                            step
                        );

                        const commandPassed = this.cyCommandEndStep(step, log);

                        !commandPassed && (command.passed = false);
                    }
                });
            } else {
                logger.cy(
                    `no command log entries, finish step %O`,
                    command.step
                );
                this.cyCommandEndStep(
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
                this.cyCommandEnd(parent.commandLog, failed);
            }
        }
    }

    cyCommandsFinish(state = Status.FAILED) {
        // process all not finished steps from chainer left
        // usually is executed on fail
        this.commands
            .filter((c) => !c.finished && c.step)
            .reverse()
            .forEach((command) => {
                !command.finished &&
                    this.cyCommandEnd(
                        command.commandLog,
                        state === Status.FAILED
                    );
            });
        this.currentChainer = null;
    }

    cyCommandEndStep(step, log, commandStatus) {
        if (
            // check for requests
            log.name === 'request' ||
            // or for then commands which have requests being logged in command log
            (log.name === 'then' &&
                log.consoleProps &&
                log.consoleProps.Request)
        ) {
            if (log.renderProps && log.renderProps.message) {
                step.info.name = log.renderProps.message;
            }

            if (this.attachRequests && log.consoleProps) {
                const request =
                    log.consoleProps.Request ||
                    Cypress._.last(log.consoleProps.Requests);
                const response = log.consoleProps.Yielded;

                const attach = (step, name, content) => {
                    if (!content) {
                        return;
                    }

                    let jsonContent;

                    try {
                        jsonContent =
                            typeof content === 'string'
                                ? JSON.parse(content)
                                : content;
                    } catch (e) {
                        // content is not json
                    }

                    const fileType = jsonContent
                        ? 'application/json'
                        : 'text/plain';
                    const fileName = this.writeAttachment(
                        jsonContent
                            ? JSON.stringify(jsonContent, null, 2)
                            : content,
                        fileType
                    );
                    step.addAttachment(name, fileType, fileName);
                };

                if (request) {
                    attach(step, 'requestHeaders', request['Request Headers']);
                    attach(step, 'request', request['Request Body']);
                }
                if (response) {
                    attach(step, 'responseHeaders', response.headers);
                    attach(step, 'response', response.body);
                }
            }
        }

        const logNameNoOverride = ['request', 'step'];
        if (
            step &&
            step.info &&
            step.info.name &&
            log.name &&
            log.message &&
            !logNameNoOverride.includes(log.name)
        ) {
            step.info.name = `${log.name} ${log.message}`;
            logger.cy(`changing step name to "%s" %O`, step.info.name, step);
        }

        const passed =
            log && log.err
                ? false
                : commandStatus || log.state !== Status.FAILED;

        step.info.stage = Stage.FINISHED;

        step.info.status = passed ? Status.PASSED : Status.FAILED;

        log.name !== 'step' && step.endStep();
        return passed;
    }

    cyStartStepForLog(executable, log) {
        logger.cy(`creating step for command log entry %O`, log);
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

        const newStep = executable.startStep(message());

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
                typeof value === 'object'
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
};

const attributeIsGherkinStep = (attribute) =>
    attribute.args &&
    attribute.args.length === 1 &&
    attribute.args[0] &&
    typeof attribute.args[0] === 'function' &&
    attribute.args[0].toString &&
    attribute.args[0].toString().includes('state.onStartStep');

const isEmpty = (hook) => hook && hook.body === 'function () {}';

const getCircularReplacer = () => {
    const seen = new WeakSet();
    return (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return;
            }
            seen.add(value);
        }
        return value;
    };
};
