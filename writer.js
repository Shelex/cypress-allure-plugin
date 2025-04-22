const path = require('path-browserify');
const process = require('process');
const logger = require('./reporter/debug');
const { allurePropertiesToEnvVars } = require('./writer/readProperties');
const { shouldUseAfterSpec } = require('./writer/useAfterSpec');
const { alreadyRegisteredAfterSpec } = require('./writer/checkPluginsFile');
const { handleResults } = require('./writer/handleCypressResults');
const { writeResultFiles } = require('./writer/results');

function allureWriter(on, config) {
    allurePropertiesToEnvVars(config.env);

    if (!config.env.allure) {
        logger.writer('allure not activated');
        return;
    }
    if (!config.env.allureResultsPath) {
        config.env.allureResultsPath = 'allure-results';
    }

    let allureMapping = null;
    let allurePendingResults = {};

    if (shouldUseAfterSpec(config)) {
        logger.writer(
            'allure should use "after:spec" for handling attachments'
        );
        if (
            config.env.allureReuseAfterSpec ||
            alreadyRegisteredAfterSpec(config)
        ) {
            logger.writer(
                'you already have "after:spec", allure plugin will listen to process'
            );

            // in case cypress "after:spec" event is already registered by user
            // and we will register new callback - it will be overwritten
            // as a workaround we will listen directly to process messages
            // ( cypress uses it to trigger event for internal event emitter under the hood )
            process.on('message', (message) => {
                const [event, , args] = message.args;
                if (!config.env.allure || event !== 'after:spec') {
                    return;
                }
                const [, results] = args;
                logger.writer('got "after:spec" process message');
                handleResults(allureMapping, results, config);
            });
        } else {
            logger.writer('register "after:spec" event listener');
            on('after:spec', (_, results) => {
                if (!config.env.allure) {
                    return;
                }
                logger.writer('inside "after:spec" event');
                handleResults(allureMapping, results, config);
            });
        }
    }

    on('task', {
        writeAllureResults: ({
            pendingResults,
            files,
            clearSkipped,
            isGlobal,
            defineHistoryId
        }) => {
            const { resultsDir: relativeResultsDir, writer } =
                pendingResults.allureResults;

            const resultsDir = config.projectRoot
                ? path.join(config.projectRoot, relativeResultsDir)
                : relativeResultsDir;

            config.env.allureResultsPath = resultsDir;
            allurePendingResults = pendingResults;
            ({ allureMapping } = pendingResults);

            writeResultFiles({
                resultsDir,
                files,
                clearSkipped,
                writer,
                allureMapping,
                isGlobal,
                defineHistoryId
            });
            if (isGlobal) {
                allurePendingResults = {};
            }

            return null;
        }
    });

    on('task', {
        getPendingAllureResults: () => {
            return allurePendingResults || {};
        }
    });

    on('task', {
        savePendingAllureResults: (pendingResults) => {
            allurePendingResults = pendingResults || {};
            return allurePendingResults;
        }
    });
}

module.exports = allureWriter;
