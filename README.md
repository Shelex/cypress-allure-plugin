# cypress-allure-plugin

Plugin for integrating allure reporter in Cypress with support of Allure API.

## Installation

-   `yarn add @shelex/cypress-allure-plugin` OR `npm install @shelex/cypress-allure-plugin`
-   in your `cypress/plugins/index.js` file add Allure writer task:

```
const allureWriter = require('@shelex/cypress-allure-plugin/writer')

module.exports = (on, config) => {
    allureWriter(on)
    return config
}
```

-   in your `cypress/support/index.js` file connect plugin itself:

```
import '@shelex/cypress-allure-plugin';
// you can use require also:
require('@shelex/cypress-allure-plugin');
```

-   for IntelliSense (autocompletion) support in your IDE add:

```
/// <reference types="@shelex/cypress-allure-plugin" />
```

on top of your `cypress/plugins/index.js` file

-   You can setup baseURL for issue and tms links by adding environment variables:

```
--env issuePrefix=https://url-to-bug-tracking-system/task-,tmsPrefix=https://url-to-tms/tests/caseId-
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

With that you could pass just a path or task ID instead of using full url.

## Execution

-   to enable Allure results writing just pass environment variable `allure=true`, example:

```
npx cypress run --config video=false --env allure=true --browser chrome
```

## API

There are three options of using allure api inside tests:

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

Screenshots are attached automatically, for other type of content use `testAttachment` (inside test with cy chainer) or `attachment` (outside test with synchronous api)

## Roadmap

-   API cleanup as not all labels are needed inside test
-   Better steps lifecycle

## Examples

See [cypress-allure-plugin-example](https://github.com/Shelex/cypress-allure-plugin-example) project, which is already configured to use this plugin.

## Credits

A lot of respect to [Sergey Korol](serhii.s.korol@gmail.com) who made [Allure-mocha](https://github.com/allure-framework/allure-js/tree/master/packages/allure-mocha) reporter. Major part of interaction from mocha to allure is based on that solution technically and ideologically.

## License

Copyright 2020 Oleksandr Shevtsov <ovr.shevtsov@gmail.com>. This project is licensed under the Apache 2.0 License.
