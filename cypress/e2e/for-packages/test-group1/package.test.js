describe('Allure results', () => {
    it('check package tab', function () {
        cy.allure().tag('SkippedTag');
    });
});
