// TODO prepare tests for chainer parsing

before(() => {
    cy.log(`------ SETTING MAGIC NUMBER ----> 42`);
    cy.setCookie('session', '42');
    Cypress.env('session', 42);
});

describe('Cypress commands steps', () => {
    it('should produce allure steps for cypress chainer commands', () => {
        cy.log('before command');
        cy.allure().startStep('step before "this is custom"');
        cy.thisiscustom('customname').then(() => {
            cy.allure().testName('new name');
        });
        cy.allure().endStep();
        cy.allure()
            .startStep('step nested 1')
            .startStep('step nested 2')
            .startStep('step nested 3');
        cy.request('https://google.com.ua')
            .should('have.property', 'status')
            .should('be.eq', 200)
            .and('be.not.eq', 400);
        cy.allure().endStep().endStep();

        cy.wrap([1, 2, 3])
            .then((array) => array[0])
            .as('firstItem')
            .should('be.eq', 1);
        cy.allure().endStep();

        cy.allure().step('step parent 1');
        cy.get('@firstItem').then((item) => {
            cy.log(item);
        });

        cy.allure().step('step parent 2');
        cy.request('https://google.com').then((res) => {
            cy.log(res);
        });
        cy.log('after command');
    });
});
