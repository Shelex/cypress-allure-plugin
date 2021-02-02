given('I have allure tags set for Feature', () => {
    cy.log('child command for given');
});

when('I run any test', () => {
    cy.log('child command for when');
});

then('I should see allure api working properly', () => {
    cy.log('child command for allure api "then" step');
});

then('Tags from test should overwrite tags from feature', () => {
    cy.log('child command for tags overwriting "then" step');
});

given('I have {int}', (number) => {
    cy.wrap(number).as('number');
});

when('I multiply it with 2', () => {
    cy.get('@number').then((n) => {
        cy.wrap(n * 2).as('result');
    });
});

then('I should get expected {int}', (result) => {
    cy.get('@result').should('be.eq', result);
});
