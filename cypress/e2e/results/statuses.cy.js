let results;

before(() => {
    cy.task('readAllureResults').then((r) => {
        results = r.statuses;
    });
});

describe('Allure retries', () => {
    const testByStatus = (status) =>
        results.tests.filter((test) => test.status === status);

    /**
     * @param {('retry'|'skipped')} kind
     */
    const suite = (kind) => {
        const kinds = {
            retry: 'Retry',
            skipped: 'skipped'
        };

        return results.suites.find((suite) => suite.name.includes(kinds[kind]));
    };

    /**
     * @param {('retry'|'skipped')} kind
     */
    const testsBySuite = (kind) => {
        const parent = suite(kind);
        return results.tests.filter((test) =>
            parent.children.includes(test.uuid)
        );
    };

    it('should have status suites recorded', () => {
        expect(results.suites).to.have.length(2);
    });

    it('should have retried tests connected to suites', () => {
        const retried = suite('retry');
        expect(retried.children).to.have.length(11);
    });

    it('should have skipped tests connected to suites', () => {
        const retried = suite('skipped');
        expect(retried.children).to.have.length(3);
    });

    it('should have retried test results', () => {
        const retried = testsBySuite('retry');
        expect(retried).to.have.length(11);
    });

    it('should have skipped test results', () => {
        const retried = testsBySuite('skipped');
        expect(retried).to.have.length(3);
    });

    it('should have set of unique tests and retries', () => {
        const retried = testsBySuite('retry');
        const testNames = retried.map((test) => test.name);
        const uniqueNames = Array.from(new Set(testNames));
        expect(uniqueNames).to.have.length(5);
    });

    it('should have attachments', () => {
        expect(results.attachments).to.have.length(25);
    });

    it('should have failed tests', () => {
        expect(testByStatus('failed')).to.have.length(8);
    });

    it('should have other tests in retry suite as passed', () => {
        expect(testByStatus('passed')).to.have.length(3);
    });

    it('should have skipped tests with proper status', () => {
        expect(testByStatus('skipped')).to.have.length(
            testsBySuite('skipped').length
        );
    });

    it('should have attachments included into tests', () => {
        const testAttachments = testsBySuite('retry')
            .map((test) => test.attachments.length)
            .reduce((a, b) => a + b, 0);
        expect(results.attachments).to.have.length(testAttachments);
    });
});
