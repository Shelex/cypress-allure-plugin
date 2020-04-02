/**
 * A lot of credit to Sergey Korol <serhii.s.korol@gmail.com> who made
 * Allure-mocha reporter: "https://github.com/allure-framework/allure-js/tree/master/packages/allure-mocha"
 */

module.exports = class StepWrapper {
    constructor(reporter, step) {
        this.reporter = reporter;
        this.step = step;
    }

    startStep(name) {
        const step = this.step.startStep(name);
        this.reporter.pushStep(step);
        return new StepWrapper(this.reporter, step);
    }

    endStep() {
        this.reporter.popStep();
        this.step.endStep();
    }

    run(body) {
        return this.step.wrap(body)();
    }
};
