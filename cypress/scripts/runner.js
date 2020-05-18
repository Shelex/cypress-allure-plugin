const cypress = require('cypress');

// basic or cucumber
const mode = process.argv.slice(2)[0];

const cypressConfig = {
    env: {
        allure: true,
        allureResultsPath: `cypress/fixtures/${mode}`
    }
};

cypressConfig.config =
    mode === 'cucumber'
        ? {
              ignoreTestFiles: '*.js',
              testFiles: '**/*.{feature,features}',
              video: false
          }
        : {
              integrationFolder: 'cypress/integration/basic',
              video: false
          };

cypress.run(cypressConfig);
