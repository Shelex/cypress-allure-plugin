const path = require('path-browserify');
const label = (name, value) => ({ name: name, value: value });

const defaultSuitesFn = (titles) => titles;

const parseAbsolutePath = (absolutePath) => {
    const parsedPath = path.parse(absolutePath || '');
    return {
        absolutePath: absolutePath,
        file: parsedPath.base,
        ext: parsedPath.ext,
        name: parsedPath.name,
        folder: path.basename(parsedPath.dir)
    };
};

const defineSuites = (
    titlePath,
    fileName,
    defineSuitesFn = defaultSuitesFn
) => {
    const labels = [];

    if (!titlePath.length) {
        return labels;
    }

    if (titlePath.length === 1) {
        labels.push(label('suite', titlePath.pop()));
        return labels;
    }

    const fileInfo = parseAbsolutePath(fileName);

    const [parentSuite, suite, ...subSuites] = defineSuitesFn(
        titlePath,
        fileInfo
    );
    if (parentSuite) {
        labels.push(label('parentSuite', parentSuite));
    }
    if (suite) {
        labels.push(label('suite', suite));
    }
    if (subSuites.length > 0) {
        labels.push(label('subSuite', subSuites.join(' > ')));
    }
    return labels;
};

module.exports = defineSuites;
