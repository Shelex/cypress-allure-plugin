const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const logger = require('../reporter/debug');

const handleCrash = (results) => {
    if (!results.error) {
        return;
    }

    !fs.existsSync(process.env.allureResultsPath) &&
        fs.mkdirSync(process.env.allureResultsPath, { recursive: true });

    logger.writer('identified cypress error');

    const suite = createSuite(results.spec.name);

    const test = createTest(results, suite);

    suite.children.push(test.uuid);

    if (results.video) {
        const videoPath = `${uuid.v4()}-attachment${path.extname(
            results.video
        )}`;

        test.attachments.push({
            name: 'video recording',
            type: 'video/mp4',
            source: videoPath
        });

        const resultsPath = path.join(process.env.allureResultsPath, videoPath);

        fs.copyFileSync(results.video, resultsPath);
    }

    const suiteFileName = `${suite.uuid}-container.json`;

    const suitePath = path.join(process.env.allureResultsPath, suiteFileName);

    fs.writeFileSync(suitePath, JSON.stringify(suite));

    const testFileName = `${test.uuid}-result.json`;

    const testPath = path.join(process.env.allureResultsPath, testFileName);

    fs.writeFileSync(testPath, JSON.stringify(test));

    return null;
};

module.exports = { handleCrash };

const createSuite = (spec) => ({
    uuid: uuid.v4(),
    children: [],
    befores: [],
    afters: [],
    name: spec
});

const createTest = (results, suite) => {
    const name = `Oops...we found an error preparing this test file: ${results.spec.name}`;
    return {
        uuid: uuid.v4(),
        historyId: null,
        status: 'broken',
        statusDetails: {
            message: results.error.split('The error was:').shift(),
            trace: results.error.split('The error was:').pop()
        },
        stage: 'finished',
        attachments: [],
        parameters: [],
        labels: [{ name: 'suite', value: suite.name }],
        links: [],
        start: Date.parse(results.stats.wallClockStartedAt),
        name: name,
        fullName: name,
        stop: Date.parse(results.stats.wallClockEndedAt)
    };
};
