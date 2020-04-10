# cypress-allure-plugin

Plugin for integrating allure reporter in Cypress with support of Allure API.

## Installation

-   download

```
yarn add -D @shelex/cypress-allure-plugin
// OR
npm i -D @shelex/cypress-allure-plugin
```

-   in `cypress/plugins/index.js` file connect Allure writer task:

```
const allureWriter = require('@shelex/cypress-allure-plugin/writer')

module.exports = (on, config) => {
    allureWriter(on)
    return config
}
```

-   in `cypress/support/index.js` file connect plugin itself:

```
import '@shelex/cypress-allure-plugin';
// you can use require:
require('@shelex/cypress-allure-plugin');
```

-   for IntelliSense (autocompletion) support in your IDE add:

```
/// <reference types="@shelex/cypress-allure-plugin" />
```

on top of your `cypress/plugins/index.js` file

-   You can setup prefix url part for issue and tms links by adding environment variables:

```
--env issuePrefix=https://url-to-bug-tracking-system/task-,tmsPrefix=https://url-to-tms/tests/caseId-

// then in test:  cy.allure().issue('blockerIssue', 'AST-111')
// will result in https://url-to-bug-tracking-system/task-AST-111
```

OR set it in `cypress.json`

```cypress.json
{
    "env": {
        "tmsPrefix": "https://url-to-bug-tracking-system/task-",
        "issuePrefix": "https://url-to-tms/tests/caseId-"
    }
}
```

## Execution

-   to enable Allure results writing just pass environment variable `allure=true`, example:

```
npx cypress run --config video=false --env allure=true --browser chrome
```

-   to check what data is gathered, execute in cypress window with Chrome Developer tools console:

```
Cypress.Allure.reporter.runtime.writer
```

## API

There are three options of using allure api inside tests:

1. Using interface from `Cypress.Allure.reporter.getInterface()` - synchronous

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

3. Using Cypress-cucumber-preprocessor with cucumber tags:

```
@subSuite("someSubSuite")
@feature("nice")
@epic("thisisepic")
@story("cool")
@severity("critical")
@owner("IAMOwner")
@package("myPackage")
@issue("jira","PJD:1234")
@someOtherTagsWillBeAddedAlso
Scenario: Here is scenario
...
```

Allure API available:

-   epic(epic: string)
-   feature(feature: string)
-   story(story: string)
-   suite(name: string)
-   label(name: LabelName, value: string)
-   parameter(name: string, value: string)
-   link(url: string, name?: string, type?: LinkType)
-   issue(name: string, url: string)
-   tms(name: string, url: string)
-   description(markdown: string)
-   descriptionHtml(html: string)
-   owner(owner: string)
-   severity(severity: Severity)
-   tag(tag: string)
-   attachment(name: string, content: Buffer | string, type: ContentType)
-   testAttachment(name: string, content: Buffer | string, type: ContentType)
-   step(name: string, isParent: boolean)

## Screenshots

Screenshots are attached automatically, for other type of content use `testAttachment` (for current test) or `attachment` (for current executable)

## Examples

See [cypress-allure-plugin-example](https://github.com/Shelex/cypress-allure-plugin-example) project, which is already configured to use this plugin.

## Credits

A lot of respect to [Sergey Korol](serhii.s.korol@gmail.com) who made [Allure-mocha](https://github.com/allure-framework/allure-js/tree/master/packages/allure-mocha) reporter. Major part of interaction from mocha to allure is based on that solution technically and ideologically.

## License

Copyright 2020 Oleksandr Shevtsov <ovr.shevtsov@gmail.com>. This project is licensed under the Apache 2.0 License.
