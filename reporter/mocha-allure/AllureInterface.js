/**
 * A lot of credit to Sergey Korol <serhii.s.korol@gmail.com> who made
 * Allure-mocha reporter: "https://github.com/allure-framework/allure-js/tree/master/packages/allure-mocha"
 */

const path = require('path');
const { Allure, Status, Stage, ContentType } = require('allure-js-commons');

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

// Process Cypress screenshots automatically
Allure.prototype.processScreenshots = function () {
    const { currentTest } = this;
    this.reporter.screenshots.forEach(function (s) {
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
            this.reporter.currentHook || this.reporter.currentTest;
        this.currentHook = this.reporter.currentHook;
    }
};
