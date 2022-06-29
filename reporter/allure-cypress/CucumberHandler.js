const logger = require('../debug');
const { tagToLabel, tagToLink, exampleNumber } = require('../gherkinToLabel');

module.exports = class CucumberHandler {
    constructor(reporter) {
        this.reporter = reporter;
        this.examplesStorage = [];
    }

    get isStateAvailable() {
        return globalThis && globalThis.testState;
    }

    get state() {
        if (!this.isStateAvailable) {
            return;
        }
        return globalThis.testState;
    }

    get feature() {
        return this.isNewFormat
            ? this.state.gherkinDocument.feature
            : this.state.feature;
    }

    get currentScenario() {
        if (!this.isStateAvailable) {
            return;
        }
        return (
            this.state.currentScenario ||
            this.state.gherkinDocument.feature.children.find((child) =>
                this.state.pickle.astNodeIds.includes(
                    child.scenario && child.scenario.id
                )
            ).scenario
        );
    }

    get isNewFormat() {
        if (!this.isStateAvailable) {
            return;
        }
        return Boolean(this.state.gherkinDocument);
    }

    get outlineExampleIndex() {
        if (this.isNewFormat) {
            const [, exampleId] = this.state.pickle.astNodeIds;
            if (
                !this.currentScenario.examples ||
                !this.currentScenario.examples.length
            ) {
                return -1;
            }
            return this.currentScenario.examples[0].tableBody.findIndex(
                (item) => item.id === exampleId
            );
        }
        const num = parseInt(
            exampleNumber.exec(this.currentScenario.name).pop()
        );
        if (!num) {
            return -1;
        }
        return num - 1;
    }

    addTag(scenarioId, tag) {
        const currentTags = this.currentScenario.tags || [];
        if (this.isNewFormat) {
            const indexOfChild = this.feature.children.findIndex(
                (child) => child.scenario && child.scenario.id === scenarioId
            );
            if (indexOfChild === -1) {
                return;
            }
            globalThis.testState.gherkinDocument.feature.children[
                indexOfChild
            ].scenario.tags = [
                ...currentTags.filter((t) => !t.type && !t.type !== 'Tag'),
                tag
            ];
            return;
        }
        globalThis.testState.runScenarios[this.currentScenario.name].tags = [
            ...currentTags,
            tag
        ];
    }

    checkLinksInExamplesTable() {
        if (!this.isStateAvailable) {
            return;
        }
        if (this.currentScenario.keyword !== 'Scenario Outline') {
            return;
        }
        logger.allure(`populating gherkin links from examples table`);
        const scenario = this.currentScenario;

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

            const exampleRowIndex = this.outlineExampleIndex;
            if (exampleRowIndex === -1) {
                return;
            }

            const findTableCellValue = (headerIndex) =>
                example.tableBody[exampleRowIndex].cells[headerIndex].value;

            if (tmsCellIndex !== -1) {
                const tmsId = findTableCellValue(tmsCellIndex);
                logger.allure(`found tms link: %s`, tmsId);
                this.addTag(this.currentScenario.id, {
                    type: 'Tag',
                    name: `@tms("${tmsId}")`
                });
            }

            if (issueCellIndex !== -1) {
                const issueId = findTableCellValue(issueCellIndex);
                logger.allure(`found issue link: %s`, issueId);
                this.addTag(this.currentScenario.id, {
                    type: 'Tag',
                    name: `@issue("${issueId}")`
                });
            }
        }
    }

    // accept cucumber tags from cypress-cucumber-preprocessor as commands
    checkTags() {
        if (!this.isStateAvailable) {
            return;
        }
        logger.allure(`parsing gherkin tags`);
        const { currentTest } = this.reporter;

        // set bdd feature by default
        currentTest.addLabel('feature', this.feature.name);

        /**
         * tags set on test level has higher priority
         * to not be overwritten by feature tags
         */

        [this.feature, this.currentScenario].forEach(function (kind) {
            if (!kind || !kind.tags || !kind.tags.length) {
                return;
            }

            kind.tags
                .filter(function ({ name }) {
                    const match = tagToLabel.exec(name);
                    if (match) {
                        const [, command, value] = match;
                        // feature and suite should be overwritten to avoid duplicates
                        if (['feature', 'suite'].includes(command)) {
                            const index = currentTest.info.labels.findIndex(
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
};
