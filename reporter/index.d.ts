import { Category, ExecutorInfo } from '@shelex/allure-js-commons-browser';

type LabelName =
    | 'AS_ID'
    | 'suite'
    | 'parentSuite'
    | 'subSuite'
    | 'epic'
    | 'feature'
    | 'story'
    | 'severity'
    | 'tag'
    | 'owner'
    | 'lead'
    | 'host'
    | 'thread'
    | 'testMethod'
    | 'testClass'
    | 'package'
    | 'framework'
    | 'language';
type LinkType = 'issue' | 'tms';
type ContentType =
    | 'text/plain'
    | 'application/xml'
    | 'text/csv'
    | 'text/tab-separated-values'
    | 'text/css'
    | 'text/uri-list'
    | 'text/html'
    | 'image/svg+xml'
    | 'image/png'
    | 'application/json'
    | 'video/webm'
    | 'video/mp4'
    | 'image/jpeg'
    | 'application/pdf'
    | 'application/zip';
type Status = 'failed' | 'broken' | 'passed' | 'skipped';
type Severity = 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';

interface SuiteLabelFunctionFileInfo {
    absolutePath: string;
    file: string;
    ext: string;
    name: string;
    folder: string;
}

declare global {
    namespace Cypress {
        interface Chainable {
            /**
             * Parent command to start interaction with Allure API
             */
            allure(): Allure;
        }

        interface Cypress {
            /**
             * Interface via Cypress global object
             */
            Allure: {
                reporter: {
                    getInterface(): Allure & SyncInterfaceSpecific;
                };
            };
        }

        interface Allure {
            /**
             * Add Epic name to Allure
             * @param {string} epic
             */
            epic(epic: string): Allure;
            /**
             * add feature
             * @param {string} feature
             */
            feature(feature: string): Allure;
            /**
             * add Story name
             * @param story
             */
            story(story: string): Allure;
            /**
             * add parent Suite
             * @param name
             */
            parentSuite(name: string): Allure;
            /**
             * add Suite
             * @param name
             */
            suite(name: string): Allure;
            /**
             * add child Suite
             * @param name
             */
            subSuite(name: string): Allure;
            /**
             * Add Label
             * @param name
             * @param value
             */
            label(name: LabelName, value: string): Allure;
            /**
             * Add Parameter for current executable (step/test)
             * @param name
             * @param value
             */
            parameter(name: string, value: string): Allure;
            /**
             * Add Parameter for current test
             * @param name
             * @param value
             */
            testParameter(name: string, value: string): Allure;
            /**
             * Add customized link
             * @param {string} url
             * @param {string} name
             * @param type
             */
            link(url: string, name?: string, type?: LinkType): Allure;
            /**
             * Add issue link
             * @param name
             * @param url
             */
            issue(name: string, url: string): Allure;
            /**
             * Add test management system link
             * @param name
             * @param url
             */
            tms(name: string, url: string): Allure;
            /**
             * Add test description in markdown format for step/test
             * @param markdown
             */
            description(markdown: string): Allure;
            /**
             * Add test description in html format for step/test
             * @param html
             */
            descriptionHtml(html: string): Allure;
            /**
             * Add test owner
             * @param owner
             */
            owner(owner: string): Allure;
            /**
             * Add severity level
             * @param severity
             */
            severity(severity: Severity): Allure;
            /**
             * Add tag
             * @param tag
             */
            tag(...tags: string[]): Allure;
            /**
             * Add test case ID from Allure TestOps to link automated test
             */
            testID(id: string): Allure;
            /**
             * Overwrite test name for report.
             * Will be applied when results are stored to allure-results folder
             * @param name
             */
            testName(name: string): Allure;
            /**
             * Attach environmental info
             * @param info - <key, value> format
             */
            writeEnvironmentInfo(info: Record<string, string>): Allure;
            /**
             * Attach test categories failures definition
             * @param categories
             */
            writeCategoriesDefinitions(categories: Category[]): Allure;
            /**
             * Attach executor information
             * @param info executor information
             */
            writeExecutorInfo(info: ExecutorInfo): Allure;
            /**
             * Attachment to current executable item (hook, test)
             * @param name
             * @param content
             * @param type
             */
            attachment(
                name: string,
                content: Buffer | string,
                type: ContentType
            ): Allure;
            /**
             * Add attachment for current test
             * In case no test - it will use hook as fallback
             * (Screenshots are attached automatically)
             * @param name
             * @param content
             * @param type
             */
            testAttachment(
                name: string,
                content: Buffer | string,
                type: ContentType
            ): Allure;
            /**
             * Attach existing file to current test
             * @param name
             * @param path
             * @param type
             */
            fileAttachment(
                name: string,
                path: string,
                type: ContentType
            ): Allure;
            /**
             * Log step into Test Execution Body
             * @param name - step name
             * @param isParent - log all commands into created step until next parent step, true by default
             */
            step(name: string, isParent: boolean): Allure;
            /**
             * Log step, alias for `step(name, false)`
             * @param name - step name
             */
            logStep(name: string): Allure;
            /**
             * Start allure step with specified name
             * @param name - name of step to create
             */
            startStep(name: string): Allure;
            /**
             * End last created allure step
             */
            endStep(): Allure;

            /**
             * Turn on and off logging cypress commands as allure steps
             * `true` by default
             */
            logCommandSteps(enabled?: boolean): Allure;
        }

        interface SyncInterfaceSpecific {
            /**
             * Pass function for custom processing of suite labels
             */
            defineSuiteLabels(
                fn: (
                    titlePath: string[],
                    fileInfo: SuiteLabelFunctionFileInfo
                ) => string[]
            ): void;

            /**
             * Specify string which will be used to calculate historyId for test
             */
            defineHistoryId(fn: (testTitle: string, fullTitle: string) => string): void;
        }
    }
}
