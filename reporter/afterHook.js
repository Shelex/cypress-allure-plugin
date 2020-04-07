/**
 * Check if any screenshots are available for test
 */
afterEach(() => {
    if (Cypress.env('allure')) {
        Cypress.Allure.reporter.getInterface().processScreenshots();
        cy.task(
            'writeAllureTestResult',
            Cypress.Allure.reporter.runtime.config
        );
    }
});
/**
 * Execute task to write allure results to fs
 */
after(() => {
    Cypress.env('allure') &&
        cy.task('writeAllureResults', Cypress.Allure.reporter.runtime.config);
});
