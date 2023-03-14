let results;

before(() => {
    cy.task('readAllureResults').then((r) => {
        results = r.retries;
    });
});

describe('Allure retries', () => {
    const testByStatus = (status) =>
        results.tests.filter((test) => test.status === status);

    it('should have one suite', () => {
        expect(results.suites).to.have.length(1);
    });

    it('should have test results', () => {
        expect(results.tests).to.have.length(11);
    });

    it('should have set of unique tests and retries', () => {
        const testNames = results.tests.map((test) => test.name);
        const uniqueNames = Array.from(new Set(testNames));
        expect(uniqueNames).to.have.length(5);
    });

    it('should have attachments', () => {
        expect(results.attachments).to.have.length(25);
    });

    it('should have failed tests', () => {
        expect(testByStatus('failed')).to.have.length(8);
    });

    it('should have other tests as passed', () => {
        expect(testByStatus('passed')).to.have.length(3);
    });

    it('should have attachments included into tests', () => {
        const testAttachments = results.tests
            .map((test) => test.attachments.length)
            .reduce((a, b) => a + b, 0);
        expect(results.attachments).to.have.length(testAttachments);
    });
});
