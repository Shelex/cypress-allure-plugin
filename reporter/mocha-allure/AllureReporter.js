/**
 * A lot of credit to Sergey Korol <serhii.s.korol@gmail.com> who made
 * Allure-mocha reporter: "https://github.com/allure-framework/allure-js/tree/master/packages/allure-mocha"
 */

const { LabelName, Stage, Status } = require('allure-js-commons');
const { createHash } = require('crypto');
const AllureInterface = require('./AllureInterface');
const { tagToLabel, tagToLink } = require('../gherkinToLabel');

module.exports = class AllureReporter {
    constructor(runtime) {
        this.suites = [];
        this.steps = [];
        this.screenshots = [];
        this.runningTest = null;
        this.runtime = runtime;
        this.currentHook = null;
        this.parentStep = null;
    }

    /**
     * @returns {Allure}
     */
    getInterface() {
        return new AllureInterface(this, this.runtime);
    }

    get currentExecutable() {
        return this.currentSuite || this.currentTest;
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

        this.currentTest = this.currentSuite.startTest(test.title);
        this.currentTest.fullName = test.title;
        this.currentTest.historyId = createHash('md5')
            .update(test.fullTitle())
            .digest('hex');
        this.currentTest.stage = Stage.RUNNING;

        if (test.parent) {
            const [parentSuite, suite, ...subSuites] = test.parent.titlePath();
            if (parentSuite) {
                this.currentTest.addLabel(LabelName.PARENT_SUITE, parentSuite);
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
        this.steps.pop();
    }

    finishAllSteps(status = Status.PASSED) {
        const stepsCount = this.steps.length;
        this.steps.forEach((step, i) => {
            step.stepResult.stage = Stage.FINISHED;
            step.stepResult.status =
                i === stepsCount - 1 ? status : Status.PASSED;
            step.endStep();
        });
        this.steps = [];
        if (this.parentStep) {
            this.parentStep.stepResult.stage = Stage.FINISHED;
            this.parentStep.stepResult.status = status;
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
            throw new Error('endTest while no test is running');
        }
        this.finishAllSteps(status);
        this.parentStep = null;

        details && (this.currentTest.statusDetails = details);
        this.currentTest.status = status;
        this.currentTest.stage = Stage.FINISHED;
        this.currentTest.endTest();
    }
};
