# cypress-allure-plugin

> Plugin for integrating allure reporter in Cypress with support of Allure API.

![Build][gh-image]
[![semantic-release][semantic-image]][semantic-url]
[![version][version-image]][npm-url]
[![License][license-image]][license-url]  
[![Publish Size][size-image]][npm-url]
[![Downloads][downloads-image]][npm-url]
[![Types][types-image]][types-path]

## Installation

-   [Allure reporter](https://docs.qameta.io/allure/#_get_started): [java package](https://github.com/allure-framework/allure2#download) or [allure-commandline npm package](https://www.npmjs.com/package/allure-commandline).

-   [Java 8](https://www.oracle.com/java/technologies/javase-jdk8-downloads.html)

-   There is no need to set this plugin as reporter in Cypress or use any other allure reporters. Just download:

```bash
yarn add -D @shelex/cypress-allure-plugin
// OR
npm i -D @shelex/cypress-allure-plugin
```

## Configuration

-   Connect plugin in `cypress/plugins/index.js` in order to add Allure writer task:

```js
const allureWriter = require('@shelex/cypress-allure-plugin/writer');

module.exports = (on, config) => {
    allureWriter(on, config);
    return config;
};

// if you have webpack or other ts preprocessors:

module.exports = (on) => {
    on('file:preprocessor', webpackPreprocessor);
    allureWriter(on, config);
    return config;
};
```

-   Register commands in `cypress/support/index.js` file:

```js
import '@shelex/cypress-allure-plugin';
// you can use require:
require('@shelex/cypress-allure-plugin');
```

-   for IntelliSense (autocompletion) support in your IDE add on top of your `cypress/plugins/index.js` file:

```js
/// <reference types="@shelex/cypress-allure-plugin" />
```

or in case you are using typescript, update your tsconfig.json:

```json
"include": [
   "../node_modules/@shelex/cypress-allure-plugin/reporter",
   "../node_modules/cypress"
 ]
```

-   You can customize allure-results folder by passing `allureResultsPath` env variable.  
    `cypress.json`:

```json
{
    "env": {
        "allureResultsPath": "someFolder/results"
    }
}
```

or via command line:

```js
yarn cypress run --env allure=true,allureResultsPath=someFolder/results
```

-   You can setup prefix for issue and tms links by adding env variables:

```bash
--env issuePrefix=https://url-to-bug-tracking-system/task-,tmsPrefix=https://url-to-tms/tests/caseId-

# usage:  cy.allure().issue('blockerIssue', 'AST-111')
# result: https://url-to-bug-tracking-system/task-AST-111
```

or use `cypress.json`:

```json
{
    "env": {
        "tmsPrefix": "https://url-to-bug-tracking-system/task-",
        "issuePrefix": "https://url-to-tms/tests/caseId-"
    }
}
```

## Execution

-   be sure your docker or local browser versions are next: Chrome 71+, Edge 79+. Firefox 65+

-   plugin might not be applied to older Cypress versions, 4+ is recommended

-   to enable Allure results writing just pass environment variable `allure=true`, example:

```
npx cypress run --config video=false --env allure=true --browser chrome
```

-   if allure is enabled, you can check gathered data, in cypress window with Chrome Developer tools console:

```
Cypress.Allure.reporter.runtime.writer
```

## Examples

See [cypress-allure-plugin-example](https://github.com/Shelex/cypress-allure-plugin-example) project, which is already configured to use this plugin, hosting report as github page and run by github action. It has configuration for basic allure history saving (just having numbers and statuses in trends and history).  
For complete history (allure can display 20 build results ) with links to older reports and links to CI builds check [cypress-allure-historical-example](https://github.com/Shelex/cypress-allure-historical-example) with basic and straightforward idea how to achieve it.

## How to open report

Assuming allure is already installed:

-   generate new report based on current "allure-results" folder: `allure generate`
-   open generated report from "allure-report" folder: `allure open`

## API

There are three options of using allure api inside tests:

1. Using interface from `Cypress.Allure.reporter.getInterface()` - synchronous

```js
const allure = Cypress.Allure.reporter.getInterface();
allure.feature('This is our feature');
allure.epic('This is epic');
allure.issue('google', 'https://google.com');
```

2. Using Cypress custom commands, always starting from `cy.allure()` - chainer

```js
cy.allure()
    .feature('This is feature')
    .epic('This is epic')
    .issue('google', 'https://google.com')
    .parameter('name', 'value')
    .tag('this is nice tag');
```

3. Using Cypress-cucumber-preprocessor with cucumber tags:

```feature
@subSuite("someSubSuite")
@feature("nice")
@epic("thisisepic")
@story("cool")
@severity("critical")
@owner("IAMOwner")
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
-   startStep(name: string)
-   endStep()
-   step(name: string, isParent: boolean)

It may be assumed that Allure API method used in hooks (before/after all/each) would be applied to all/each test, but actually it is dealing with current allure executable (current test or hook) and obviously will not work. In case you need such behaviour it is better to try `test:before:run` or `test:after:run` cypress events to do so, when Allure interface commands will be applied to current test.

## VS Code for cypress + cucumber

In case you are using VS Code and [Cypress Helper](https://marketplace.visualstudio.com/items?itemName=Shelex.vscode-cy-helper) extension, it has configuration for allure cucumber tags autocompletion available:

```js
"cypressHelper.cucumberTagsAutocomplete": {
        "enable": true,
        "allurePlugin": true,
        "tags": ["focus", "someOtherTag"]
    }
```

## Screenshots

Screenshots are attached automatically, for other type of content use `testAttachment` (for current test) or `attachment` (for current executable)

## Cypress commands

Commands are producing allure steps automatically based on cypress events and are trying to represent how code and custom commands are executed with nested structure.  
Moreover, steps functionality could be expanded with:

-   `cy.allure().step('name')` - will create step "name" for current test. This step will be finished when next step is created or test is finished.
-   `cy.allure().step('name', false)` - will create step "name" for current parent step (like previous one, without passing `false` as second argument) or current hook/test. Will be finished when next step is created or test finished.
-   `cy.allure().startStep('name')` - will create step "name" for current cypress command step / current step / current parent step / current hook or test. Is automatically finished on fail event or test end, but I would recommend to explicitly mention `cy.allure().endStep()` which will finish last created step.

## Testing

-   `yarn test:prepare:basic` - generate allure results for tests in `cypress/integration/basic`folder
-   `yarn test:prepare:cucumber` - generate allure results for tests in `cypress/integration/cucumber` folder
-   `test` - run tests from `cypress/integration/results` against these allure results

## Credits

A lot of respect to [Sergey Korol](serhii.s.korol@gmail.com) who made [Allure-mocha](https://github.com/allure-framework/allure-js/tree/master/packages/allure-mocha) reporter. Major part of interaction from mocha to allure is based on that solution technically and ideologically.

## License

Copyright 2020 Oleksandr Shevtsov <ovr.shevtsov@gmail.com>.  
This project is licensed under the Apache 2.0 License.

[npm-url]: https://npmjs.com/package/@shelex/cypress-allure-plugin
[gh-image]: https://github.com/Shelex/cypress-allure-plugin/workflows/build/badge.svg?branch=master
[types-path]: ./reporter/index.d.ts
[semantic-image]: https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg
[semantic-url]: https://github.com/semantic-release/semantic-release
[license-image]: https://img.shields.io/badge/License-Apache%202.0-blue.svg
[license-url]: https://opensource.org/licenses/Apache-2.0
[version-image]: https://badgen.net/npm/v/@shelex/cypress-allure-plugin/latest
[size-image]: https://badgen.net/packagephobia/publish/@shelex/cypress-allure-plugin
[downloads-image]: https://badgen.net/npm/dt/@shelex/cypress-allure-plugin
[types-image]: https://badgen.net/npm/types/@shelex/cypress-allure-plugin
