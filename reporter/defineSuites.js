const label = (name, value) => ({ name: name, value: value });

const defineSuites = (titlePath) => {
    const labels = [];
    if (titlePath.length === 1) {
        labels.push(label('suite', titlePath.pop()));
    }

    const [parentSuite, suite, ...subSuites] = titlePath;
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
