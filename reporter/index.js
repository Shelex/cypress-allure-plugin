require('./afterHook');
require('./commands');

const {
    EVENT_TEST_BEGIN,
    EVENT_TEST_FAIL,
    EVENT_TEST_PASS,
    EVENT_TEST_PENDING,
    EVENT_SUITE_BEGIN,
    EVENT_SUITE_END,
    EVENT_TEST_END,
    EVENT_HOOK_BEGIN,
    EVENT_HOOK_END
} = Mocha.Runner.constants;

const { AllureRuntime, InMemoryAllureWriter } = require('allure-js-commons');
const AllureReporter = require('./mocha-allure/AllureReporter');

class CypressAllureReporter {
    constructor() {
        this.reporter = new AllureReporter(
            new AllureRuntime({
                resultsDir: 'allure-results',
                writer: new InMemoryAllureWriter()
            })
        );

        Cypress.mocha
            .getRunner()
            .on(EVENT_SUITE_BEGIN, (suite) => {
                this.reporter.startSuite(suite.fullTitle());
            })
            .on(EVENT_SUITE_END, () => {
                this.reporter.endSuite();
            })
            .on(EVENT_TEST_BEGIN, (test) => {
                this.reporter.startCase(test);
            })
            .on(EVENT_TEST_FAIL, (test, err) => {
                this.reporter.failTestCase(test, err);
            })
            .on(EVENT_TEST_PASS, (test) => {
                this.reporter.passTestCase(test);
            })
            .on(EVENT_TEST_PENDING, (test) => {
                this.reporter.pendingTestCase(test);
            })
            .on(EVENT_TEST_END, () => {
                this.reporter.handleCucumberTags();
            })
            .on(EVENT_HOOK_BEGIN, (hook) => {
                this.reporter.startHook(hook);
            })
            .on(EVENT_HOOK_END, (hook) => {
                this.reporter.endHook(hook);
                /**
                 * suite should be restarted
                 * to make `each` level hooks be set for tests separately
                 */
                hook.title === '"after each" hook' &&
                    this.reporter.restartSuite();
            });

        Cypress.on('log:added', (options) => {
            if (options.instrument === 'command' && options.consoleProps) {
                const detailMessage =
                    options.name === 'xhr'
                        ? `${
                              (options.consoleProps.Stubbed === 'Yes'
                                  ? 'STUBBED '
                                  : '') + options.consoleProps.Method
                          } ${options.consoleProps.URL}`
                        : '';
                const isCucumberStep = options.name === 'step';
                const stepInfo =
                    isCucumberStep &&
                    options.consoleProps &&
                    options.consoleProps.feature &&
                    Cypress._.get(options, 'consoleProps.step');
                const cucumberMessage =
                    stepInfo && `${stepInfo.keyword}${stepInfo.text}`;

                const requestMessage =
                    options.name === 'request' && options.renderProps.message;
                this.reporter
                    .getInterface()
                    .step(
                        requestMessage ||
                            cucumberMessage ||
                            `${options.name} ${options.message} ${
                                detailMessage || ''
                            }`,
                        isCucumberStep
                    );
            }
        });
    }
}

Cypress.Allure = new CypressAllureReporter();

Cypress.Screenshot.defaults({
    onAfterScreenshot(el, details) {
        Cypress.Allure.reporter.screenshots.push(details);
    }
});
