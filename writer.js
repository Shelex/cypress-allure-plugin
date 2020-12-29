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
        },
        copyFileToAllure: (filePath) => {
            const resultsDir = process.env.allureResultsPath;
            if (process.env.allure === 'true') {
                !fs.existsSync(resultsDir) &&
                    fs.mkdirSync(resultsDir, { recursive: true });
                const ext = path.extname(filePath);
                const allurePath = path.join(
                    resultsDir,
                    `${uuid.v4()}-attachment${ext}`
                );

                fs.copyFileSync(filePath, allurePath);

                return fs.existsSync(allurePath)
                    ? path.basename(allurePath)
                    : null;
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

module.exports = allureWriter;
