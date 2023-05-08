let result;

before(() => {
    cy.task('readAllureResults').then((r) => {
        result = r;
    });
});

describe('Allure results', () => {
    ['basic', 'cucumber'].forEach((mode) => {
        it(`should contain suite results for ${mode}`, () => {
            const { suites, tests } = result[mode];
            expect(suites).to.have.length(1);
            expect(suites[0].children).to.have.length(mode === 'basic' ? 4 : 1);
            expect(
                tests.every((t) =>
                    suites.find((s) => s.children.includes(t.uuid))
                )
            ).to.be.eq(true, 'every test is linked to suite by uuid');
        });

        it(`should contain before all and after all hooks for ${mode}`, () => {
            const [suite] = result[mode].suites;
            expect(suite.befores).to.have.length(1);
            expect(
                suite.befores.every(
                    (hook) =>
                        hook.status === 'passed' && hook.stage === 'finished'
                )
            ).to.be.eq(true, 'before all hooks attached');
            expect(suite.afters).to.have.length(1);
            expect(
                suite.afters.every(
                    (hook) =>
                        hook.status === 'passed' && hook.stage === 'finished'
                )
            ).to.be.eq(true, 'after all hooks attached');
        });

        it(`should contain before each and after each hooks for ${mode}`, () => {
            const hooks = result[mode].tests
                .map((test) =>
                    test.steps.filter((step) => step.name.includes('each'))
                )
                .flat();

            expect(
                hooks.every(
                    (hook) =>
                        hook.stage === 'finished' && hook.status === 'passed'
                )
            ).to.be.eq(true, 'every hook passed');

            mode === 'cucumber' && hooks.splice(1, 1);
            expect(
                hooks.every(
                    (hook) =>
                        hook.steps.length === 1 &&
                        hook.steps[0].name ===
                            `log This will run ${hook.name
                                .replace(' each" hook', '')
                                .substring(1)} every scenario`
                )
            ).to.be.eq(true, 'step attached');
        });

        it(`should contain test results for ${mode}`, () => {
            expect(result[mode].tests).to.have.length(
                mode === 'cucumber' ? 1 : 4
            );
            const { tests } = result[mode];
            tests.forEach((t) => {
                expect(t.status).to.be.eq(
                    t.name === 'should attach screenshot for failed test'
                        ? 'failed'
                        : 'passed'
                );
                expect(t.stage).to.be.eq('finished');
                expect(t).to.have.property('start');
                expect(t).to.have.property('stop');
            });
        });
    });
});

const expectedLabels = (mode, type) =>
    mode === 'basic'
        ? [
              { name: 'parentSuite', value: 'Allure API Parent Suite' },
              { name: 'epic', value: 'Allure API' },
              { name: 'feature', value: type },
              { name: 'owner', value: 'Oleksandr Shevtsov' },
              { name: 'severity', value: 'critical' },
              { name: 'story', value: `${type} api should work` },
              { name: 'suite', value: 'Allure API Context' },
              { name: 'tag', value: 'customTag' },
              { name: 'tag', value: 'customTag2' },
              { name: 'package', value: 'cypress.e2e.basic.allure.cy.js' }
          ]
        : [
              { name: 'AS_ID', value: '12345' },
              { name: 'parentSuite', value: 'AllureAPI' },
              { name: 'suite', value: 'TestRule' },
              { name: 'epic', value: 'AllureAPI' },
              { name: 'story', value: 'Cucumber' },
              { name: 'owner', value: 'OleksandrShevtsov' },
              { name: 'tag', value: 'tagForFeature' },
              { name: 'tag', value: 'tagForRule' },
              { name: 'severity', value: 'minor' },
              { name: 'tag', value: 'tagForTest' },
              { name: 'feature', value: 'AllureAPI' },
              { name: 'package', value: 'cypress.e2e.cucumber.allure.feature' }
          ];

const issuePrefix = 'https://example.com/project/test/issue/';
const tmsPrefix = 'https://example.com/testcases/TEST/';

const expectedLinks = (mode, type) =>
    mode === 'basic'
        ? [
              {
                  name: 'bug',
                  url: `${type === 'Chainer' ? issuePrefix : ''}issueUrl`,
                  type: 'issue'
              },
              {
                  name: 'test case',
                  url: `${type === 'Chainer' ? tmsPrefix : ''}tmsUrl`,
                  type: 'tms'
              }
          ]
        : [
              { name: 'jira', url: `${issuePrefix}tmsLink`, type: 'issue' },
              { name: 'tms', url: `${tmsPrefix}tmsLink`, type: 'tms' },
              { name: 'example', url: 'https://example.com', type: 'link' }
          ];

describe('Cucumber specific', () => {
    it('should contain data passed via tags', () => {
        const { cucumber } = result;
        const [test] = cucumber.tests;

        expect(test.labels).to.have.length(expectedLabels('cucumber').length);
        expect(test.labels).to.have.deep.members(expectedLabels('cucumber'));
        expect(test.links).to.have.length(expectedLinks('cucumber').length);
        expect(test.links).to.have.deep.members(expectedLinks('cucumber'));
    });

    it('should contain cucumber steps', () => {
        const { cucumber } = result;
        const [test] = cucumber.tests;

        const expectedSteps = [
            {
                name: 'Given I have allure tags set for Feature',
                child: 'log child command for given'
            },
            {
                name: 'When I run any test',
                child: 'log child command for when'
            },
            {
                name: 'Then I should see allure api working properly',
                child: 'log child command for allure api "then" step'
            },
            {
                name: 'And Tags from test should overwrite tags from feature',
                child: 'log child command for tags overwriting "then" step'
            }
        ];

        const steps = test.steps.filter((s) => !s.name.includes('each'));
        expect(steps).to.have.length(expectedSteps.length);

        expectedSteps.forEach(({ name, child }, index) => {
            const parentStep = steps[index];
            expect(parentStep.status).to.be.eq('passed');
            expect(parentStep).to.have.property('start');
            expect(parentStep).to.have.property('stop');
            expect(parentStep.name).to.be.eq(name);
            expect(parentStep.steps).to.have.length(1);
            expect(parentStep.steps[0].name).to.be.eq(child);
            expect(parentStep.steps[0]).to.have.property('start');
            expect(parentStep.steps[0]).to.have.property('stop');
        });
    });
});

describe('Basic specific', () => {
    it('should contain attachments', () => {
        const { attachments } = result.basic;
        expect(attachments).to.have.length(3);
    });

    it('should have every attachment be linked to test', () => {
        const { attachments, tests } = result.basic;
        attachments.forEach(({ fileName }) => {
            const test = tests.find((t) =>
                t.attachments.some((a) => a && a.source.endsWith(fileName))
            );
            expect(test.attachments).to.have.length(1);
            const [testAttachment] = test.attachments;
            expect(testAttachment).to.not.eq(
                undefined,
                'attachment is linked to test'
            );
            expect(testAttachment.type).to.be.eq(
                fileName.endsWith('png') ? 'image/png' : 'text/plain'
            );
        });
    });

    it('should contain 2 text attachments', () => {
        const { attachments } = result.basic;
        const textAttachments = attachments.filter(
            (a) => !a.fileName.endsWith('.png')
        );
        expect(textAttachments).to.have.length(2);
        expect(
            textAttachments.every(
                ({ content, fileName }) =>
                    content === 'sample attachment' && fileName.endsWith('.txt')
            )
        ).to.be.eq(true, 'Text attachments content and filename is correct');
    });

    it('should contain failed PNG screenshot', () => {
        const { attachments } = result.basic;
        const screenshots = attachments.filter((a) =>
            a.fileName.endsWith('.png')
        );
        expect(screenshots).to.have.length(1);
        expect(screenshots[0].content).to.include('PNG');
    });

    it('should contain data passed via synchronous interface', () => {
        const { tests } = result.basic;
        const test = tests.find(
            (t) => t.name === 'should work in synchronous mode'
        );
        expect(test.description).to.be.eq('some description');

        expect(test.labels).to.have.length(
            expectedLabels('basic', 'Synchronous').length
        );
        expect(test.labels).to.have.deep.members(
            expectedLabels('basic', 'Synchronous')
        );

        expect(test.links).to.have.length(expectedLinks('basic').length);
        expect(test.links).to.have.deep.members(expectedLinks('basic'));

        expect(test.parameters).to.have.length(1);
        expect(test.parameters).to.have.deep.members([
            { name: 'param', value: 42 }
        ]);
    });

    it('should contain data passed via chainer', () => {
        const { tests } = result.basic;
        const test = tests.find(
            (t) => t.name === 'should work in chainer mode'
        );
        expect(test.description).to.be.eq('some description');

        expect(test.labels).to.have.length(
            expectedLabels('basic', 'Chainer').length
        );
        expect(test.labels).to.have.deep.members(
            expectedLabels('basic', 'Chainer')
        );
        expect(test.links).to.have.length(
            expectedLinks('basic', 'Chainer').length
        );
        expect(test.links).to.have.deep.members(
            expectedLinks('basic', 'Chainer')
        );

        expect(test.parameters).to.have.deep.members([
            { name: 'param', value: 42 }
        ]);
    });

    it('should contain test steps', () => {
        const { tests } = result.basic;

        const test = tests.find(
            (t) => t.name === 'should attach cypress command log as steps'
        );
        const verifyStep = (step) => {
            expect(step.status).to.be.eq('passed');
            expect(step.stage).to.be.eq('finished');
            expect(step).to.have.property('start');
            expect(step).to.have.property('stop');
        };

        expect(test.steps).to.have.length(4);
        const steps = [
            '"before each" hook',
            `first parent step`,
            `second parent step`,
            '"after each" hook'
        ];
        test.steps.forEach((step, i) => {
            const stepName = (index) => steps[index];

            expect(step.name).to.be.eq(stepName(i));

            verifyStep(step);

            //child steps
            if (i > 0 && i < steps.length - 1) {
                const order = i === 1 ? 'first' : 'second';
                expect(step.steps).to.have.length(1);
                const [childStep] = step.steps;
                verifyStep(childStep);
                expect(childStep.name).to.be.eq(
                    `log child command for ${order} step`
                );
            }
        });
    });
});
