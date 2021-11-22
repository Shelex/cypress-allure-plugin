const semVer = (version) => {
    return {
        above(target) {
            return !isBelow(version, target);
        },
        below(target) {
            return isBelow(version, target);
        }
    };
};

const isBelow = (version, target) =>
    version && target
        ? compare(...[version, target].map((arg) => parseSemver(arg))) ===
          'below'
        : false;

const parseSemver = (versionString) =>
    versionString.split('.').map((str) => parseInt(str));

const compare = (actualVersion, expectedVersion) => {
    const actual = actualVersion.shift();
    const expected = expectedVersion.shift();

    const rules = {
        above: actual > expected,
        below: actual < expected,
        equal: actual === expected
    };

    const result = Object.keys(rules).find((rule) => rules[rule]);

    return result === 'equal' && actualVersion.length
        ? compare(actualVersion, expectedVersion)
        : result;
};

module.exports = { semVer };
