const path = require('path');
const fs = require('fs');
const uuid = require('uuid');

function allureWriter(on, config) {
    // pass allure config from Cypress.env to process.env
    // to get access from node context
    process.env.allure = config.env.allure;

    process.env.allureResultsPath =
        config.env.allureResultsPath || 'allure-results';

    on('task', {
        writeAllureResults: ({ resultsDir, writer }) => {
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
                        !fs.existsSync(testResultPath) &&
                            fs.writeFileSync(
                                testResultPath,
                                JSON.stringify(test)
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
    on('after:screenshot', (details) => {
        const resultsDir = process.env.allureResultsPath;

        // As after:screenshot is an event when screenshot file is saved
        // sometimes (when saving was after test finished)
        // we cannot access Cypress or Cypress.Allure context here

        if (process.env.allure === 'true') {
            !fs.existsSync(resultsDir) &&
                fs.mkdirSync(resultsDir, { recursive: true });
            const allurePath = path.join(
                resultsDir,
                `${uuid.v4()}-attachment.png`
            );
            return new Promise((resolve, reject) => {
                fs.copyFile(details.path, allurePath, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve({ path: allurePath });
                });
            });
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

module.exports = allureWriter;
