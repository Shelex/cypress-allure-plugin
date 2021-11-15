const logger = require('../debug');
const { tagToLabel, tagToLink, exampleNumber } = require('../gherkinToLabel');

module.exports = class CucumberHandler {
    constructor(reporter) {
        this.reporter = reporter;
        this.examplesStorage = [];
    }

    checkLinksInExamplesTable() {
        if (globalThis && globalThis.testState) {
            const { testState } = globalThis;

            if (testState.currentScenario.keyword === 'Scenario Outline') {
                logger.allure(`populating gherkin links from examples table`);
                const scenario = testState.currentScenario;

                !this.examplesStorage.length &&
                    this.examplesStorage.push(...scenario.examples);

                const example =
                    this.examplesStorage.length && this.examplesStorage.pop();

                if (example) {
                    const findCellIndex = (type) =>
                        example.tableHeader.cells.findIndex(
                            (cell) => cell.value === type
                        );

                    const tmsCellIndex = findCellIndex('tms');
                    const issueCellIndex = findCellIndex('issue');

                    const exampleRowNumber = parseInt(
                        exampleNumber.exec(scenario.name).pop()
                    );

                    if (!exampleRowNumber) {
                        return;
                    }

                    const exampleRowIndex = exampleRowNumber - 1;

                    const findTableCellValue = (headerIndex) =>
                        example.tableBody[exampleRowIndex].cells[headerIndex]
                            .value;

                    const addScenarioTag = (type, value) => {
                        const current =
                            globalThis.testState.runScenarios[scenario.name];

                        globalThis.testState.runScenarios[scenario.name].tags =
                            [
                                ...current.tags,
                                {
                                    type: 'Tag',
                                    name: `@${type}("${value}")`
                                }
                            ];
                    };

                    if (tmsCellIndex !== -1) {
                        const tmsId = findTableCellValue(tmsCellIndex);
                        logger.allure(`found tms link: %s`, tmsId);
                        addScenarioTag('tms', tmsId);
                    }

                    if (issueCellIndex !== -1) {
                        const issueId = findTableCellValue(issueCellIndex);
                        logger.allure(`found issue link: %s`, issueId);
                        addScenarioTag('issue', issueId);
                    }
                }
            }
        }
    }

    // accept cucumber tags from cypress-cucumber-preprocessor as commands
    checkTags() {
        if (globalThis && globalThis.testState) {
            logger.allure(`parsing gherkin tags`);
            const { testState } = globalThis;
            const { currentTest } = this.reporter;

            // set bdd feature by default
            currentTest.addLabel('feature', testState.feature.name);

            /**
             * tags set on test level has higher priority
             * to not be overwritten by feature tags
             */
            ['feature', 'currentScenario'].forEach(function (type) {
                logger.allure(`tags for %s`, type);
                testState[type] &&
                    testState[type].tags
                        // check for labels
                        .filter(function ({ name }) {
                            const match = tagToLabel.exec(name);
                            if (match) {
                                const [, command, value] = match;
                                // feature and suite should be overwritten to avoid duplicates
                                if (['feature', 'suite'].includes(command)) {
                                    const index =
                                        currentTest.info.labels.findIndex(
                                            (label) => label.name === command
                                        );
                                    currentTest.info.labels[index] = {
                                        name: command,
                                        value: value
                                    };
                                } else {
                                    currentTest.addLabel(command, value);
                                }
                            }
                            return !match;
                        })
                        // check for links
                        .filter(function ({ name }) {
                            const match = tagToLink.exec(name);
                            if (match) {
                                const [, command, name, matchUrl] = match;

                                const url = matchUrl || name;

                                const prefixBy = {
                                    issue: Cypress.env('issuePrefix'),
                                    tms: Cypress.env('tmsPrefix'),
                                    link: null
                                };
                                const urlPrefix = prefixBy[command];

                                const pattern =
                                    urlPrefix && urlPrefix.includes('*')
                                        ? urlPrefix
                                        : `${urlPrefix}*`;
                                currentTest.addLink(
                                    urlPrefix && pattern
                                        ? pattern.replace(/\*/g, url)
                                        : url,
                                    name,
                                    command
                                );
                            }
                            return !match;
                        })
                        // add other tags
                        .forEach(function ({ name }) {
                            currentTest.addLabel('tag', name.replace('@', ''));
                        });
            });
        }
    }
};
