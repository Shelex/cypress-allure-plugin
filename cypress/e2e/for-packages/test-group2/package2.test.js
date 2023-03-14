describe('Allure results', () => {
    it('check package tab again', function () {
        cy.allure().tag('SkippedTag');
    });
});
