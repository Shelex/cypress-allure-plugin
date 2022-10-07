const fs = require('fs');
const logger = require('../reporter/debug');

const writeInfoFile = (fileName, data) => {
    if (!data) {
        return;
    }
    logger.writer('write file "%s"', fileName);

    !fs.existsSync(filePath) &&
        fs.writeFileSync(fileName, JSON.stringify(data));
};

const writeEnvProperties = (fileName, data) => {
    if (!data) {
        return;
    }

    logger.writer('writing env properties "%s"', fileName);

    const existingContent =
        fs.existsSync(fileName) &&
        fs.readFileSync(fileName, {
            encoding: 'utf-8'
        });

    const parsed = existingContent
        ? existingContent.split('\n').reduce((props, line) => {
              if (!line || !line.length) {
                  return props;
              }
              const [key, value] = line.split('=');

              if (!key || !value) {
                  return props;
              }

              props[key] = value;
              return props;
          }, {})
        : {};

    const envProps = { ...parsed, ...data };

    const envPropsData = Object.keys(envProps)
        .map((key) => `${key}=${envProps[key]}`)
        .join('\n');

    fs.writeFileSync(fileName, envPropsData);

    logger.writer('env properties are written');
};

module.exports = { writeInfoFile, writeEnvProperties };
