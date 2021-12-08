const {
    Allure,
    Status,
    Stage,
    LabelName
} = require('@shelex/allure-js-commons-browser');

Allure.prototype.tag = function (...tags) {
    tags.forEach((tag) => {
        this.currentTest.addLabel(LabelName.TAG, tag);
    });
};

Allure.prototype.attachment = function (name, content, type) {
    const fileName = this.reporter.writeAttachment(content, type);
    this.currentExecutable.addAttachment(name, type, fileName);
};

Allure.prototype.testAttachment = function (name, content, type) {
    const fileName = this.reporter.writeAttachment(content, type);
    const executable = this.currentTest || this.currentHook;
    executable.addAttachment(name, type, fileName);
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
        ? this.currentTest || this.currentHook
        : this.reporter.parentStep || this.currentHook || this.currentTest;

    const allureStep = item.startStep(name);
    if (isParent) {
        // finish previous parent step and child steps
        this.reporter.finishRemainingSteps();
        this.reporter.parentStep = allureStep;
    } else {
        // finish previous step only
        this.stepEnd();
        allureStep.stepResult.stage = Stage.FINISHED;
        allureStep.stepResult.status = Status.PASSED;
    }
    this.reporter.pushStep(allureStep);
};

Allure.prototype.stepStart = function (name) {
    // define last chainer that still not finished and has allure step
    const chainer = this.reporter.cy.chain.getLatestWithStep();

    // define fallback allure executable
    const previousExecutable = this.currentExecutable;

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
        if (step.status !== Status.FAILED) {
            const status = getStatus(this);
            step.stepResult.status = status;
        }
        step.stepResult.stage = Stage.FINISHED;
        step.endStep();
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
