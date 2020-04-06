const path = require('path');
const fse = require('fs-extra');
const uuid = require('uuid');

module.exports = function (on) {
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
                !fse.existsSync(resultsDir) && fse.mkdirSync(resultsDir);
                groups &&
                    groups.forEach((group) => {
                        const fileName = `${group.uuid}-container.json`;
                        const groupResultPath = path.join(resultsDir, fileName);
                        !fse.existsSync(groupResultPath) &&
                            fse.outputFileSync(
                                groupResultPath,
                                JSON.stringify(group)
                            );
                    });
                tests &&
                    tests.forEach((test) => {
                        const fileName = `${test.uuid}-result.json`;
                        const testResultPath = path.join(resultsDir, fileName);
                        !fse.existsSync(testResultPath) &&
                            fse.outputFileSync(
                                testResultPath,
                                JSON.stringify(test)
                            );
                    });
                if (attachments) {
                    for (let [name, content] of Object.entries(attachments)) {
                        const attachmentPath = path.join(resultsDir, name);
                        !fse.existsSync(attachmentPath) &&
                            fse.outputFileSync(attachmentPath, content, {
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
        const allurePath = path.join(
            `allure-results`,
            `${uuid.v4()}-attachment.png`
        );
        return new Promise((resolve, reject) => {
            fse.copy(details.path, allurePath, (err) => {
                if (err) {
                    return reject(err);
                }
                resolve({ path: allurePath });
            });
        });
    });
};

const writeInfoFile = (fileName, data, resultsDir) => {
    if (data) {
        const isEnvProps = fileName === 'environment.properties';
        isEnvProps &&
            (data = Object.keys(data)
                .map((key) => `${key}=${data[key]}`)
                .join('\n'));
        const filePath = path.join(resultsDir, fileName);
        !fse.existsSync(filePath) &&
            fse.outputFileSync(
                filePath,
                isEnvProps ? data : JSON.stringify(data),
                {
                    encoding: 'binary'
                }
            );
    }
};
