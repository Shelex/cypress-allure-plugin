require('./afterHook');
require('./commands');

const {
    EVENT_TEST_BEGIN,
    EVENT_TEST_FAIL,
    EVENT_TEST_PASS,
    EVENT_TEST_PENDING,
    EVENT_SUITE_BEGIN,
    EVENT_SUITE_END
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
            });

        Cypress.on('log:added', (options) => {
            if (
                options.instrument === 'command' &&
                options.consoleProps &&
                options.hookName === 'test'
            ) {
                const detailMessage =
                    options.name === 'xhr'
                        ? `${(options.consoleProps.Stubbed === 'Yes'
                              ? 'STUBBED '
                              : '') + options.consoleProps.Method} ${
                              options.consoleProps.URL
                          }`
                        : '';
                this.reporter
                    .getInterface()
                    .logStep(
                        `${options.name} ${options.message} ${detailMessage ||
                            ''}`
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
