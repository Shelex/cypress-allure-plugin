/**
 * A lot of credit to Sergey Korol <serhii.s.korol@gmail.com> who made
 * Allure-mocha reporter: "https://github.com/allure-framework/allure-js/tree/master/packages/allure-mocha"
 */

const { Allure, Status, Stage } = require('allure-js-commons');

Allure.prototype.attachment = function (name, content, type) {
    const fileName = this.reporter.writeAttachment(content, type);
    this.currentExecutable.addAttachment(name, type, fileName);
};

Allure.prototype.testAttachment = function (name, content, type) {
    const fileName = this.reporter.writeAttachment(content, type);
    this.currentTest.addAttachment(name, type, fileName);
};

Allure.prototype.writeExecutorInfo = function (info) {
    this.runtime.writer.executorInfo = info;
};

Allure.prototype.step = function (name, isParent = true) {
    const item = isParent
        ? this.currentTest
        : this.reporter.parentStep || this.currentHook || this.currentTest;
    this.reporter.finishAllSteps();
    const allureStep = item.startStep(name);
    isParent
        ? (this.reporter.parentStep = allureStep)
        : (allureStep.stepResult.stage = Stage.FINISHED) &&
          (allureStep.stepResult.status = Status.PASSED) &&
          this.reporter.pushStep(allureStep);
};

Allure.prototype.stepStart = function (name) {
    // define last chainer that still not finished and has allure step
    const chainer = this.reporter.commands
        .reverse()
        .find((c) => !c.finished && c.step && c.step.info.name);

    // define fallback allure executable
    const previousExecutable =
        this.reporter.currentStep ||
        this.reporter.parentStep ||
        this.currentHook ||
        this.currentTest;

    // in case chaner step is newer then allure fallback executable - use chainer step for creating new
    const executable =
        chainer && chainer.step.info.start > previousExecutable.info.start
            ? chainer.step
            : previousExecutable;

    const step = executable.startStep(name);
    this.reporter.pushStep(step);
};

Allure.prototype.stepEnd = function () {
    // just find the last user created step and finish it
    const step = this.reporter.popStep();
    if (step) {
        step.stepResult.stage = Stage.FINISHED;
        step.stepResult.status =
            (this.currentTest && this.currentTest.info.status) || Status.PASSED;

        step.endStep();
    }
};

module.exports = class AllureInterface {
    constructor(reporter, runtime) {
        this.__proto__ = new Allure(runtime);
        this.reporter = reporter;
        this.currentTest = reporter.currentTest;
        this.currentExecutable = this.reporter.currentExecutable;
        this.currentHook = this.reporter.currentHook;
    }
};
