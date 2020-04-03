/**
 * Check if any screenshots are available for test
 */
afterEach(() => {
    Cypress.env('allure') &&
        Cypress.Allure.reporter.getInterface().processScreenshots();
});
/**
 * Execute task to write allure results to fs
 */
after(() => {
    Cypress.env('allure') &&
        cy.task('writeAllureResults', Cypress.Allure.reporter.runtime.config);
});
