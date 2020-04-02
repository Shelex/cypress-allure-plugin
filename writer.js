const path = require('path');
const fse = require('fs-extra')
const uuid = require('uuid')

module.exports = function (on) {
    on('task', {
        writeAllureResults: ({ resultsDir, writer }) => {
            const { groups, tests, attachments } = writer;
            try {
                !fse.existsSync(resultsDir) && fse.mkdirSync(resultsDir)
                groups &&
                    groups.forEach(group => {
                        const fileName = `${group.uuid}-container.json`;
                        fse.outputFileSync(
                            path.join(resultsDir, fileName),
                            JSON.stringify(group)
                        );
                    });
                tests &&
                    tests.forEach(test => {
                        const fileName = `${test.uuid}-result.json`;
                        fse.outputFileSync(
                            path.join(resultsDir, fileName),
                            JSON.stringify(test)
                        );
                    });
                if (attachments) {
                    for (let [name, content] of Object.entries(attachments)) {
                        fse.outputFileSync(path.join(resultsDir, name), content, {
                            encoding: 'binary'
                        });
                    }
                }
            } catch (e) {
                process.stdout.write(
                    `error while writing allure results: ${e}`
                );
            } finally {
                return null;
            }
        }
    });
    on('after:screenshot', (details) => {
        const allurePath = `allure-results/${uuid.v4()}-attachment.png`
        return new Promise((resolve, reject) => {
          fse.copy(details.path, allurePath, (err) => {
            if (err) return reject(err)
            resolve({ path: allurePath })
          })
        })
      })
}