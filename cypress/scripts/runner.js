const cypress = require('cypress');

// basic or cucumber
const mode = process.argv.slice(2)[0];

const cypressConfig = {
    env: {
        allure: true,
        allureResultsPath: `cypress/fixtures/${mode}`,
        stepDefinitions: `cypress/e2e/cucumber/**/*.cy.js`
    }
};

const config = (mode) => {
    const configs = {
        cucumber: {
            specPattern: 'cypress/e2e/cucumber/*.feature',
            excludeSpecPattern: '*.js'
        },
        basic: {
            specPattern: 'cypress/e2e/basic/*.cy.*'
        }
    };

    const config = configs[mode] || configs.basic;
    config.video = false;
    cypressConfig.config = config;
    return cypressConfig;
};

cypress.run(config(mode));
