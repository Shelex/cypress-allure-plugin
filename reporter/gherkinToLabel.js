/**
 * Now all labels are set on test level
 * Need to investigate if some should be on suite/currentExecutable
 */
const availableLabels = [
    'parentSuite',
    'suite',
    'subSuite',
    'epic',
    'feature',
    'story',
    'severity',
    'tag',
    'owner',
    'testID'
];
const labelPattern = `@(${availableLabels.join('|')})\\("(.*?)"\\)`;
const linkPattern = `@(issue|tms|link)\\("(.*?)",?"?(.*?)?"?\\)`;
const exampleNumber = `(?:example #)(\\d)`;

module.exports = {
    tagToLabel: new RegExp(labelPattern),
    tagToLink: new RegExp(linkPattern),
    exampleNumber: new RegExp(exampleNumber)
};
