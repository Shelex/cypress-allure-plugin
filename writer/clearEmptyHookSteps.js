const logger = require('../reporter/debug');

const clearEmptyHookSteps = (test) => {
    if (!test || !test.steps || !test.steps.length) {
        return test;
    }

    test.steps = test.steps.reduce((steps, step) => {
        if (
            ['"before each" hook', '"after each" hook'].includes(step.name) &&
            step.steps.length === 0
        ) {
            logger.writer(
                'removing empty step "%s" from test "%s"',
                step.name,
                test.uuid
            );
            return steps;
        }
        steps.push(step);
        return steps;
    }, []);

    return test;
};

module.exports = { clearEmptyHookSteps };
