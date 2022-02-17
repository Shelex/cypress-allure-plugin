const { attachScreenshotsAndVideo } = require('./attachments');
const { handleCrash } = require('./handleCrash');
const logger = require('../reporter/debug');

const handleResults = (allureMapping, results, config) => {
    logger.writer('processing "after:spec" results');
    try {
        results.error
            ? handleCrash(results, config)
            : attachScreenshotsAndVideo(allureMapping, results, config);
    } catch (e) {
        logger.writer(
            'failed to add attachments in "after:spec" due to: %O',
            e
        );
    }
    allureMapping = null;
};

module.exports = { handleResults };
