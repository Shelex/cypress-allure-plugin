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
            expect(suites).to.have.length(mode === 'basic' ? 4 : 1);
            expect(suites.every((s) => s.children.length === 1)).to.be.eq(
                true,
                'every suite has single test'
            );
            expect(
                tests.every((t) =>
                    suites.find((s) => s.children.includes(t.uuid))
                )
            ).to.be.eq(true, 'every test is linked to suite by uuid');
        });

        it(`should contain before each and after each hooks for ${mode}`, () => {
            const verifyEachHook = (name, suite) => {
                const data = suite[`${name}s`];
                const hook = data.filter((h) => h.steps.length)[0];
                expect(hook.status).to.be.eq('passed');
                expect(hook.steps).to.have.length(1);
                expect(hook.steps[0].name).to.be.eq(
                    `log This will run ${name} every scenario `
                );
            };
            result[mode].suites.forEach((suite) => {
                verifyEachHook('before', suite);
                verifyEachHook('after', suite);
            });
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
              { name: 'parentSuite', value: 'Allure API Context' },
              { name: 'epic', value: 'Allure API' },
              { name: 'feature', value: type },
              { name: 'owner', value: 'Oleksandr Shevtsov' },
              { name: 'severity', value: 'critical' },
              { name: 'story', value: `${type} api should work` },
              { name: 'suite', value: 'Allure API Suite' },
              { name: 'tag', value: 'customTag' }
          ]
        : [
              { name: 'parentSuite', value: 'AllureAPI' },
              { name: 'epic', value: 'AllureAPI' },
              { name: 'story', value: 'Cucumber' },
              { name: 'owner', value: 'OleksandrShevtsov' },
              { name: 'tag', value: 'tagForFeature' },
              { name: 'severity', value: 'minor' },
              { name: 'tag', value: 'tagForTest' },
              { name: 'feature', value: 'AllureAPI' }
          ];

const expectedLinks = (mode, type) =>
    mode === 'basic'
        ? [
              {
                  name: 'bug',
                  url: `${type === 'Chainer' ? 'issuePrefix-' : ''}issueUrl`,
                  type: 'issue'
              },
              {
                  name: 'test case',
                  url: `${type === 'Chainer' ? 'tmsPrefix-' : ''}tmsUrl`,
                  type: 'tms'
              }
          ]
        : [
              { name: 'jira', url: 'issuePrefix-tmsLink', type: 'issue' },
              { name: 'tms', url: 'tmsPrefix-tmsLink', type: 'tms' }
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
                child: 'log child command for given '
            },
            {
                name: 'When I run any test',
                child: 'log child command for when '
            },
            {
                name: 'Then I should see allure api working properly',
                child: 'log child command for allure api "then" step '
            },
            {
                name: 'And Tags from test should overwrite tags from feature',
                child: 'log child command for tags overwriting "then" step '
            }
        ];

        expect(test.steps).to.have.length(expectedSteps.length);

        expectedSteps.forEach(({ name, child }, index) => {
            const parentStep = test.steps[index];
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
                t.attachments.find((a) => a.source === fileName)
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

        expect(test.steps).to.have.length(2);
        test.steps.forEach((step, i) => {
            const order = i === 0 ? 'first' : 'second';

            expect(step.name).to.be.eq(`${order} parent step`);

            verifyStep(step);

            //child steps
            expect(step.steps).to.have.length(1);
            const [childStep] = step.steps;
            verifyStep(childStep);
            expect(childStep.name).to.be.eq(
                `log child command for ${order} step `
            );
        });
    });
});
