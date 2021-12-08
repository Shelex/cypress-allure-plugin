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
const AllureReporter = require('./allure-cypress/AllureReporter');
const stubbedAllure = require('./stubbedAllure');
const logger = require('./debug');
const { shouldUseAfterSpec } = require('../writer/useAfterSpec');

const { env } = Cypress;

const shouldEnableGherkinLogging = () => {
    const logCypress = env('allureLogCypress');
    const logGherkin = env('allureLogGherkin');

    const isLogCypressDefined = typeof logCypress !== 'undefined';
    const isLogGherkinDefined = typeof logGherkin !== 'undefined';

    return isLogGherkinDefined
        ? logGherkin
        : // in case logGherkin is not defined use logCypress value or true by default
        isLogCypressDefined
        ? logCypress
        : true;
};

const config = {
    allureEnabled: () => env('allure'),
    resultsPath: () => env('allureResultsPath') || 'allure-results',
    shouldLogCypress: () => env('allureLogCypress') !== false,
    shouldAttachRequests: () => env('allureAttachRequests'),
    shouldLogGherkinSteps: () => shouldEnableGherkinLogging(),
    clearFilesForPreviousAttempt: () =>
        env('allureOmitPreviousAttemptScreenshots'),
    clearSkipped: () => env('allureClearSkippedTests') === true,
    addAnalyticLabels: () => env('allureAddAnalyticLabels'),
    addVideoOnPass: () => env('allureAddVideoOnPass')
};

const shouldListenToCyCommandEvents = () =>
    config.shouldLogCypress() || config.shouldLogGherkinSteps();

class CypressAllureReporter {
    constructor() {
        logger.allure(
            `creating allure reporter instance, cypress env: %O`,
            env()
        );
        this.reporter = new AllureReporter(
            new AllureRuntime({
                resultsDir: config.resultsPath(),
                writer: new InMemoryAllureWriter()
            }),
            config
        );

        Cypress.mocha
            .getRunner()
            .on(EVENT_SUITE_BEGIN, (suite) => {
                logger.mocha(`EVENT_SUITE_BEGIN: %s %O`, suite.title, suite);
                this.reporter.startSuite(suite);
            })
            .on(EVENT_SUITE_END, (suite) => {
                logger.mocha(`EVENT_SUITE_END: %s %O`, suite.title, suite);
                /**
                 * only global cypress file suite end
                 * should be triggered from here
                 * others are handled on suite start event
                 */
                const isGlobal = suite.title === '';
                this.reporter.endSuite(isGlobal);

                if (config && config.allureEnabled() && isGlobal) {
                    try {
                        cy.now(
                            'task',
                            'writeAllureResults',
                            {
                                results: this.reporter.runtime.config,
                                files: this.reporter.files,
                                mapping: this.reporter.mochaIdToAllure,
                                clearSkipped: config.clearSkipped()
                            },
                            { log: false }
                        )
                            // eslint-disable-next-line no-console
                            .catch((e) =>
                                logger.allure(
                                    `failed to execute task to write allure results: %O`,
                                    e
                                )
                            );
                        logger.allure(`writing allure results`);
                    } catch (e) {
                        // happens when cy.task could not be executed due to fired outside of it
                        logger.allure(`failed to write allure results: %O`, e);
                    }
                }
            })
            .on(EVENT_TEST_BEGIN, (test) => {
                logger.mocha(`EVENT_TEST_BEGIN: %s %O`, test.title, test);
                this.reporter.startCase(test, config);
            })
            .on(EVENT_TEST_FAIL, (test, err) => {
                logger.mocha(`EVENT_TEST_FAIL: %s %O`, test.title, test);
                this.reporter.failTestCase(test, err);
                attachVideo(this.reporter, test, 'failed');
            })
            .on(EVENT_TEST_PASS, (test) => {
                logger.mocha(`EVENT_TEST_PASS: %s %O`, test.title, test);
                this.reporter.passTestCase(test);
            })
            .on(EVENT_TEST_PENDING, (test) => {
                logger.mocha(`EVENT_TEST_PENDING: %s %O`, test.title, test);
                this.reporter.pendingTestCase(test);
            })
            .on(EVENT_TEST_END, (test) => {
                logger.mocha(`EVENT_TEST_END: %s %O`, test.title, test);
                attachVideo(this.reporter, test, 'finished');

                this.reporter.gherkin.checkLinksInExamplesTable();
                this.reporter.gherkin.checkTags();
                this.reporter.endTest();
            })
            .on(EVENT_HOOK_BEGIN, (hook) => {
                logger.mocha(`EVENT_HOOK_BEGIN: %s %O`, hook.title, hook);
                this.reporter.startHook(hook);
            })
            .on(EVENT_HOOK_END, (hook) => {
                logger.mocha(`EVENT_HOOK_END: %s %O`, hook.title, hook);
                this.reporter.endHook(hook);
            });

        Cypress.on('command:enqueued', (command) => {
            if (shouldListenToCyCommandEvents()) {
                logger.cy(`command:enqueued %O`, command);
                this.reporter.cy.enqueued(command);
            }
        });

        Cypress.on('command:start', (command) => {
            if (shouldListenToCyCommandEvents()) {
                logger.cy(`command:start %O`, command);
                this.reporter.cy.started(command.attributes);
            }
        });

        Cypress.on('command:end', (command) => {
            if (shouldListenToCyCommandEvents()) {
                logger.cy(`command:end %O`, command);
                this.reporter.cy.finished(command.attributes);
            }
        });

        Cypress.on('log:added', (log) => {
            if (log.state === 'failed') {
                logger.cy('found failed log:added %O', log);

                if (
                    this.reporter.currentExecutable &&
                    this.reporter.currentExecutable.info
                ) {
                    this.reporter.currentExecutable.info.status = 'failed';
                }
            }
        });
    }
}

Cypress.Allure = config.allureEnabled()
    ? new CypressAllureReporter()
    : stubbedAllure;

Cypress.Screenshot.defaults({
    onAfterScreenshot(_, details) {
        logger.cy(`onAfterScreenshot: %O`, details);
        if (config.allureEnabled() && !shouldUseAfterSpec(Cypress.config())) {
            logger.allure(`allure enabled, attaching screenshot`);
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
    if (shouldUseAfterSpec(Cypress.config())) {
        logger.allure(
            `video attachment will be handled in after:spec plugins event`
        );
        return;
    }

    const shouldAttach =
        status === 'failed'
            ? true
            : test.state !== 'failed' && config.addVideoOnPass();

    logger.allure(`check video attachment`);

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

            logger.allure(
                `attaching video %s`,
                path.join(relativeVideoPath, fileName)
            );

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
