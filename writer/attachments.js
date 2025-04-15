const fs = require('fs');
const path = require('path-browserify');
const uuid = require('uuid');
const logger = require('../reporter/debug');
const { createTest } = require('./sampleEntity');

const videoContentType = 'video/mp4';
const imageContentType = 'image/png';

const attachScreenshotsAndVideo = (allureMapping, results, config) => {
    if (!allureMapping) {
        logger.writer('not found mapping of mocha test id to allure test ids');
        return;
    }

    const videoPath =
        results.video &&
        `${uuid.v4()}-attachment${path.extname(results.video)}`;

    const shouldAddVideoOnPass = config.env.allureAddVideoOnPass === true;
    const testIdIndex = Object.keys(allureMapping);

    const needVideo = results.tests.filter((test, index) => {
        let shouldAttachVideo = false;
        test.testId = (test && test.testId) || testIdIndex[index];
        const testIds = allureMapping[test.testId];
        if (!testIds) {
            return false;
        }

        testIds.forEach((ids) => {
            let { allureId, attempt, screenshots: screenshotsList } = ids;
            screenshotsList = screenshotsList || [];
            const currentTest = test.attempts[attempt];

            logger.writer('going to check attachments for "%s"', allureId);

            const fileName = `${allureId}-result.json`;
            const testFilePath = path.join(
                config.env.allureResultsPath,
                fileName
            );
            // check if results exist, if no - create allure file
            const isWritten = fs.existsSync(testFilePath);
            if (!isWritten) {
                const fallBackDate = new Date(Date.now()).toISOString();
                const allureTest = createTest({
                    title: test.title,
                    name: test.title.pop(),
                    uuid: allureId,
                    status: currentTest.state,
                    error: currentTest.error,
                    start: Date.parse(
                        currentTest.wallClockStartedAt || fallBackDate
                    ),
                    stop:
                        Date.parse(
                            currentTest.wallClockStartedAt || fallBackDate
                        ) + (currentTest.wallClockDuration || 0)
                });

                fs.writeFileSync(testFilePath, JSON.stringify(allureTest));
            }

            const content =
                fs.existsSync(testFilePath) &&
                fs.readFileSync(testFilePath, { encoding: 'utf-8' });

            if (!content) {
                logger.writer('could not find file "%s"', testFilePath);
                return false;
            }

            const allureTest = JSON.parse(content);

            const getScreenshots = () => {
                if (config.env.allureSkipAutomaticScreenshots) {
                    return [];
                }

                return screenshotsList.filter(
                    (screenshot) =>
                        screenshot.testId === test.testId &&
                        screenshot.testAttemptIndex === attempt
                );
            };

            const screenshots = getScreenshots();

            screenshots.forEach((screenshot) => {
                const allureScreenshotFileName = `${uuid.v4()}-attachment${path.extname(
                    screenshot.path
                )}`;
                logger.writer('going to attach screenshot to "%s"', allureId);
                const allureScreenshotPath = path.join(
                    config.env.allureResultsPath,
                    allureScreenshotFileName
                );

                logger.writer(
                    'copying screenshot from "%s" to "%s"',
                    screenshot.path,
                    allureScreenshotPath
                );
                fs.copyFileSync(screenshot.path, allureScreenshotPath);

                allureTest.attachments.push({
                    name:
                        screenshot.name ||
                        `${results.spec.name}:${screenshot.takenAt}${
                            screenshot.testAttemptIndex
                                ? `:attempt-${screenshot.testAttemptIndex}`
                                : ''
                        }`,
                    type: imageContentType,
                    source: allureScreenshotFileName
                });
            });

            shouldAttachVideo =
                (results.video &&
                    // attach video for not passed tests or for every in case "allureAddVideoOnPass" enabled
                    // or for tests with retries
                    (allureTest.status !== 'passed' || shouldAddVideoOnPass)) ||
                (test.attempts.length > 1 &&
                    attempt === test.attempts.length - 1);

            logger.writer(
                `video will ${shouldAttachVideo ? '' : 'not'} be attached`
            );

            if (shouldAttachVideo && videoPath) {
                logger.writer('going to attach video for "%s"', allureId);
                const existingVideoIndex = allureTest.attachments.findIndex(
                    (attach) => attach.type === videoContentType
                );
                if (existingVideoIndex === -1) {
                    allureTest.attachments.push({
                        name: 'video recording',
                        type: videoContentType,
                        source: videoPath
                    });
                } else {
                    allureTest.attachments[existingVideoIndex].source =
                        videoPath;
                }
            }

            fs.writeFileSync(testFilePath, JSON.stringify(allureTest));
        });

        return shouldAttachVideo;
    });

    if (needVideo.length && videoPath) {
        logger.writer('found %d tests that require video', needVideo.length);
        const resultsPath = path.join(config.env.allureResultsPath, videoPath);

        logger.writer(
            'copying video from "%s" to "%s"',
            results.video,
            resultsPath
        );

        fs.copyFileSync(results.video, resultsPath);
    }
};

module.exports = { attachScreenshotsAndVideo };
