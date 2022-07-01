const AllureWriter = require('./writer');
const cucumber = require('cypress-cucumber-preprocessor').default;
const fs = require('fs');
const path = require('path');
const { defineConfig } = require('cypress');

module.exports = defineConfig({
    e2e: {
        setupNodeEvents(on, config) {
            on('file:preprocessor', cucumber());
            AllureWriter(on, config);
            on('task', {
                readAllureResults: () => {
                    try {
                        const dir = 'cypress/fixtures';
                        const subdirs = ['basic', 'cucumber'];
                        return subdirs.reduce((dirMap, subdir) => {
                            const dirFiles = fs.readdirSync(
                                path.join(dir, subdir)
                            );
                            dirMap[subdir] = dirFiles.reduce((fileMap, f) => {
                                const getType = (file) => {
                                    const types = {
                                        suites: (f) => f.includes('-container'),
                                        tests: (f) => f.includes('-result'),
                                        attachments: (f) =>
                                            f.includes('-attachment')
                                    };
                                    return Object.keys(types).find((type) =>
                                        types[type](file)
                                    );
                                };

                                const resultType = getType(f);

                                const fileContent = fs.readFileSync(
                                    path.join(dir, subdir, f),
                                    {
                                        encoding: 'utf-8'
                                    }
                                );

                                const fileValue = f.endsWith('.json')
                                    ? {
                                          ...JSON.parse(fileContent),
                                          fileName: f
                                      }
                                    : {
                                          content: fileContent.substr(0, 20),
                                          fileName: f
                                      };

                                !fileMap[resultType] &&
                                    (fileMap[resultType] = []);

                                fileMap[resultType].push(fileValue);
                                return fileMap;
                            }, {});
                            return dirMap;
                        }, {});
                    } catch (e) {
                        return e;
                    }
                }
            });
            return config;
        }
    }
});
