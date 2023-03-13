describe('Allure results', () => {
    it('skip from inside (should be able to add tag)', function () {
        cy.allure().tag('SkippedTag');
        this.skip();
    });

    it.skip('skip by it.skip', () => {
        // no steps
    });

    xit('skip by xit', () => {
        // no steps
    });
});
