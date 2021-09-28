const debug = require('debug');

const namespace = 'allure-plugin';
const scopes = ['allure', 'mocha', 'cy', 'command', 'writer'];

const logger = scopes.reduce((loggers, scope) => {
    const base = debug(`${namespace}:${scope}`);
    // eslint-disable-next-line no-console
    base.log = console.log.bind(console);
    loggers[scope] = base;
    return loggers;
}, {});

/**
 * Print out debug message
 * %O   Pretty-print an Object on multiple lines.
 * %o	Pretty-print an Object all on a single line.
 * %s	String.
 * %d	Number (both integer and float).
 * %j	JSON. Replaced with the string '[Circular]' if the argument contains circular references.
 * %%	Single percent sign ('%'). This does not consume an argument.
 * @property {*} allure
 * @property {*} mocha
 * @property {*} cy
 * @property {*} command
 * @property {*} writer
 */
module.exports = logger;
