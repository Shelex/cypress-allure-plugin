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
    'AS_ID'
];
const labelPattern = `@(${availableLabels.join('|')})\\("(.*?)"\\)`;
const linkPattern = `@(issue|tms|link)\\("(.*?)",?"?(.*?)?"?\\)`;

module.exports = {
    tagToLabel: new RegExp(labelPattern),
    tagToLink: new RegExp(linkPattern)
};
