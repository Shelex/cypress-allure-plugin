Cypress.Commands.add('allure', () => {
    cy.wrap(Cypress.Allure && Cypress.Allure.reporter.getInterface(), {
        log: false
    });
});

Cypress.Commands.add(
    'parameter',
    { prevSubject: true },
    (allure, name, value) => {
        allure && allure.parameter(name, value);
        cy.wrap(allure, { log: false });
    }
);

Cypress.Commands.add('severity', { prevSubject: true }, (allure, level) => {
    allure && allure.severity(level);
    cy.wrap(allure, { log: false });
});

Cypress.Commands.add(
    'testAttachment',
    { prevSubject: true },
    (allure, name, content, type) => {
        allure && allure.testAttachment(name, content, type);
        cy.wrap(allure, { log: false });
    }
);

Cypress.Commands.add('owner', { prevSubject: true }, (allure, name) => {
    allure && allure.owner(name);
    cy.wrap(allure, { log: false });
});

Cypress.Commands.add(
    'attachment',
    { prevSubject: true },
    (allure, name, content, type) => {
        allure && allure.attachment(name, content, type);
        cy.wrap(allure, { log: false });
    }
);

Cypress.Commands.add(
    'step',
    { prevSubject: true },
    (allure, name, isParent = true) => {
        allure && allure.step(name, isParent);
        cy.wrap(allure, { log: false });
    }
);

Cypress.Commands.add('epic', { prevSubject: true }, (allure, name) => {
    allure && allure.epic(name);
    cy.wrap(allure, { log: false });
});
Cypress.Commands.add('feature', { prevSubject: true }, (allure, name) => {
    allure && allure.feature(name);
    cy.wrap(allure, { log: false });
});
Cypress.Commands.add('story', { prevSubject: true }, (allure, story) => {
    allure && allure.story(story);
    cy.wrap(allure, { log: false });
});
Cypress.Commands.add('suite', { prevSubject: true }, (allure, name) => {
    allure && allure.suite(name);
    cy.wrap(allure, { log: false });
});

Cypress.Commands.add('label', { prevSubject: true }, (allure, name, value) => {
    allure && allure.label(name, value);
    cy.wrap(allure, { log: false });
});

Cypress.Commands.add(
    'link',
    { prevSubject: true },
    (allure, url, name, type) => {
        allure && allure.link(url, name, type);
        cy.wrap(allure, { log: false });
    }
);
Cypress.Commands.add('issue', { prevSubject: true }, (allure, name, url) => {
    const issuePrefix = Cypress.env('issuePrefix');
    allure && allure.issue(name, issuePrefix ? `${issuePrefix}${url}` : url);
    cy.wrap(allure, { log: false });
});
Cypress.Commands.add('tms', { prevSubject: true }, (allure, name, url) => {
    const tmsPrefix = Cypress.env('tmsPrefix');
    allure && allure.tms(name, tmsPrefix ? `${tmsPrefix}${url}` : url);
    cy.wrap(allure, { log: false });
});
Cypress.Commands.add(
    'description',
    { prevSubject: true },
    (allure, markdown) => {
        allure && allure.description(markdown);
        cy.wrap(allure, { log: false });
    }
);
Cypress.Commands.add(
    'descriptionHtml',
    { prevSubject: true },
    (allure, html) => {
        allure && allure.descriptionHtml(html);
        cy.wrap(allure, { log: false });
    }
);
Cypress.Commands.add('tag', { prevSubject: true }, (allure, tag) => {
    allure && allure.tag(tag);
    cy.wrap(allure, { log: false });
});

Cypress.Commands.add(
    'writeEnvironmentInfo',
    { prevSubject: true },
    (allure, info) => {
        allure && allure.writeEnvironmentInfo(info);
        cy.wrap(allure, { log: false });
    }
);

Cypress.Commands.add(
    'writeExecutorInfo',
    { prevSubject: true },
    (allure, info) => {
        allure && allure.writeExecutorInfo(info);
        cy.wrap(allure, { log: false });
    }
);

Cypress.Commands.add(
    'writeCategoriesDefinitions',
    { prevSubject: true },
    (allure, categories) => {
        allure && allure.writeCategoriesDefinitions(categories);
        cy.wrap(allure, { log: false });
    }
);
