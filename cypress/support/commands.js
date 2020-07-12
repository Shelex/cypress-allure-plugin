// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

Cypress.Commands.add('thisiscustom', (name) => {
    cy.log('command started');
    cy.log(name);
    cy.thisissecond('one', ['two'], { name: 'three' }).then((res) => {
        expect(res).to.be.eq(200);
    });
    cy.log('command finished');
});

Cypress.Commands.add('thisissecond', (one, two, three) => {
    cy.log('doing second command');
    cy.request('https://facebook.com').its('status').should('be.eq', 200);
});
