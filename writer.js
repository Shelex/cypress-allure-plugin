const path = require('path');
const fs = require('fs');
const process = require('process');
const uuid = require('uuid');
const logger = require('./reporter/debug');
const { allurePropertiesToEnvVars } = require('./writer/readProperties');
const { overwriteTestNameMaybe } = require('./writer/customTestName');
const { shouldUseAfterSpec } = require('./writer/useAfterSpec');
const { alreadyRegisteredAfterSpec } = require('./writer/checkPluginsFile');
const { handleResults } = require('./writer/handleCypressResults');

function allureWriter(on, config) {
    allurePropertiesToEnvVars(config.env);

    if (!config.env.allureResultsPath) {
        config.env.allureResultsPath = 'allure-results';
    }

    let allureMapping = null;

    if (shouldUseAfterSpec(config)) {
        logger.writer(
            'allure should use "after:spec" for handling attachments'
        );
        if (alreadyRegisteredAfterSpec(config)) {
            logger.writer(
                'you already have "after:spec", allure plugin will listen to process'
            );

            // in case cypress "after:spec" event is already registered by user
            // and we will register new callback - it will be overwritten
            // as a workaround we will listen directly to process messages
            // ( cypress uses it to trigger event for internal event emitter under the hood )
            process.on('message', (message) => {
                const [event, , args] = message.args;
                if (event !== 'after:spec' || !config.env.allure) {
                    return;
                }
                const [, results] = args;
                logger.writer('got "after:spec" process message');
                handleResults(allureMapping, results, config);
            });
        } else {
            logger.writer('register "after:spec" event listener');
            on('after:spec', (_, results) => {
                if (!config.env.allure) {
                    return;
                }
                logger.writer('inside "after:spec" event');
                handleResults(allureMapping, results, config);
            });
        }
    }

    on('task', {
        writeAllureResults: ({ results, files, mapping, clearSkipped }) => {
            const { resultsDir, writer } = results;
            logger.writer(
                'starting writing allure results to "%s"',
                resultsDir
            );
            const {
                groups,
                tests,
                attachments,
                envInfo,
                categories,
                executorInfo
            } = writer;

            config.env.allureResultsPath = resultsDir;
            allureMapping = mapping;

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
                            logger.writer(
                                'copy attachment "%s" to "%s"',
                                file.path,
                                allureFilePath
                            );

                            fs.copyFileSync(file.path, allureFilePath);

                            if (fs.existsSync(allureFilePath)) {
                                const testsForAttachment = tests.filter(
                                    (t) =>
                                        t.name === file.testName ||
                                        t.name ===
                                            `"before all" hook for "${file.testName}"` ||
                                        t.name ===
                                            `"after all" hook for "${file.testName}"`
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
                            }
                        }
                    });
                groups &&
                    groups.forEach((group) => {
                        if (group.children.length) {
                            if (clearSkipped) {
                                logger.writer(
                                    'clearing skipped tests enabled, removing tests from suite %s',
                                    group.name
                                );
                                group.children = group.children.filter(
                                    (testId) => {
                                        const test = tests.find(
                                            (test) => test.uuid === testId
                                        );
                                        return (
                                            test && test.status !== 'skipped'
                                        );
                                    }
                                );
                                if (!group.children.length) {
                                    logger.writer(
                                        'skip suite as it has no tests remained'
                                    );
                                    return;
                                }
                            }

                            const fileName = `${group.uuid}-container.json`;
                            const groupResultPath = path.join(
                                resultsDir,
                                fileName
                            );

                            logger.writer(
                                'write suite "%s" to file "%s"',
                                group.name,
                                fileName
                            );

                            // remove empty set up and tear down global hooks
                            group.befores =
                                (group.befores &&
                                    group.befores.filter(
                                        (before) => before.steps.length
                                    )) ||
                                [];
                            group.afters =
                                (group.afters &&
                                    group.afters.filter(
                                        (after) => after.steps.length
                                    )) ||
                                [];

                            fs.writeFileSync(
                                groupResultPath,
                                JSON.stringify(group)
                            );
                        }
                    });
                tests &&
                    tests.forEach((test) => {
                        if (clearSkipped && test.status === 'skipped') {
                            logger.writer('skipping test "%s"', test.name);
                            return;
                        }

                        const fileName = `${test.uuid}-result.json`;
                        logger.writer(
                            'write test "%s" to file "%s"',
                            test.name,
                            fileName
                        );
                        const testResultPath = path.join(resultsDir, fileName);
                        const testResult = overwriteTestNameMaybe(test);
                        fs.writeFileSync(
                            testResultPath,
                            JSON.stringify(testResult)
                        );
                    });
                if (attachments) {
                    for (let [name, content] of Object.entries(attachments)) {
                        const attachmentPath = path.join(resultsDir, name);

                        logger.writer(
                            'write attachment "%s" to "%s"',
                            name,
                            attachmentPath
                        );

                        !fs.existsSync(attachmentPath) &&
                            fs.writeFileSync(attachmentPath, content, {
                                encoding: 'binary'
                            });
                    }
                }
                writeInfoFile('categories.json', categories, resultsDir);
                writeInfoFile('executor.json', executorInfo, resultsDir);
                writeInfoFile('environment.properties', envInfo, resultsDir);
                logger.writer('finished writing allure results');
            } catch (e) {
                process.stdout.write(
                    `error while writing allure results: ${e}`
                );
                logger.writer('failed to write allure results: %O', e);
            } finally {
                return null;
            }
        }
    });
}

const writeInfoFile = (fileName, data, resultsDir) => {
    if (data) {
        logger.writer('write file "%s"', fileName);
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
                    encoding: 'binary',
                    // if file exist use appending for env props, other files will be truncated
                    flag: isEnvProps ? 'as' : 'w'
                }
            );
    }
};

module.exports = allureWriter;
