describe('Allure Retry', () => {
    const html = `
    <html>
    <head></head>
    <body>
        <div>Testing text</div>
    </body>
    </html>
    `;

    it('Test with Retries', { retries: 2 }, function () {
        cy.intercept('mytest.com', { body: html });
        cy.visit('mytest.com');
        cy.get('body').screenshot('test-retry-screenshot');
        cy.allure().attachment('someFile.txt', 'data', 'text/plain');
        if (this.test._currentRetry < this.test.retries()) {
            cy.wrap('Fail during test with retry').then((t) => {
                throw new Error(t);
            });
        }
    });

    it(
        'Test with Retries (no screenshots for retries)',
        {
            retries: 2,
            env: {
                allureOmitPreviousAttemptScreenshots: true
            }
        },
        function () {
            cy.intercept('mytest.com', { body: html });
            cy.visit('mytest.com');
            cy.get('body').screenshot('test-retry-screenshot');

            if (this.test._currentRetry < this.test.retries()) {
                cy.wrap('Fail during test with retry').then((t) => {
                    throw new Error(t);
                });
            }
        }
    );

    it(
        'Test with Retries - fail (no screenshots for retries)',
        {
            retries: 2,
            env: {
                allureOmitPreviousAttemptScreenshots: true
            }
        },
        function () {
            cy.intercept('mytest.com', { body: html });
            cy.visit('mytest.com');
            cy.get('body').screenshot('test-retry-screenshot');

            cy.allure().attachment('someFile.txt', 'data', 'text/plain');
            cy.wrap('Fail during test with retry').then((t) => {
                throw new Error(t);
            });
        }
    );

    it('passed Test no Retries', () => {
        cy.intercept('mytest.com', { body: html });
        cy.visit('mytest.com');
        cy.get('body').screenshot('test-screenshot');
    });

    it('Failed Test no Retries', function () {
        cy.intercept('mytest.com', { body: html });
        cy.visit('mytest.com');
        cy.get('body').screenshot('test-screenshot');
        cy.wrap('Fail during test with retry').then((t) => {
            throw new Error(t);
        });
    });
});
