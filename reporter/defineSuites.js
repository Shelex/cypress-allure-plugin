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

    const fileInfo = parseAbsolutePath(fileName);

    const suiteLabels = defineSuitesFn(titlePath, fileInfo);

    if (!suiteLabels.length) {
        return labels;
    }

    if (suiteLabels.length === 1) {
        labels.push(label('suite', titlePath.pop()));
        return labels;
    }

    const [parentSuite, suite, ...subSuites] = suiteLabels;

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
