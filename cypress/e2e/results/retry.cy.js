describe('Allure Retry', () => {
  let attept = 0;
  
  it('Test with Retries', { retries: 2 }, () => {
    attept++;
    cy.intercept('mytest.com', { body: `
    <html>
    <head></head>
    <body>
        <div>Testing text</div>
    </body>
    </html>
    `});
    
    cy.visit('mytest.com');
  
    cy.get('body').screenshot('test-retry-screenshot');
  
    if (attept < 3) {
      cy.wrap('Fail during test with retry').then(t => {
        throw new Error(t);
      });
    }
  })
});