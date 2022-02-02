const {
    LabelName,
    Stage,
    Status
} = require('@shelex/allure-js-commons-browser');
const crypto = require('crypto-js');
const AllureInterface = require('./AllureInterface');
const { languageLabel } = require('../languageLabel');
const logger = require('../debug');
const CypressHandler = require('./CypressHandler');
const CucumberHandler = require('./CucumberHandler');
const defineSuites = require('../defineSuites');

module.exports = class AllureReporter {
    constructor(runtime, options) {
        this.suites = [];
        this.steps = [];
        this.files = [];
        this.mochaIdToAllure = {};
        this.labelStorage = [];
        this.runningTest = null;
        this.previousTestName = null;
        this.runtime = runtime;
        this.currentHook = null;
        this.parentStep = null;
        this.cy = new CypressHandler(this);
        this.gherkin = new CucumberHandler(this);
        this.config = options;
    }

    /**
     * @returns {AllureInterface}
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

    startSuite(suite) {
        const suiteName = suite.fullTitle();
        if (this.currentSuite) {
            if (
                this.currentSuiteIsGlobal ||
                (suite.parent &&
                    this.currentSuite.testResultContainer &&
                    suite.parent.title ===
                        this.currentSuite.testResultContainer.name)
            ) {
                /**
                 * cypress creates suite for spec file
                 * where global hooks and other nested suites are held
                 * in order to have global hooks available
                 * this global suite can just be renamed
                 * to the first user's suite.
                 * second condition is when nested mocha suites are used
                 * so no need to end parent suite but just reuse
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
        const allureSuite = scope.startGroup(suiteName || 'Global');
        logger.allure(`start suite %O`, allureSuite);
        this.pushSuite(allureSuite);
    }

    endSuite(isGlobal = false) {
        if (this.currentSuite && isGlobal) {
            this.cy.handleRemainingCommands(Status.PASSED);
            logger.allure(`finished cypress commands`);
            this.finishRemainingSteps();
            logger.allure(`finished steps`);
            this.currentStep !== null && this.currentStep.endStep();
            this.currentTest &&
                this.currentTest.testResult.stage !== Stage.FINISHED &&
                this.endTest();
            this.currentSuite.endGroup();
            this.popSuite();
            logger.allure(`finished suite`);
            this.currentTest = null;
        }

        // restrict label storage to single suite scope
        // try to reapply labels from storage
        // as beforeEach\afterEach hooks for skipped tests are not executed
        // and handle labels provided in afterEach
        this.runtime.config.writer.tests.forEach((test) =>
            this.labelStorage.forEach((label) =>
                // in case label is missing - it will be applied to test
                // but not overwrite it
                applyLabel(test, label, false)
            )
        );
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

        this.cy.chain.clear();
        this.currentTest = this.currentSuite.startTest(test.title);
        logger.allure(`created test: %O`, this.currentTest);
        this.mochaIdToAllure[test.id] = this.currentTest.uuid;
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
            defineSuites(titlePath).forEach((label) =>
                this.currentTest.addLabel(label.name, label.value)
            );
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

                if (!test.parent && !test.parent.tests) {
                    return this.endTest();
                }

                // mark remaining tests as broken due to before all hook failure
                test.parent.tests.forEach((test, index) => {
                    logger.allure(
                        `found cancelled test due to before all hook: %O`,
                        test
                    );
                    index === 0
                        ? (this.currentTest.info.name = test.title)
                        : this.startCase(test);
                    this.updateTest(Status.BROKEN, {
                        message: error.message,
                        trace: error.stack
                    });
                    this.endTest();
                });
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

    finishRemainingSteps(status = Status.PASSED) {
        const alreadyHasFailedStep =
            this.currentTest &&
            this.currentTest.info &&
            this.currentTest.info.steps.some(
                (step) => step.status === Status.FAILED
            );

        this.steps.forEach((step) => {
            step.info.stage = Stage.FINISHED;

            if (!alreadyHasFailedStep) {
                if (step.info.steps.length) {
                    step.info.status = step.info.steps.some(
                        (step) => step.status === Status.FAILED
                    )
                        ? Status.FAILED
                        : Status.PASSED;
                } else {
                    step.info.status = status;
                }
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
            if (!this.config.shouldLogCypress()) {
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
        this.finishRemainingSteps(currentHookInfo.status);
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

        // in case labels were defined outside of test
        // we could attach them from storage
        if (this.currentTest) {
            this.labelStorage.forEach((label) =>
                applyLabel(this.currentTest.info, label)
            );
        }

        (this.config.shouldLogCypress() ||
            this.config.shouldLogGherkinSteps()) &&
            this.cy.handleRemainingCommands(status);
        this.finishRemainingSteps(status);
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
};

const isEmpty = (hook) => hook && hook.body === 'function () {}';

const applyLabel = (test, label, shouldOverride = true) => {
    const indexOfExisting = test.labels.findIndex(
        (existingLabel) => existingLabel.name === label.name
    );
    indexOfExisting === -1
        ? test.labels.push(label)
        : shouldOverride && (test.labels[indexOfExisting].value = label.value);
};
