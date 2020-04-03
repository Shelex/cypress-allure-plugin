/**
 * A lot of credit to Sergey Korol <serhii.s.korol@gmail.com> who made
 * Allure-mocha reporter: "https://github.com/allure-framework/allure-js/tree/master/packages/allure-mocha"
 */

const path = require('path');
const {
    Allure,
    isPromise,
    Status,
    Stage,
    ContentType
} = require('allure-js-commons');
const StepWrapper = require('./StepWrapper');

Allure.prototype.step = function(name, body = Status.PASSED) {
    const wrappedStep = this.startStep(name);
    let result;
    if (typeof body === 'string') {
        wrappedStep.step.stepResult.status = body;
        wrappedStep.step.stepResult.stage = Stage.FINISHED;
    } else {
        try {
            result = wrappedStep.run(body);
        } catch (err) {
            wrappedStep.endStep();
            throw err;
        }
        if (isPromise(result)) {
            return result
                .then((a) => {
                    wrappedStep.endStep();
                    return a;
                })
                .catch((e) => {
                    wrappedStep.endStep();
                    throw e;
                });
        }
    }

    wrappedStep.endStep();
    return result;
};

Allure.prototype.logStep = function(name, body) {
    this.step(name, body);
};

Allure.prototype.attachment = function(name, content, type) {
    const fileName = this.reporter.writeAttachment(content, type);
    this.currentExecutable.addAttachment(name, type, fileName);
};

Allure.prototype.testAttachment = function(name, content, type) {
    const fileName = this.reporter.writeAttachment(content, type);
    this.currentTest.addAttachment(name, type, fileName);
};

Allure.prototype.startStep = function(name) {
    const allureStep = this.currentExecutable.startStep(name);
    this.reporter.pushStep(allureStep);
    return new StepWrapper(this.reporter, allureStep);
};

// Process Cypress screenshots automatically
Allure.prototype.processScreenshots = function() {
    const { currentTest } = this;
    this.reporter.screenshots.forEach(function(s) {
        currentTest.addAttachment(
            `${s.specName}:${s.takenAt}`,
            ContentType.PNG,
            path.basename(s.path)
        );
    });
    this.reporter.screenshots = [];
};

module.exports = class AllureInterface {
    constructor(reporter, runtime) {
        this.__proto__ = new Allure(runtime);
        this.reporter = reporter;
        this.currentTest = reporter.currentTest;
        this.currentExecutable =
            this.reporter.currentStep || this.reporter.currentTest;
    }
};
