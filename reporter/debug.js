const debug = require('debug');

const logger = debug('allure-plugin');

// eslint-disable-next-line no-console
logger.log = console.log.bind(console);

/**
 * Print out debug message
 * %O   Pretty-print an Object on multiple lines.
 * %o	Pretty-print an Object all on a single line.
 * %s	String.
 * %d	Number (both integer and float).
 * %j	JSON. Replaced with the string '[Circular]' if the argument contains circular references.
 * %%	Single percent sign ('%'). This does not consume an argument.
 */
module.exports = logger;
