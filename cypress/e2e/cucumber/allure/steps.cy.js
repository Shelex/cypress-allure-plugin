import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

Given('I have allure tags set for Feature', () => {
    cy.log('child command for given');
});

When('I run any test', () => {
    cy.log('child command for when');
});

When('I run any test whit {string}', (value) => {
    cy.log('child command for when ' + value);
});

Then('I should see allure api working properly', () => {
    cy.log('child command for allure api "then" step');
});

Then('Tags from test should overwrite tags from feature', () => {
    cy.log('child command for tags overwriting "then" step');
});

Given('I have {int}', (number) => {
    cy.wrap(number).as('number');
});

When('I multiply it with 2', () => {
    cy.get('@number').then((n) => {
        cy.wrap(n * 2).as('result');
    });
});

Then('I should get expected {int}', (result) => {
    cy.get('@result').should('be.eq', result);
});
