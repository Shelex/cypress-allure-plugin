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

const path = require('path');
const {
    AllureRuntime,
    InMemoryAllureWriter,
    ContentType
} = require('allure-js-commons');
const AllureReporter = require('./mocha-allure/AllureReporter');
const stubbedAllure = require('./stubbedAllure');
const allureEnabled = Cypress.env('allure') === true;
const shouldLogCypress = Cypress.env('allureLogCypress') !== false;
const allureDebug = Cypress.env('allureDebug') === true;

class CypressAllureReporter {
    constructor() {
        this.reporter = new AllureReporter(
            new AllureRuntime({
                resultsDir:
                    Cypress.env('allureResultsPath') || 'allure-results',
                writer: new InMemoryAllureWriter()
            }),
            {
                logCypress: shouldLogCypress
            }
        );

        Cypress.mocha
            .getRunner()
            .on(EVENT_SUITE_BEGIN, (suite) => {
                this.reporter.startSuite(suite.fullTitle());
            })
            .on(EVENT_SUITE_END, (suite) => {
                /**
                 * only global cypress file suite end
                 * should be triggered from here
                 * others are handled on suite start event
                 */
                const isGlobal = suite.title === '';
                this.reporter.endSuite(isGlobal);
                allureEnabled &&
                    isGlobal &&
                    cy
                        .now(
                            'task',
                            'writeAllureResults',
                            this.reporter.runtime.config,
                            { log: false }
                        )
                        .catch((e) => allureDebug && console.error(e));
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
                this.reporter.endTest();
            })
            .on(EVENT_HOOK_BEGIN, (hook) => {
                this.reporter.startHook(hook);
            })
            .on(EVENT_HOOK_END, (hook) => {
                this.reporter.endHook(hook);
            });

        Cypress.on('command:enqueued', (command) => {
            shouldLogCypress && this.reporter.cyCommandEnqueue(command);
        });

        Cypress.on('command:start', (command) => {
            shouldLogCypress &&
                this.reporter.cyCommandStart(command.attributes);
        });

        Cypress.on('command:end', (command) => {
            shouldLogCypress && this.reporter.cyCommandEnd(command.attributes);
        });

        Cypress.on('fail', (err) => {
            shouldLogCypress && this.reporter.cyCommandsFinish();
            // add video to failed test case:
            if (Cypress.config().video && this.reporter.currentTest) {
                this.reporter.currentTest.addAttachment(
                    `${Cypress.spec.name}.mp4`,
                    'video/mp4',
                    path.join(
                        Cypress.config().videosFolder,
                        `${Cypress.spec.name}.mp4`
                    )
                );
            }
            throw err;
        });
    }
}

Cypress.Allure = allureEnabled ? new CypressAllureReporter() : stubbedAllure;

Cypress.Screenshot.defaults({
    onAfterScreenshot(_, details) {
        if (allureEnabled) {
            cy.task('copyFileToAllure', details.path, { log: false }).then(
                (filePath) => {
                    filePath &&
                        Cypress.Allure.reporter.currentTest.addAttachment(
                            details.name ||
                                `${details.specName}:${details.takenAt}`,
                            ContentType.PNG,
                            filePath
                        );
                }
            );
        }
    }
});
