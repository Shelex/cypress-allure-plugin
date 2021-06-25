/**
 * A lot of credit to Sergey Korol <serhii.s.korol@gmail.com> who made
 * Allure-mocha reporter: "https://github.com/allure-framework/allure-js/tree/master/packages/allure-mocha"
 */

const { Allure, Status, Stage } = require('@shelex/allure-js-commons-browser');

Allure.prototype.attachment = function (name, content, type) {
    const fileName = this.reporter.writeAttachment(content, type);
    this.currentExecutable.addAttachment(name, type, fileName);
};

Allure.prototype.testAttachment = function (name, content, type) {
    const fileName = this.reporter.writeAttachment(content, type);
    this.currentTest.addAttachment(name, type, fileName);
};

Allure.prototype.fileAttachment = function (name, path, type) {
    this.reporter.files.push({
        name: name,
        path: path,
        type: type,
        testName: this.reporter.testNameForAttachment
    });
};

Allure.prototype.writeExecutorInfo = function (info) {
    this.runtime.writer.executorInfo = info;
};

Allure.prototype.step = function (name, isParent = true) {
    const item = isParent
        ? this.currentTest
        : this.reporter.parentStep || this.currentHook || this.currentTest;

    const allureStep = item.startStep(name);
    if (isParent) {
        // finish previous parent step
        this.reporter.parentStep &&
            automaticallyEndStep(this, this.reporter.parentStep);
        this.reporter.parentStep = allureStep;
        this.reporter.pushStep(allureStep);
    } else {
        // finish previous step
        this.stepEnd();
        allureStep.stepResult.stage = Stage.FINISHED;
        allureStep.stepResult.status = Status.PASSED;
        this.reporter.pushStep(allureStep);
    }
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
    return step;
};

Allure.prototype.stepEnd = function () {
    // just find the last user created step and finish it
    const step = this.reporter.popStep();
    if (step) {
        automaticallyEndStep(this, step);
    }
};

Allure.prototype.parameter = function (name, value) {
    this.reporter.currentExecutable.addParameter(name, value);
};

Allure.prototype.testParameter = function (name, value) {
    this.reporter.currentTest.addParameter(name, value);
};

Allure.prototype.testName = function (name) {
    this.reporter.currentTest.addParameter('OverwriteTestName', name);
};

Allure.prototype.label = function (name, value) {
    if (this.reporter.currentTest) {
        const labelIndex = (name) =>
            this.reporter.currentTest.info.labels.findIndex(
                (label) => label.name === name
            );

        // by default allure not overwrite label value
        // so there is separate handling for existing labels
        if (labelIndex(name) === -1) {
            this.reporter.currentTest.addLabel(name, value);
        } else {
            this.reporter.currentTest.info.labels[labelIndex(name)] = {
                name,
                value
            };
        }
    } else {
        this.reporter.labelStorage.push({
            name,
            value
        });
    }
};

const automaticallyEndStep = (runtime, step) => {
    if (!step) {
        return;
    }
    const status = getStatus(runtime);
    step.stepResult.stage = Stage.FINISHED;
    step.stepResult.status = status;
    step.endStep();
};

const getStatus = (runtime) =>
    (!runtime.currentHook &&
        runtime.currentTest &&
        runtime.currentTest.info.status) ||
    Status.PASSED;

module.exports = class AllureInterface {
    constructor(reporter, runtime) {
        this.__proto__ = new Allure(runtime);
        this.reporter = reporter;
        this.currentTest = this.reporter.currentTest;
        this.currentExecutable = this.reporter.currentExecutable;
        this.currentHook = this.reporter.currentHook;
    }
};
