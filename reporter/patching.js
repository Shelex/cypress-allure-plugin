const logger = require('./debug');

const ALLURE_AFTER_HOOK = '__allure_after_hook__';
const ALLURE_AFTER_EACH_HOOK = '__allure_after_each_hook__';

const isAllureAfterHook = (nameOrFn) => nameOrFn.includes(ALLURE_AFTER_HOOK);

const isAllureAfterEachHook = (nameOrFn) =>
    nameOrFn.includes(ALLURE_AFTER_EACH_HOOK);

const isAllureHook = (nameOrFn) =>
    isAllureAfterHook(nameOrFn) || isAllureAfterEachHook(nameOrFn);

const reorderAllureHooksArray = (hooksArray) => {
    let commonHooks = hooksArray.filter((hook) => !isAllureHook(hook.title));
    let allureHooks = hooksArray.filter((hook) => isAllureHook(hook.title));
    return [...commonHooks, ...allureHooks];
};

const reorderAllureHooksGeneric = (
    suite,
    hookType = 'afterAll',
    hookPrefix = '_'
) => {
    if (suite && suite.root === true) {
        logger.allure(`Reorder root suite '${hookType}' hooks`);
        const initialHooks = suite[`${hookPrefix}${hookType}`];
        if (initialHooks) {
            suite[`${hookPrefix}${hookType}`] =
                reorderAllureHooksArray(initialHooks);
            logger.allure(
                `End Reorder root suite '${hookType}' hooks: before:%O after:%O`,
                initialHooks,
                suite[`${hookPrefix}${hookType}`]
            );
        } else {
            logger.allure(
                `End Reorder root suite '${hookType}' hooks: nothing to do`
            );
        }
    }
};

const clearAllureHookSteps = (test, allureLogHooks = false) => {
    if (!test?.steps?.length) {
        return test;
    }

    test.steps = test.steps.reduce((steps, step) => {
        if (
            isAllureHook(step.name) &&
            (step.steps.length === 0 || !allureLogHooks)
        ) {
            logger.allure(
                'removing allure hook step "%s" from test "%s"',
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

const clearAllureHookStepsFromTests = (tests, allureLogHooks = false) => {
    if (tests) {
        tests.forEach((test) => {
            clearAllureHookSteps(test, allureLogHooks);
        });
    }
};

const reorderAllureAfterHooks = (suite) => {
    reorderAllureHooksGeneric(suite, 'afterAll');
};

const reorderAllureAfterEachHooks = (suite) => {
    reorderAllureHooksGeneric(suite, 'afterEach');
};

const reorderAllureGlobalHooks = (suite) => {
    reorderAllureHooksGeneric(suite, 'hooks', '');
};

const reorderAllureHooks = (suite) => {
    reorderAllureAfterEachHooks(suite);
    reorderAllureAfterHooks(suite);
    reorderAllureGlobalHooks(suite);
};

const isLastRootHook = () => {
    const currentRunnable = cy.state('runnable');
    if (currentRunnable.type !== 'hook') {
        return false;
    }
    const { hookName } = currentRunnable;
    let rootSuite = currentRunnable.parent;
    while (rootSuite?.parent && !rootSuite.root) {
        rootSuite = rootSuite.parent;
    }
    if (!rootSuite) {
        return false;
    }
    const hooks = rootSuite?.hooks || [];
    const lastHook = hooks.findLast((h) => h.hookName === hookName);

    return lastHook && lastHook.hookId === currentRunnable.hookId;
};

const setTestIdToScreenshot = (allureEnabled, mochaIdToAllure, details) => {
    if (allureEnabled) {
        let currentTest = cy.state('test');
        if (details && currentTest && mochaIdToAllure) {
            const testIds = mochaIdToAllure[currentTest?.id];
            if (testIds) {
                details['testId'] = currentTest.id;
                let testId = testIds.at(-1);
                if (!Array.isArray(testId['screenshots'])) {
                    testId['screenshots'] = []; // Create an array if it doesn't exist
                }
                testId['screenshots'].push(details);
            }
        }
    }
};

// Export everything
module.exports = {
    ALLURE_AFTER_HOOK,
    ALLURE_AFTER_EACH_HOOK,
    isAllureHook,
    clearAllureHookStepsFromTests,
    reorderAllureAfterHooks,
    reorderAllureAfterEachHooks,
    reorderAllureGlobalHooks,
    reorderAllureHooks,
    isLastRootHook,
    setTestIdToScreenshot
};
