const path = require('path');
const fs = require('fs');
const uuid = require('uuid');
const crypto = require('crypto-js');

function allureWriter(on, config) {
    // pass allure config from Cypress.env to process.env
    // to get access from node context
    process.env.allure = config.env.allure;

    process.env.allureResultsPath =
        config.env.allureResultsPath || 'allure-results';

    on('task', {
        writeAllureResults: ({ results, files }) => {
            const { resultsDir, writer } = results;
            const {
                groups,
                tests,
                attachments,
                envInfo,
                categories,
                executorInfo
            } = writer;
            try {
                !fs.existsSync(resultsDir) &&
                    fs.mkdirSync(resultsDir, { recursive: true });
                files &&
                    files.forEach((file) => {
                        if (fs.existsSync(file.path)) {
                            const ext = path.extname(file.path);
                            const allureFilePath = path.join(
                                resultsDir,
                                `${uuid.v4()}-attachment${ext}`
                            );

                            fs.copyFileSync(file.path, allureFilePath);

                            if (fs.existsSync(allureFilePath)) {
                                const testsForAttachment = tests.filter(
                                    (t) => t.name === file.testName
                                );

                                testsForAttachment.forEach((test) => {
                                    test.attachments.push({
                                        name: file.name,
                                        type: file.type,
                                        source: path.basename(allureFilePath)
                                    });
                                });
                            }
                        }
                    });
                groups &&
                    groups.forEach((group) => {
                        if (group.children.length) {
                            const fileName = `${group.uuid}-container.json`;
                            const groupResultPath = path.join(
                                resultsDir,
                                fileName
                            );
                            !fs.existsSync(groupResultPath) &&
                                fs.writeFileSync(
                                    groupResultPath,
                                    JSON.stringify(group)
                                );
                        }
                    });
                tests &&
                    tests.forEach((test) => {
                        const fileName = `${test.uuid}-result.json`;
                        const testResultPath = path.join(resultsDir, fileName);
                        const testResult = overwriteTestNameMaybe(test);
                        !fs.existsSync(testResultPath) &&
                            fs.writeFileSync(
                                testResultPath,
                                JSON.stringify(testResult)
                            );
                    });
                if (attachments) {
                    for (let [name, content] of Object.entries(attachments)) {
                        const attachmentPath = path.join(resultsDir, name);
                        !fs.existsSync(attachmentPath) &&
                            fs.writeFileSync(attachmentPath, content, {
                                encoding: 'binary'
                            });
                    }
                }
                writeInfoFile('categories.json', categories, resultsDir);
                writeInfoFile('executor.json', executorInfo, resultsDir);
                writeInfoFile('environment.properties', envInfo, resultsDir);
            } catch (e) {
                process.stdout.write(
                    `error while writing allure results: ${e}`
                );
            } finally {
                return null;
            }
        }
    });
}

const writeInfoFile = (fileName, data, resultsDir) => {
    if (data) {
        const isEnvProps = fileName === 'environment.properties';
        isEnvProps &&
            (data = Object.keys(data)
                .map((key) => `${key}=${data[key]}`)
                .join('\n'));
        const filePath = path.join(resultsDir, fileName);
        !fs.existsSync(filePath) &&
            fs.writeFileSync(
                filePath,
                isEnvProps ? data : JSON.stringify(data),
                {
                    encoding: 'binary'
                }
            );
    }
};

const overwriteTestNameMaybe = (test) => {
    const overrideIndex = test.parameters.findIndex(
        (p) => p.name === 'OverwriteTestName'
    );
    if (overrideIndex !== -1) {
        const name = test.parameters[overrideIndex].value;
        test.name = name;
        test.fullName = name;
        test.historyId = crypto.MD5(name).toString(crypto.enc.Hex);
        test.parameters.splice(overrideIndex, 1);
    }
    return test;
};

module.exports = allureWriter;
