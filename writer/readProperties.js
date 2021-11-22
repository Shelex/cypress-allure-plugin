const fs = require('fs');

const allurePropertiesToEnvVars = (envVars) => {
    const allurePropertiesPath = 'allure.properties';

    if (!fs.existsSync(allurePropertiesPath)) {
        return null;
    }

    const propertiesContent = fs.readFileSync(allurePropertiesPath, {
        encoding: 'utf-8'
    });

    if (!propertiesContent) {
        return null;
    }

    const properties = propertiesContent
        .split('\n')
        .reduce((properties, record) => {
            if (!record) {
                return properties;
            }

            const [key, value] = record.split('=');
            // skip if no key or key is commented out
            if (!key || key.trim().startsWith('#')) {
                return properties;
            }

            properties[key] = toBooleanMaybe(value);
            return properties;
        }, {});

    const propertyToCypressEnv = new Map([
        ['allure.results.directory', 'allureResultsPath'],
        ['allure.link.issue.pattern', 'issuePrefix'],
        ['allure.link.tms.pattern', 'tmsPrefix'],
        ['allure.cypress.log.commands', 'allureLogCypress'],
        ['allure.cypress.log.requests', 'allureAttachRequests'],
        ['allure.cypress.log.gherkin', 'allureLogGherkin'],
        [
            'allure.omit.previous.attempt.screenshot',
            'allureOmitPreviousAttemptScreenshots'
        ],
        ['allure.analytics', 'allureAddAnalyticLabels'],
        ['allure.video.passed', 'allureAddVideoOnPass']
    ]);

    propertyToCypressEnv.forEach((envVariable, name) => {
        if (typeof properties[name] !== 'undefined') {
            envVars[envVariable] = properties[name];
        }
    });
};

const toBooleanMaybe = (str) => {
    if (str === 'true' || str === 'false') {
        return str === 'true';
    }
    return str;
};

module.exports = { allurePropertiesToEnvVars };
