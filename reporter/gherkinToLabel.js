/**
 * Now all labels are set on test level
 * Need to investigate if some should be on suite/currentExecutable
 */
const availableLabels = [
    'AS_ID',
    'suite',
    'parentSuite',
    'subSuite',
    'epic',
    'feature',
    'story',
    'severity',
    'tag',
    'owner',
    'lead',
    'host',
    'thread',
    'testMethod',
    'testClass',
    'package',
    'framework',
    'language'
];
const labelPattern = `@(${availableLabels.join('|')})\\("(.*?)"\\)`;
const linkPattern = `@(issue|tms)\\("(.*?)","(.*?)"\\)`;

module.exports = {
    tagToLabel: new RegExp(labelPattern),
    tagToLink: new RegExp(linkPattern)
};
