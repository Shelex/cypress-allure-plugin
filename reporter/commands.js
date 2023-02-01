const logger = require('./debug');

Cypress.Commands.add('allure', () => {
    cy.wrap(Cypress.Allure.reporter.getInterface(), {
        log: false
    });
});

const childCommands = {
    parameter: (allure, name, value) => allure.parameter(name, value),
    testParameter: (allure, name, value) => allure.testParameter(name, value),
    testName: (allure, name) => allure.testName(name),
    severity: (allure, level) => allure.severity(level),
    testAttachment: (allure, name, content, type) =>
        allure.testAttachment(name, content, type),
    owner: (allure, name) => allure.owner(name),
    attachment: (allure, name, content, type) =>
        allure.attachment(name, content, type),
    fileAttachment: (allure, name, path, type) =>
        allure.fileAttachment(name, path, type),
    step: (allure, name, isParent = true) => allure.step(name, isParent),
    logStep: (allure, name) => allure.step(name, false),
    startStep: (allure, name) => allure.stepStart(name),
    endStep: (allure) => allure.stepEnd(),
    epic: (allure, name) => allure.epic(name),
    feature: (allure, name) => allure.feature(name),
    story: (allure, story) => allure.story(story),
    parentSuite: (allure, name) => allure.label('parentSuite', name),
    suite: (allure, name) => allure.suite(name),
    subSuite: (allure, name) => allure.label('subSuite', name),
    label: (allure, name, value) => allure.label(name, value),
    link: (allure, url, name, type) => allure.link(url, name, type),
    issue: (allure, name, url) => {
        const issuePrefix = Cypress.env('issuePrefix');
        allure.issue(name, issuePrefix ? `${issuePrefix}${url}` : url);
    },
    tms: (allure, name, url) => {
        const tmsPrefix = Cypress.env('tmsPrefix');
        const pattern =
            tmsPrefix && tmsPrefix.includes('*') ? tmsPrefix : `${tmsPrefix}*`;
        allure.tms(name, tmsPrefix ? pattern.replace(/\*/g, url) : url);
    },
    description: (allure, markdown) => allure.description(markdown),
    descriptionHtml: (allure, html) => allure.descriptionHtml(html),
    tag: (allure, ...tags) => allure.tag(...tags),
    testID: (allure, id) => allure.label('AS_ID', id),
    writeEnvironmentInfo: (allure, info) => allure.writeEnvironmentInfo(info),
    writeExecutorInfo: (allure, info) => allure.writeExecutorInfo(info),
    writeCategoriesDefinitions: (allure, categories) =>
        allure.writeCategoriesDefinitions(categories),
    logCommandSteps: (allure, state) => allure.loggingCommandStepsEnabled(state)
};

for (const command in childCommands) {
    Cypress.Commands.add(command, { prevSubject: true }, (...args) => {
        const [allure] = args;
        logger.command(`"%s" with args: %O`, command, args.slice(1));
        childCommands[command](...args);
        cy.wrap(allure, { log: false });
    });
}
