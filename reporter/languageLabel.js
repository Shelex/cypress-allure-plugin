// in case test file is missing - get it from parent suite
const getFile = (test) =>
    test && test.file && test.file !== ''
        ? test.file
        : test && test.parent && getFile(test.parent);

const languageLabel = (test) => {
    const file = getFile(test);
    const ext = file && file.split('.').pop();

    const language = {
        js: 'javascript',
        ts: 'typescript',
        feature: 'gherkin'
    };

    return language[ext] || ext;
};

module.exports = { languageLabel };
