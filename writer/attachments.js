const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const logger = require('../reporter/debug');

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

    const needVideo = results.tests.filter((test) => {
        const allureId = allureMapping[test.testId];
        if (!allureId) {
            return false;
        }

        logger.writer('going to check attachments for "%s"', allureId);

        const fileName = `${allureId}-result.json`;

        const testFilePath = path.join(config.env.allureResultsPath, fileName);

        const content =
            fs.existsSync(testFilePath) && fs.readFileSync(testFilePath);

        if (!content) {
            logger.writer('could not find file "%s"', testFilePath);
            return false;
        }

        const allureTest = JSON.parse(content);

        const screenshots = results.screenshots.filter(
            (screenshot) => screenshot.testId === test.testId
        );

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

        if (
            results.video &&
            // attach video for not passed tests or for every in case "allureAddVideoOnPass" enabled
            (allureTest.status !== 'passed' || shouldAddVideoOnPass)
        ) {
            logger.writer('going to attach video for "%s"', allureId);
            const existingVideoIndex = allureTest.attachments.findIndex(
                (attach) => attach.type === videoContentType
            );

            existingVideoIndex === -1
                ? allureTest.attachments.push({
                      name: 'video recording',
                      type: videoContentType,
                      source: videoPath
                  })
                : (allureTest.attachments[existingVideoIndex].source =
                      videoPath);
        }

        fs.writeFileSync(testFilePath, JSON.stringify(allureTest));
        return results.video;
    });

    if (needVideo.length) {
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
