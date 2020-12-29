before(() => {
    cy.log('This will run before scenarios');
});

after(() => {
    cy.log('This will run after scenarios');
});

beforeEach(() => {
    cy.log('This will run before every scenario');
});

afterEach(() => {
    cy.log('This will run after every scenario');
});
