/**
 * Execute task to write allure results to fs
 */
after(() => {
    Cypress.env('allure') &&
        cy.task('writeAllureResults', Cypress.Allure.reporter.runtime.config);
});
