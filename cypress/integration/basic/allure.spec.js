before(() => {
    cy.log('This will run before scenarios');
});

after(() => {
    cy.log('This will run after scenarios');
});

describe('Allure API Context', () => {
    beforeEach(() => {
        cy.log('This will run before every scenario');
    });

    it('should work in synchronous mode', () => {
        const allure = Cypress.Allure.reporter.getInterface();
        allure.description('some description');
        allure.attachment('sample', 'sample attachment', 'text/plain');
        allure.epic('Allure API');
        allure.feature('Synchronous');
        allure.owner('Oleksandr Shevtsov');
        allure.parameter('param', 42);
        allure.severity('critical');
        allure.step('custom step');
        allure.story('Synchronous api should work');
        allure.label('parentSuite', 'Allure API Parent Suite');
        allure.issue('bug', 'issueUrl');
        allure.tms('test case', 'tmsUrl');
        allure.tag('customTag');
    });

    it('should work in chainer mode', () => {
        cy.allure()
            .description('some description')
            .attachment('sample', 'sample attachment', 'text/plain')
            .epic('Allure API')
            .feature('Chainer')
            .owner('Oleksandr Shevtsov')
            .parameter('param', 42)
            .severity('critical')
            .step('custom step')
            .story('Chainer api should work')
            .label('parentSuite', 'Allure API Parent Suite')
            .issue('bug', 'issueUrl')
            .tms('test case', 'tmsUrl')
            .tag('customTag');
    });

    it('should attach screenshot for failed test', () => {
        cy.wrap(42).should('not.be.eq', 42);
    });

    it('should attach cypress command log as steps', () => {
        cy.allure().step('first parent step');
        cy.log('child command for first step');
        cy.allure().step('second parent step');
        cy.log('child command for second step');
    });

    afterEach(() => {
        cy.log(`This will run after every scenario`);
    });
});
