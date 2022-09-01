const uuid = require('uuid');
const defineSuites = require('../reporter/defineSuites');

const createSuite = (spec) => ({
    uuid: uuid.v4(),
    children: [],
    befores: [],
    afters: [],
    name: spec
});

const createTest = (results) => {
    const statusDetails = results.error
        ? {
              message: results.error.split('The error was:').shift(),
              trace: results.error.split('The error was:').pop()
          }
        : null;

    return {
        uuid: results.uuid,
        historyId: null,
        status: results.status,
        statusDetails: statusDetails,
        stage: 'finished',
        attachments: [],
        parameters: [],
        labels: defineSuites(
            results.title,
            results.spec ? results.spec.absolute : ''
        ),
        links: [],
        start: Date.parse(results.start),
        name: results.name,
        fullName: results.name,
        stop: Date.parse(results.stop)
    };
};

module.exports = { createSuite, createTest };
