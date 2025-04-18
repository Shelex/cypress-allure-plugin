const logger = require('./debug');

const ALLURE_HOOK_NAME = {
    after: '__allure_after_hook__',
    afterEach: '__allure_after_each_hook__',
    before: '__allure_before_hook__',
    beforeEach: '__allure_before_each_hook__'
};

/**
 * isAllureSpecificHook
 * @param {string} hookName
 * @param  {Array<String>} type - can be after/afterEach/before/beforeEach
 * @return true/false
 */
const isAllureSpecificHook = (hookName, ...type) => {
    if (!hookName) {
        return false;
    }
    let keys = type.flat(Infinity);
    if (keys.length === 0) {
        keys = Object.keys(ALLURE_HOOK_NAME);
    }
    keys = keys.filter((key) => key in ALLURE_HOOK_NAME);
    return keys.some((key) => hookName.includes(ALLURE_HOOK_NAME[key]));
};

const isAllureHook = (hookName) => isAllureSpecificHook(hookName);

const reorderAllureHooksArray = (hooksArray) => {
    let commonHooks = hooksArray.filter((hook) => !isAllureHook(hook.title));
    let allureBeforeHooks = hooksArray.filter((hook) =>
        isAllureSpecificHook(hook.title, 'before', 'beforeEach')
    );
    let allureAfterHooks = hooksArray.filter((hook) =>
        isAllureSpecificHook(hook.title, 'after', 'afterEach')
    );
    return [...allureBeforeHooks, ...commonHooks, ...allureAfterHooks];
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

const clearTestAllureHookSteps = (test, allureLogHooks = false) => {
    if (!(test && test.steps && test.steps.length)) {
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
            clearTestAllureHookSteps(test, allureLogHooks);
        });
    }
};

const reorderAllureAfterAllHooks = (suite) => {
    reorderAllureHooksGeneric(suite, 'afterAll');
};

const reorderAllureAfterEachHooks = (suite) => {
    reorderAllureHooksGeneric(suite, 'afterEach');
};

const reorderAllureBeforeAllHooks = (suite) => {
    reorderAllureHooksGeneric(suite, 'beforeAll');
};

const reorderAllureGlobalHooks = (suite) => {
    reorderAllureHooksGeneric(suite, 'hooks', '');
};

const reorderAllureHooks = (suite) => {
    reorderAllureBeforeAllHooks(suite);
    reorderAllureAfterEachHooks(suite);
    reorderAllureAfterAllHooks(suite);
    reorderAllureGlobalHooks(suite);
};

const isLastRootHook = () => {
    const currentRunnable = cy.state('runnable');
    if (currentRunnable.type !== 'hook') {
        return false;
    }
    const { hookName } = currentRunnable;
    let rootSuite = currentRunnable.parent;
    while (rootSuite && rootSuite.parent && !rootSuite.root) {
        rootSuite = rootSuite.parent;
    }
    if (!rootSuite) {
        return false;
    }
    const hooks = (rootSuite && rootSuite.hooks) || [];
    const lastHook = hooks.findLast((h) => h.hookName === hookName);

    return lastHook && lastHook.hookId === currentRunnable.hookId;
};

const setTestIdToScreenshot = ({ allureEnabled, allure, details }) => {
    if (allureEnabled && allure && allure.reporter) {
        let currentTest = cy.state('test');
        let { mochaIdToAllure } = allure.reporter;
        if (details && currentTest && mochaIdToAllure) {
            const testIds = mochaIdToAllure[currentTest.id];
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

const buildPendingResults = ({ currentSpec, allure }) => {
    return {
        currentSpec: currentSpec,
        allureMapping: allure.reporter.mochaIdToAllure,
        allureResults: allure.reporter.runtime.config,
        allureResultContainer: allure.reporter.suites.map(
            (suite) => suite.testResultContainer
        )
    };
};

const clearAllureHookStepsFromHook = ({
    hook,
    reporter,
    allureLogHooks = false
}) => {
    if (!hook || !reporter) {
        return;
    }
    let { currentHook } = reporter;
    if (currentHook && !allureLogHooks && isAllureHook(hook.title)) {
        // remove allure hook steps so hook will not be kept in the report
        currentHook.info && (currentHook.info['steps'] = []);
        currentHook.stepResult && (currentHook.stepResult['steps'] = []);
    }
};

const loadPendingResults = ({
    currentSpec,
    allureResults,
    allureMapping,
    allureResultContainer
}) => {
    if (!currentSpec) {
        return;
    }
    let currentRunningSpec = Cypress.spec.relative || Cypress.spec.absolute;
    if (currentRunningSpec === currentSpec) {
        if (
            allureMapping &&
            Object.keys(Cypress.Allure.reporter.mochaIdToAllure || {})
                .length === 0
        ) {
            Cypress.Allure.reporter.mochaIdToAllure = allureMapping;
        }
        if (allureResults && allureResults.writer) {
            Object.keys(allureResults.writer).forEach((key) => {
                Cypress.Allure.reporter.runtime.config.writer[key] =
                    allureResults.writer[key];
            });
        }
        if (allureResultContainer) {
            Cypress.Allure.reporter.runtime.config.writer['groups'].push(
                ...allureResultContainer
            );
        }
    } else {
        cy.task(
            'savePendingAllureResults',
            {},
            {
                log: config.logAllureHooksEnabled()
            }
        ).then((pendingResults) => {
            logger.allure(
                '########### Reinit pendingResults ################ %O',
                pendingResults
            );
        });
    }
};
// Export everything
module.exports = {
    ALLURE_HOOK_NAME,
    reorderAllureHooks,
    setTestIdToScreenshot,
    buildPendingResults,
    loadPendingResults,
    clearAllureHookStepsFromTests,
    clearAllureHookStepsFromHook
};
