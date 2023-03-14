const fs = require('fs');
const path = require('path-browserify');
const uuid = require('uuid');
const logger = require('../reporter/debug');
const { createTest, createSuite } = require('./sampleEntity');

const handleCrash = (results, config) => {
    if (!results.error) {
        return;
    }

    !fs.existsSync(config.env.allureResultsPath) &&
        fs.mkdirSync(config.env.allureResultsPath, { recursive: true });

    logger.writer('identified cypress error');

    const suite = createSuite(results.spec.name);

    const test = createTest({
        title: [results.spec.name],
        name: `Oops...we found an error preparing this test file: ${results.spec.name}`,
        uuid: uuid.v4(),
        status: 'broken',
        error: results.error,
        start: results.stats.wallClockStartedAt,
        stop: results.stats.wallClockEndedAt
    });

    suite.children.push(test.uuid);

    const videoPath =
        results.video &&
        `${uuid.v4()}-attachment${path.extname(results.video)}`;

    if (videoPath) {
        test.attachments.push({
            name: 'video recording',
            type: 'video/mp4',
            source: videoPath
        });

        const resultsPath = path.join(config.env.allureResultsPath, videoPath);

        fs.copyFileSync(results.video, resultsPath);
    }

    const suiteFileName = `${suite.uuid}-container.json`;

    const suitePath = path.join(config.env.allureResultsPath, suiteFileName);

    fs.writeFileSync(suitePath, JSON.stringify(suite));

    const testFileName = `${test.uuid}-result.json`;

    const testPath = path.join(config.env.allureResultsPath, testFileName);

    fs.writeFileSync(testPath, JSON.stringify(test));

    return null;
};

module.exports = { handleCrash };
