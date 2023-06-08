/**
 * Stubbed Allure interface for case when it is disabled
 */

module.exports = {
    reporter: {
        getInterface: () => {
            return stubbedAllure;
        }
    }
};

const stubbedAllure = {
    testID: () => {},
    epic: () => {},
    feature: () => {},
    story: () => {},
    parentSuite: () => {},
    suite: () => {},
    subSuite: () => {},
    label: () => {},
    parameter: () => {},
    link: () => {},
    issue: () => {},
    tms: () => {},
    description: () => {},
    descriptionHtml: () => {},
    owner: () => {},
    severity: () => {},
    tag: () => {},
    writeEnvironmentInfo: () => {},
    writeCategoriesDefinitions: () => {},
    writeExecutorInfo: () => {},
    attachment: () => {},
    testAttachment: () => {},
    step: () => {},
    logStep: () => {},
    startStep: () => {},
    stepStart: () => {},
    stepEnd: () => {},
    endStep: () => {},
    fileAttachment: () => {},
    testParameter: () => {},
    testName: () => {},
    defineSuiteLabels: () => {},
    defineHistoryId: () => {},
    logCommandSteps: () => {}
};
