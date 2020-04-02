# cypress-allure-plugin

Plugin for integrating mocha-allure2 reporter in Cypress with support of Allure API.  
I would call current stage "early beta" or "POC", as still some features missing and polishing required.


## Installation

*  `yarn add cypress-allure-plugin`  OR  `npm install cypress-allure-plugin`
*  in your cypress/plugins/index.js file add Allure writer task:
```
const allureWriter = require('cypress-allure-plugin/writer')

module.exports = (on, config) => {
    allureWriter(on)
    return config
}
```
* in your cypress/support/index.js file connect plugin itself:
```
import 'cypress-allure-plugin';
// you can use require also:
require('cypress-allure-plugin');
```

## Execution

* to enable Allure results writing just pass environment variable `allure=true`, example:
```
npx cypress run --config video=false --env allure=true --browser chrome
```

## API

There is two options of using allure api inside tests:
1. Using interface constructor from `Cypress.Allure.reporter.getInterface()` - synchronous
```
const allure = Cypress.Allure.reporter.getInterface();
    allure.feature('This is our feature');
    allure.epic('This is epic');
    allure.issue('google', 'https://google.com');
```
2. Using Cypress custom commands, always starting from `cy.allure()` - chainer
```
cy.allure()
    .feature('This is feature')
    .epic('This is epic')
    .issue('google', 'https://google.com')
    .parameter('name', 'value')
    .tag('this is nice tag');
```

Allure API available: 
* epic(epic: string)
* feature(feature: string)
* story(story: string)
* suite(name: string)
* label(name: LabelName, value: string)
* parameter(name: string, value: string)
* link(url: string, name?: string, type?: LinkType)
* issue(name: string, url: string)
* tms(name: string, url: string)
* description(markdown: string)
* descriptionHtml(html: string)
* owner(owner: string)
* severity(severity: Severity)
* tag(tag: string)
* attachment(name: string, content: Buffer | string, type: ContentType)
* testAttachment(name: string, content: Buffer | string, type: ContentType)
* logStep(name: string, body?: Status | Function)

## Screenshots

Screenshots are attached automatically, for other type of content use `testAttachment` (inside test with cy chainer) or `attachment` (outside test with synchronous api)

## Roadmap
 * configure types for allure API
 * configure integration with cypress-cucumber-preprocessor to use gherkin tags instead of commands

## Credits

A lot of respect to [Sergey Korol](serhii.s.korol@gmail.com) who made [Allure-mocha](https://github.com/allure-framework/allure-js/tree/master/packages/allure-mocha) reporter. Major part of interaction from mocha to allure is based on that solution technically and ideologically.

## License

Copyright 2020 Oleksandr Shevtsov <ovr.shevtsov@gmail.com>.  This project is licensed under the Apache 2.0 License.  