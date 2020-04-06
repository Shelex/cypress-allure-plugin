/**
 * Now all labels are set on test level
 * Need to investigate if some should be on suite/currentExecutable
 */
const availableLabels = [
    'suite',
    'parentSuite',
    'subSuite',
    'testType',
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
    'language',
    'resultFormat'
];
const labelPattern = `@(${availableLabels.join('|')})\\("(.*?)"\\)`;
const linkPattern = `@(issue|tms)\\("(.*?)","(.*?)"\\)`;

module.exports = {
    tagToLabel: new RegExp(labelPattern),
    tagToLink: new RegExp(linkPattern)
};
