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

const env = Cypress.env();

const config = {
    allureEnabled: env.allure,
    resultsPath: env.allureResultsPath || 'allure-results',
    shouldLogCypress: env.allureLogCypress !== false,
    allureDebug: env.allureDebug,
    clearFilesForPreviousAttempt: env.allureOmitPreviousAttemptScreenshots,
    addAnalyticLabels: env.allureAddAnalyticLabels
};
class CypressAllureReporter {
    constructor() {
        this.reporter = new AllureReporter(
            new AllureRuntime({
                resultsDir: config.resultsPath,
                writer: new InMemoryAllureWriter()
            }),
            {
                logCypress: config.shouldLogCypress
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

                try {
                    config &&
                        config.allureEnabled &&
                        isGlobal &&
                        cy
                            .now(
                                'task',
                                'writeAllureResults',
                                {
                                    results: this.reporter.runtime.config,
                                    files: this.reporter.files
                                },
                                { log: false }
                            )
                            // eslint-disable-next-line no-console
                            .catch((e) => config.allureDebug && console.log(e));
                } catch (e) {
                    // happens when cy.task could not be executed due to fired outside of it
                }
            })
            .on(EVENT_TEST_BEGIN, (test) => {
                this.reporter.startCase(test, config);
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
            config.shouldLogCypress && this.reporter.cyCommandEnqueue(command);
        });

        Cypress.on('command:start', (command) => {
            config.shouldLogCypress &&
                this.reporter.cyCommandStart(command.attributes);
        });

        Cypress.on('command:end', (command) => {
            config.shouldLogCypress &&
                this.reporter.cyCommandEnd(command.attributes);
        });

        Cypress.on('fail', (err) => {
            config.shouldLogCypress && this.reporter.cyCommandsFinish();
            // add video to failed test case:
            if (Cypress.config().video && this.reporter.currentTest) {
                const videosFolderForAllure = Cypress.config()
                    .videosFolder.split(config.resultsPath)
                    .pop();
                const fileName = `${Cypress.spec.name}.mp4`;

                this.reporter.currentTest.addAttachment(
                    fileName,
                    'video/mp4',
                    path.join(videosFolderForAllure, fileName)
                );
            }
            throw err;
        });
    }
}

Cypress.Allure = config.allureEnabled
    ? new CypressAllureReporter()
    : stubbedAllure;

Cypress.Screenshot.defaults({
    onAfterScreenshot(_, details) {
        if (config.allureEnabled) {
            Cypress.Allure.reporter.files.push({
                name: details.name || `${details.specName}:${details.takenAt}`,
                path: details.path,
                type: ContentType.PNG,
                testName: Cypress.Allure.reporter.testNameForAttachment
            });
        }
    }
});
