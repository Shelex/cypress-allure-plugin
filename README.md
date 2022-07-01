# cypress-allure-plugin

[![SWUbanner](https://raw.githubusercontent.com/vshymanskyy/StandWithUkraine/main/banner2-direct.svg)](https://vshymanskyy.github.io/StandWithUkraine/)

> Plugin for integrating allure reporter in Cypress with support of Allure API.

![Build][gh-image]
[![Downloads][downloads-image]][npm-url]
[![semantic-release][semantic-image]][semantic-url]  
[![version][version-image]][npm-url]
[![License][license-image]][license-url]

## Installation

-   [Allure binary](https://docs.qameta.io/allure/#_get_started): [directly from allure2](https://github.com/allure-framework/allure2#download) or [allure-commandline npm package](https://www.npmjs.com/package/allure-commandline).

-   [Java 8](https://www.oracle.com/java/technologies/javase-jdk8-downloads.html) (required to run allure binary)

-   There is no need to set this plugin as reporter in Cypress or use any other allure reporters. Just download:

    -   using yarn:

    ```bash
    yarn add -D @shelex/cypress-allure-plugin
    ```

    -   using npm:

    ```
    npm i -D @shelex/cypress-allure-plugin
    ```

## Setup

-  (Before Cypress 10) Connect plugin in `cypress/plugins/index.js`. Take into account that Cypress generate plugins file with `module.exports` on the first initialization but you should have only one export section. In order to add Allure writer task just replace it or add writer task somewhere before returning config:

    ```js
    const allureWriter = require('@shelex/cypress-allure-plugin/writer');
    // import allureWriter from "@shelex/cypress-allure-plugin/writer";

    module.exports = (on, config) => {
        allureWriter(on, config);
        return config;
    };
    ```

- (After Cypress 10) Use `defineConfig` and `setupNodeEvents` inside config.js\config.ts files:

    ```js
    module.exports = defineConfig({
        e2e: {
            setupNodeEvents(on, config) {
                AllureWriter(on, config);
                return config;
            }
        }
    });
    ```

    -   if you have webpack or other preprocessors 
        - (Before Cypress 10) please set allure writer before returning "config":

        ```js
        module.exports = (on, config) => {
            on('file:preprocessor', webpackPreprocessor);
            allureWriter(on, config);
            return config;
        };
        ```

        - (After Cypress 10) use `defineConfig` and `setupNodeEvents` inside config.js\config.ts files:
    
        ```js
        module.exports = defineConfig({
            e2e: {
                setupNodeEvents(on, config) {
                    on('file:preprocessor', webpackPreprocessor);
                    AllureWriter(on, config);
                    return config;
                }
            }
        });
        ```

-   Register commands in `cypress/support/index.js` (or `cypress/support/e2e.js` for cypress 10+) file:

    -   with `import`:

    ```js
    import '@shelex/cypress-allure-plugin';
    ```

    -   with `require`:

    ```js
    require('@shelex/cypress-allure-plugin');
    ```

-   for IntelliSense (autocompletion) support in your IDE add `tsconfig.json` and specify `types` property for `compilerOptions`:

```json
 "compilerOptions": {
        "allowJs": true,
        "baseUrl": "./",
        "types": ["@shelex/cypress-allure-plugin"],
        "noEmit": true
    },
```

## Configuration

Plugin is customizable via Cypress environment variables:

| env variable name                      | description                                                                                              | default                                                     |
| :------------------------------------- | :------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------- |
| `allure`                               | enable Allure plugin                                                                                     | false                                                       |
| `allureResultsPath `                   | customize path to allure results folder                                                                  | `allure-results`                                            |
| `tmsPrefix`                            | just a prefix substring or pattern with `*` for links from allure API in tests to test management system | ``                                                          |
| `issuePrefix`                          | prefix for links from allure API in tests to bug tracking system                                         | ``                                                          |
| `allureLogCypress`                     | log cypress chainer (commands) and display them as steps in report                                       | true                                                        |
| `allureLogGherkin`                     | log gherkin steps from cucumber-preprocessor                                                             | inherits `allureLogCypress` value if not specified directly |
| `allureAttachRequests`                 | attach `cy.request` headers, body, response headers, respose body to step automatically                  | false                                                       |
| `allureOmitPreviousAttemptScreenshots` | omit screenshots attached in previous attempts when retries are used                                     | false                                                       |
| `allureSkipAutomaticScreenshots`       | do not add screenshots automatically (for those who uses custom scripts, etc.)                           | false                                                       |
| `allureClearSkippedTests`              | remove skipped tests from report                                                                         | false                                                       |
| `allureAddAnalyticLabels`              | add framework and language labels to tests (used for allure analytics only)                              | false                                                       |
| `allureAddVideoOnPass`                 | attach video to report for passed tests                                                                  | false                                                       |

These options could be passed in multiple ways, you can check [docs](https://docs.cypress.io/guides/guides/environment-variables#Setting).
But also you can use `allure.properties` file (but you still need to enable allure by passing `allure=true` to cypress env variables):
    
```bash
allure.results.directory=custom_dir
allure.link.issue.pattern=https://example.com/task_
allure.link.tms.pattern=https://example.com/test_case_
allure.cypress.log.commands=true
allure.cypress.log.requests=true
allure.cypress.log.gherkin=true
allure.omit.previous.attempt.screenshot=true
allure.analytics=false
allure.video.passed=false
```

## Execution

- To enable Allure results writing just pass environment variable `allure=true`, example:

```bash
npx cypress run --env allure=true
```

-   if allure is enabled, you can check gathered data, in cypress window with Chrome Developer tools console:

```js
Cypress.Allure.reporter.runtime.writer;
```

## Debugging

-   for in-browser information (cypress events, mocha events, allure events, data collecting)
    execute `localStorage.debug = 'allure-plugin*'` in DevTools console
-   for writer task information (writing results to disk, handling attachments, plugin events)
    add `DEBUG=allure-plugin*` before cypress run\open command

## Examples

See [cypress-allure-plugin-example](https://github.com/Shelex/cypress-allure-plugin-example) project, which is already configured to use this plugin, hosting report as github page and run by github action. It has configuration with complete history (allure can display 20 build results ) with links to older reports and links to CI builds.

There are also existing solutions that may help you prepare your report infrastructure:

-   [Allure docker service](https://github.com/fescobar/allure-docker-service) - highly customizable feature-rich container
-   [Allure Server](https://github.com/kochetkov-ma/allure-server) - self-hosted portal with your reports
-   [allure-reports-portal](https://github.com/pumano/allure-reports-portal) - another portal which allows to gather reports for multiple projects in single ui
-   [allure-static-booster](https://gitlab.com/seitar/allure-static-booster/-/tree/master/) - solution for generating self-hosted Allure report on GitLab pages including the tables with results, pipeline links and navigation between the different Allure reports.
-   [Github Action](https://github.com/simple-elf/allure-report-action) - report generation + better implementation for historic reports described above
-   [Allure TestOps](https://docs.qameta.io/allure-testops/) - Allure portal for those who want more than report

## How to open report

Assuming allure is already installed:

-   serve report based on current "allure-results" folder: `allure serve`
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
    .tag('this is nice tag', 'as well as this');
```

3. Using Cypress-cucumber-preprocessor with cucumber tags:

```feature
@AS_ID("id_of_test_for_testops")
@parentSuite("someParentSuite")
@suite("someSuite")
@subSuite("someSubSuite")
@epic("thisisepic")
@feature("nice")
@story("cool")
@severity("critical")
@owner("IAMOwner")
@issue("jira","JIRA-1234")
@tms("tms","TC-1234")
@link("other","url")
@someOtherTagsWillBeAddedAlso
Scenario: Here is scenario
...
```

Allure API available:

-   testID(id: string)
-   epic(epic: string)
-   feature(feature: string)
-   story(story: string)
-   parentSuite(name: string)
-   suite(name: string)
-   subSuite(name:string)
-   label(name: LabelName, value: string)
-   parameter(name: string, value: string)
-   testParameter(name: string, value: string)
-   testName(name: string)
-   link(url: string, name?: string, type?: LinkType)
-   issue(name: string, url: string)
-   tms(name: string, url: string)
-   description(markdown: string)
-   descriptionHtml(html: string)
-   owner(owner: string)
-   severity(severity: Severity)
-   tag(tags: ...string)
-   attachment(name: string, content: Buffer | string, type: ContentType)
-   testAttachment(name: string, content: Buffer | string, type: ContentType)
-   fileAttachment(name: string, path: string, type: ContentType)
-   startStep(name: string)
-   endStep()
-   step(name: string, isParent: boolean)
-   logStep(name: string)

## Gherkin and tms or issue links

It is posible to pass tms link or issue link with tags `tms("ABC-111")` and `issue("ABC-222")`.
However, that will not work well with Scenario Outlines which may have different examples being linked to different tasks or test cases in tms.
So, plugin will also parse your scenario outlines with examples and in case header in table will be `tms` or `issue` - it will add it as link to report.

```gherkin
    Scenario Outline: Some scenario
        Given User want to link test <number> to tms
        When User creates examples table with tms and issue headers
        Then Links will be added to allure
        Examples:
            | tms    | issue   | number |
            | TEST-1 | JIRA-11 | 1      |
            | TEST-2 | JIRA-22 | 2      |
```

## VS Code for cypress + cucumber

In case you are using VS Code and [Cypress Helper](https://marketplace.visualstudio.com/items?itemName=Shelex.vscode-cy-helper) extension, it has configuration for allure cucumber tags autocompletion available:

```js
"cypressHelper.cucumberTagsAutocomplete": {
        "enable": true,
        "allurePlugin": true,
        "tags": ["focus", "someOtherTag"]
    }
```

## Screenshots and Videos

Screenshots are attached automatically, for other type of content feel free to use `testAttachment` (for current test), `attachment` (for current executable), `fileAttachment` (for existing file).
Videos are attached for failed tests only from path specified in cypress config `videosFolder` and in case you have not passed `video=false` to Cypress configuration.

### Before version 2.21.0

In case you want to attach videos for passed tests please use `allureAddVideoOnPass=true` env variable.

Videos are quite tricky as Cypress has no events which we can use to catch event with video name as it is processed when test runner itself (cy) has closed.
As a workaround we can add video link before even video is saved and then we have two options:

1. `videosFolder` is set as `allure-results` (or custom value you can pass as `allureResultsPath`) in cypress.json or configuration options.
   in this case video is written directly in allure-results and will be linked by name.
2. `videosFolder` is outside `allure-results`
   relative path from `allure-report` to `videosFolder` will be added.

Please take into account, that in case spec files have same name, cypress is creating subfolders in videos folder, and it is not handled from plugin unfortunately, so video may not have correct path in such edge case.

### Update in version 2.21.0

As Cypress has released [After Spec API](https://docs.cypress.io/api/plugins/after-spec-api) now this event could be evaluated for attachments.
Now it will be used for:

-   run mode with v6.7.0 and above
-   run mode with v6.2.0 and above (but below v6.7.0) with `experimentalRunEvents` enabled
-   interactive (open) mode for v7.1.0 with `experimentalInteractiveRunEvents` enabled
    When one of this conditions is satisfied - `after:spec` event will be used for attachments. It will reliably copy all screenshots available for each test and video (if available) to your `allure-results` folder and attach to each of your tests, so you don't need to somehow upload your videos and configure paths, etc.

## Cypress commands as steps

Commands are producing allure steps automatically based on cypress events and are trying to represent how code and custom commands are executed with nested structure.  
Moreover, steps functionality could be expanded with:

-   `cy.allure().step('name')` - will create step "name" for current test. This step will be finished when next such step is created or test is finished.
-   `cy.allure().step('name', false)` OR `cy.allure().logStep('name')` - will create step "name" for current parent step/hook/test. Will be finished when next step is created or test finished.
-   `cy.allure().startStep('name')` - will create step "name" for current cypress command step / current step / current parent step / current hook or test. Is automatically finished on fail event or test end, but I would recommend to explicitly mention `cy.allure().endStep()` which will finish last created step.

## Testing

-   `yarn test:prepare:basic` - generate allure results for tests in `cypress/integration/basic`folder
-   `yarn test:prepare:cucumber` - generate allure results for tests in `cypress/integration/cucumber` folder
-   `test` - run tests from `cypress/integration/results` against these allure results

## Credits

A lot of respect to [Sergey Korol](serhii.s.korol@gmail.com) who made [Allure-mocha](https://github.com/allure-framework/allure-js/tree/master/packages/allure-mocha) reporter. Base integration with Cypress internal mocha runner is based on that solution.

## License

Copyright 2020-2022 Oleksandr Shevtsov <ovr.shevtsov@gmail.com>.  
This project is licensed under the Apache 2.0 License.

[npm-url]: https://npmjs.com/package/@shelex/cypress-allure-plugin
[gh-image]: https://github.com/Shelex/cypress-allure-plugin/workflows/build/badge.svg?branch=master
[types-path]: ./reporter/index.d.ts
[semantic-image]: https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg
[semantic-url]: https://github.com/semantic-release/semantic-release
[license-image]: https://img.shields.io/badge/License-Apache%202.0-blue.svg
[license-url]: https://opensource.org/licenses/Apache-2.0
[version-image]: https://badgen.net/npm/v/@shelex/cypress-allure-plugin/latest
[downloads-image]: https://badgen.net/npm/dt/@shelex/cypress-allure-plugin
