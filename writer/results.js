const path = require('path-browserify');
const fs = require('fs');
const uuid = require('uuid');
const logger = require('../reporter/debug');

const { overwriteTestNameMaybe } = require('./customTestName');
const { clearEmptyHookSteps } = require('./clearEmptyHookSteps');
const { writeInfoFile, writeEnvProperties } = require('./infoFiles');
const { readAllureResults, sanitizeSuites } = require('./handleMultiDomain');

const writeAttachmentFiles = ({ files, resultsDir, tests }) => {
    if (!files || !files.length) {
        return;
    }

    files.forEach((file) => {
        if (!fs.existsSync(file.path)) {
            return;
        }

        const ext = path.extname(file.path);
        const allureFilePath = path.join(
            resultsDir,
            `${uuid.v4()}-attachment${ext}`
        );
        logger.writer(
            'copy attachment "%s" to "%s"',
            file.path,
            allureFilePath
        );

        fs.copyFileSync(file.path, allureFilePath);

        if (!fs.existsSync(allureFilePath)) {
            return;
        }

        const testsForAttachment = tests.filter(
            (t) =>
                t.name === file.testName ||
                t.name === `"before all" hook for "${file.testName}"` ||
                t.name === `"after all" hook for "${file.testName}"`
        );

        testsForAttachment.forEach((test) => {
            logger.writer(
                'attach "%s" to test "%s"',
                path.basename(allureFilePath),
                test.name
            );
            test.attachments.push({
                name: file.name,
                type: file.type,
                source: path.basename(allureFilePath)
            });
        });
    });
};

const writeSuites = ({ groups, resultsDir, tests, clearSkipped }) => {
    if (!groups || !groups.length) {
        return;
    }

    groups.forEach((group) => {
        if (!group.children || !group.children.length) {
            return;
        }

        if (clearSkipped) {
            logger.writer(
                'clearing skipped tests enabled, removing tests from suite %s',
                group.name
            );
            group.children = group.children.filter((testId) => {
                const test = tests.find((test) => test.uuid === testId);
                return test && test.status !== 'skipped';
            });
            if (!group.children.length) {
                logger.writer('skip suite as it has no tests remained');
                return;
            }
        }

        const fileName = `${group.uuid}-container.json`;
        const groupResultPath = path.join(resultsDir, fileName);

        logger.writer('write suite "%s" to file "%s"', group.name, fileName);

        // remove empty set up and tear down global hooks
        group.befores = group.befores
            ? group.befores.filter((before) => before.steps.length)
            : [];
        group.afters = group.afters
            ? group.afters.filter((after) => after.steps.length)
            : [];

        fs.writeFileSync(groupResultPath, JSON.stringify(group));
    });
};

const writeTests = ({ tests, resultsDir, clearSkipped, allureMapping }) => {
    if (!tests || !tests.length) {
        return;
    }

    tests.forEach((test) => {
        if (clearSkipped && test.status === 'skipped') {
            logger.writer('skipping test "%s"', test.name);

            const mochaID = Object.keys(allureMapping).find(
                (id) => allureMapping[id].allureId === test.uuid
            );
            if (mochaID) {
                delete allureMapping[mochaID];
            }
            return;
        }

        const fileName = `${test.uuid}-result.json`;
        logger.writer('write test "%s" to file "%s"', test.name, fileName);
        const testResultPath = path.join(resultsDir, fileName);
        const updatedTest = overwriteTestNameMaybe(test);
        const testResult = clearEmptyHookSteps(updatedTest);
        fs.writeFileSync(testResultPath, JSON.stringify(testResult));
    });
};

const writeAttachments = ({ attachments, resultsDir }) => {
    if (!attachments) {
        return;
    }

    for (let [name, content] of Object.entries(attachments)) {
        const attachmentPath = path.join(resultsDir, name);

        logger.writer('write attachment "%s" to "%s"', name, attachmentPath);

        !fs.existsSync(attachmentPath) &&
            fs.writeFileSync(attachmentPath, content, {
                encoding: 'binary'
            });
    }
};

const handleAfterTestWrites = ({ resultsDir, isGlobal }) => {
    const parsed = readAllureResults(resultsDir);
    return sanitizeSuites(resultsDir, parsed, isGlobal);
};

const catchError = (fn, ...args) => {
    try {
        fn(...args);
    } catch (e) {
        process.stdout.write(`error while writing allure results: ${e}`);
        logger.writer('failed to write allure results: %O', e);
    }
};

const writeResultFiles = ({
    resultsDir,
    files,
    clearSkipped,
    writer,
    allureMapping,
    isGlobal
}) => {
    !fs.existsSync(resultsDir) && fs.mkdirSync(resultsDir, { recursive: true });

    logger.writer('starting writing allure results to "%s"', resultsDir);

    const { groups, tests, attachments, envInfo, categories, executorInfo } =
        writer;

    catchError(writeAttachmentFiles, { files, resultsDir, tests });
    catchError(writeSuites, { groups, resultsDir, tests, clearSkipped });
    catchError(writeTests, { tests, resultsDir, clearSkipped, allureMapping });
    catchError(writeAttachments, { attachments, resultsDir });
    catchError(handleAfterTestWrites, { resultsDir, isGlobal });

    const allureResultsPath = (file) => path.join(resultsDir, file);

    catchError(writeInfoFile, allureResultsPath('categories.json'), categories);
    catchError(writeInfoFile, allureResultsPath('executor.json'), executorInfo);
    catchError(
        writeEnvProperties,
        allureResultsPath('environment.properties'),
        envInfo
    );
    logger.writer('finished writing allure results');
};

module.exports = {
    writeResultFiles
};
