const cypress = require('cypress');

const modes = ['basic', 'cucumber'];

modes.forEach((mode) => {
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
});
