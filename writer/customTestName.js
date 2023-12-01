const crypto = require('crypto-js');
const logger = require('../reporter/debug');

const defaultHistoryId = (title) => title;

const overwriteTestNameMaybe = (test, defineHistoryId) => {
    const historyIdFn = defineHistoryId || defaultHistoryId;

    const overrideIndex = test.parameters.findIndex(
        (p) => p.name === 'OverwriteTestName'
    );
    if (overrideIndex !== -1) {
        const name = test.parameters[overrideIndex].value;
        logger.writer('overwriting test "%s" name to "%s"', test.name, name);
        test.name = name;
        test.historyId = crypto
            .MD5(historyIdFn(name, test.fullName))
            .toString(crypto.enc.Hex);
        test.fullName = name;
        test.parameters.splice(overrideIndex, 1);
    }
    return test;
};

module.exports = { overwriteTestNameMaybe };
