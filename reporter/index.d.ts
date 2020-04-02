import { Category, ContentType, Status, Severity, LinkType, LabelName } from 'allure-js-commons'

declare namespace Cypress {
    interface Chainable {
        /**
         * Get access to allure reporter interface
         */
        allure(): Chainable

        epic(epic: string): Chainable;
        feature(feature: string): Chainable;
        story(story: string): Chainable;
        suite(name: string): Chainable;
        label(name: LabelName, value: string): Chainable;
        parameter(name: string, value: string): Chainable;
        link(url: string, name?: string, type?: LinkType): Chainable;
        issue(name: string, url: string): Chainable;
        tms(name: string, url: string): Chainable;
        description(markdown: string): Chainable;
        descriptionHtml(html: string): Chainable;
        owner(owner: string): Chainable;
        severity(severity: Severity): Chainable;
        tag(tag: string): Chainable;
        writeEnvironmentInfo(info: Record<string, string>): Chainable;
        writeCategoriesDefinitions(categories: Category[]): Chainable;
        attachment(name: string, content: Buffer | string, type: ContentType): Chainable;
        testAttachment(name: string, content: Buffer | string, type: ContentType): Chainable;
        logStep(name: string, body?: Status | Function): Chainable;
    }
}
