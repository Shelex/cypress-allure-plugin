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
} = require('@shelex/allure-js-commons-browser');
const AllureReporter = require('./mocha-allure/AllureReporter');
const stubbedAllure = require('./stubbedAllure');

const { env } = Cypress;

const shouldEnableGherkinLogging = () => {
    const logCypress = env().allureLogCypress;
    const logGherkin = env().allureLogGherkin;

    const isLogCypressDefined = typeof (logCypress !== 'undefined');
    const isLogGherkinDefined = typeof (logGherkin !== 'undefined');

    // enable by default
    if (!isLogCypressDefined && !isLogGherkinDefined) {
        return true;
    }

    // inherit logCypress in case directly set
    if (isLogCypressDefined && !isLogGherkinDefined) {
        return logCypress !== false;
    }

    // use env var
    return logGherkin !== false;
};

const config = {
    allureEnabled: () => env().allure,
    resultsPath: () => env().allureResultsPath || 'allure-results',
    shouldLogCypress: () => env().allureLogCypress !== false,
    shouldAttachRequests: () => env().allureAttachRequests,
    shouldLogGherkinSteps: () => shouldEnableGherkinLogging(),
    allureDebug: () => env().allureDebug,
    clearFilesForPreviousAttempt: () =>
        env().allureOmitPreviousAttemptScreenshots,
    clearSkipped: () => env().allureClearSkippedTests === true,
    addAnalyticLabels: () => env().allureAddAnalyticLabels,
    addVideoOnPass: () => env().allureAddVideoOnPass
};

const shouldListenToCyCommandEvents = () =>
    config.shouldLogCypress() || config.shouldLogGherkinSteps();

class CypressAllureReporter {
    constructor() {
        this.reporter = new AllureReporter(
            new AllureRuntime({
                resultsDir: config.resultsPath(),
                writer: new InMemoryAllureWriter()
            }),
            {
                logCypress: config.shouldLogCypress(),
                logGherkinSteps: config.shouldLogGherkinSteps(),
                attachRequests: config.shouldAttachRequests()
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
                        config.allureEnabled() &&
                        isGlobal &&
                        cy
                            .now(
                                'task',
                                'writeAllureResults',
                                {
                                    results: this.reporter.runtime.config,
                                    files: this.reporter.files,
                                    clearSkipped: config.clearSkipped()
                                },
                                { log: false }
                            )
                            // eslint-disable-next-line no-console
                            .catch(
                                (e) => config.allureDebug() && console.log(e)
                            );
                } catch (e) {
                    // happens when cy.task could not be executed due to fired outside of it
                }
            })
            .on(EVENT_TEST_BEGIN, (test) => {
                this.reporter.startCase(test, config);
            })
            .on(EVENT_TEST_FAIL, (test, err) => {
                this.reporter.failTestCase(test, err);
                attachVideo(this.reporter, test, 'failed');
            })
            .on(EVENT_TEST_PASS, (test) => {
                this.reporter.passTestCase(test);
            })
            .on(EVENT_TEST_PENDING, (test) => {
                this.reporter.pendingTestCase(test);
            })
            .on(EVENT_TEST_END, (test) => {
                attachVideo(this.reporter, test, 'finished');

                this.reporter.populateGherkinLinksFromExampleTable();
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
            shouldListenToCyCommandEvents() &&
                this.reporter.cyCommandEnqueue(command);
        });

        Cypress.on('command:start', (command) => {
            shouldListenToCyCommandEvents() &&
                this.reporter.cyCommandStart(command.attributes);
        });

        Cypress.on('command:end', (command) => {
            shouldListenToCyCommandEvents() &&
                this.reporter.cyCommandEnd(command.attributes);
        });
    }
}

Cypress.Allure = config.allureEnabled()
    ? new CypressAllureReporter()
    : stubbedAllure;

Cypress.Screenshot.defaults({
    onAfterScreenshot(_, details) {
        if (config.allureEnabled()) {
            Cypress.Allure.reporter.files.push({
                name: details.name || `${details.specName}:${details.takenAt}`,
                path: details.path,
                type: ContentType.PNG,
                testName: Cypress.Allure.reporter.testNameForAttachment
            });
        }
    }
});

const attachVideo = (reporter, test, status) => {
    const shouldAttach =
        status === 'failed'
            ? true
            : test.state !== 'failed' && config.addVideoOnPass();

    if (Cypress.config().video && reporter.currentTest) {
        // add video to failed test case or for passed in case addVideoOnPass is true
        if (shouldAttach) {
            const absoluteVideoPath = Cypress.config()
                .videosFolder.split(config.resultsPath())
                .pop();

            const relativeVideoPath = path.isAbsolute(absoluteVideoPath)
                ? path.join(
                      '..',
                      path.relative(
                          Cypress.config().fileServerFolder,
                          absoluteVideoPath
                      )
                  )
                : absoluteVideoPath;

            const fileName = `${Cypress.spec.name}.mp4`;

            // avoid duplicating videos, especially for after all hook when test is passed
            if (
                reporter.currentTest.info.attachments.some(
                    (attachment) => attachment.name === fileName
                )
            ) {
                return;
            }

            reporter.currentTest.addAttachment(
                fileName,
                'video/mp4',
                path.join(relativeVideoPath, fileName)
            );
        }
    }
};

// need empty after hook to prohibit cypress stop the runner when there are skipped tests in the end
after(() => {});
