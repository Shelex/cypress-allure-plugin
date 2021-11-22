const { semVer } = require('./semver');

const shouldUseAfterSpec = (config) => {
    const cypressVersion = semVer(config.version);
    if (
        config.isInteractive &&
        cypressVersion.above('7.1.0') &&
        config.experimentalInteractiveRunEvents
    ) {
        return true;
    }

    if (cypressVersion.above('6.7.0')) {
        return true;
    }

    if (cypressVersion.above('6.2.0') && config.experimentalRunEvents) {
        return true;
    }

    return false;
};

module.exports = { shouldUseAfterSpec };
