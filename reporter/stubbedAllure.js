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
    epic: () => {},
    feature: () => {},
    story: () => {},
    suite: () => {},
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
    startStep: () => {},
    stepStart: () => {},
    stepEnd: () => {},
    endStep: () => {},
    attachFile: () => {},
    testDescription: () => {},
    testDescriptionHtml: () => {},
    testParameter: () => {}
};
