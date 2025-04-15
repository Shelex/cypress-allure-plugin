const fs = require('fs');
const path = require('path');
const logger = require('../reporter/debug');

const readAllureResults = (folder) => {
    try {
        logger.writer('parsing existing allure results');
        if (!fs.existsSync(folder)) {
            return [];
        }

        const files = fs.readdirSync(folder);

        const fileMap = files
            .map((filePath) => {
                const getType = (file) => {
                    const types = {
                        suite: (f) =>
                            f.includes('-container') && f.endsWith('.json'),
                        test: (f) =>
                            f.includes('-result') && f.endsWith('.json')
                    };
                    return Object.keys(types).find((type) => types[type](file));
                };

                const resultType = getType(filePath);

                const fullPath = path.join(folder, filePath);

                const fileContent =
                    resultType === 'suite' || resultType === 'test'
                        ? fs.existsSync(fullPath) &&
                          JSON.parse(
                              fs.readFileSync(fullPath, {
                                  encoding: 'utf-8'
                              })
                          )
                        : filePath;

                return fileContent;
            })
            .filter((x) => x);

        return fileMap;
    } catch (e) {
        logger.writer(`error parsing existing allure results: ${e}`);
        return [];
    }
};

const removeOrphanTest = (tests, suites, folder) => {
    for (const test of tests) {
        const isAttached = suites.find((suite) =>
            suite.children.includes(test.uuid)
        );
        if (!isAttached) {
            const fileName = `${test.uuid}-result.json`;
            const filePath = path.join(folder, fileName);
            logger.writer('found orphan test, removing %s', fileName);
            fs.existsSync(filePath) && fs.unlinkSync(filePath);
        }
    }
};

const sanitizeSuites = (folder, files = [], isGlobal = false) => {
    const suites = files.filter((file) => file.children);

    for (const suite of suites) {
        logger.writer('checking suite %s children', suite.uuid);
        for (const childID of suite.children) {
            const child = files.find((file) => file.uuid === childID);

            if (!child) {
                logger.writer('missing file for child %s', childID);
                continue;
            }

            if (child && child.steps && child.steps.length) {
                logger.writer('child %s %s has steps', child.uuid, child.name);
                continue;
            }

            const duplicates = files.filter(
                (file) =>
                    file.historyId === child.historyId &&
                    file.uuid !== child.uuid &&
                    file.steps &&
                    file.steps.length
            );

            duplicates.sort((a, b) => a.start - b.start);

            const earliestDuplicate = duplicates.shift();

            if (!earliestDuplicate) {
                logger.writer('no duplicate executions found: %s', child.uuid);
                continue;
            }

            const newChild = `${earliestDuplicate.uuid}-result.json`;
            const originalChild = `${childID}-result.json`;

            fs.existsSync(path.join(folder, originalChild)) &&
                fs.unlinkSync(path.join(folder, originalChild));

            fs.renameSync(
                path.join(folder, newChild),
                path.join(folder, originalChild)
            );

            fs.existsSync(path.join(folder, newChild)) &&
                fs.unlinkSync(path.join(folder, newChild));
        }

        const suitePath = `${suite.uuid}-container.json`;
        fs.writeFileSync(path.join(folder, suitePath), JSON.stringify(suite));
    }

    if (!isGlobal) {
        return;
    }

    logger.writer('suite run finished, checking tests');

    const tests = files.filter((file) => !file.children && file.historyId);

    removeOrphanTest(tests, suites, folder);
};

module.exports = {
    readAllureResults,
    sanitizeSuites
};
