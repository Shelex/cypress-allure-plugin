import { Category, ExecutorInfo } from 'allure-js-commons';

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
    | 'image/svg+xml'
    | 'image/png'
    | 'application/json'
    | 'video/webm'
    | 'video/mp4'
    | 'image/jpeg';
type Status = 'failed' | 'broken' | 'passed' | 'skipped';
type Severity = 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';

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
                    getInterface(): Allure;
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
             * add Suite
             * @param name
             */
            suite(name: string): Allure;
            /**
             * Add Label
             * @param name
             * @param value
             */
            label(name: LabelName, value: string): Allure;
            /**
             * Add Parameter
             * @param name
             * @param value
             */
            parameter(name: string, value: string): Allure;
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
             * Add test description in markdown format
             * @param markdown
             */
            description(markdown: string): Allure;
            /**
             * Add test description in html format
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
            tag(tag: string): Allure;
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
             * Log step into Test Execution Body
             * @param name - step name
             * @param isParent - log all commands into created step until next parent step, true by default
             */
            step(name: string, isParent: boolean): Allure;
            /**
             * Start allure step with specified name
             * @param name - name of step to create
             */
            startStep(name: string): Allure;
            /**
             * End last created allure step
             */
            endStep(): Allure;
        }
    }
}
