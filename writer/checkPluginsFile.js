const fs = require('fs');

const alreadyRegisteredAfterSpec = (config) => {
    const configPath = config.pluginsFile || config.configFile;

    const content =
        fs.existsSync(configPath) && fs.readFileSync(configPath, 'utf-8');
    if (!content) {
        return;
    }

    const afterSpecPattern = /on\s?\(\s?[`|"|']after:spec[`|"|']\s?,/;

    const isCommented = (line) =>
        ['//', '*', '/*'].some((char) => line.trim().startsWith(char));

    return content
        .split('\n')
        .some((line) => afterSpecPattern.test(line) && !isCommented(line));
};

module.exports = { alreadyRegisteredAfterSpec };
