# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.4.1] - 2020-04-14

### Fixed

-   not rename screenshots if allure is disabled

## [1.4.0] - 2020-04-14

### Changed

-   not only disable writer, but Allure not added to Cypress at all if env variable not passed

## [1.3.0] - 2020-04-13

### Removed

-   fs-extra dependency, use fs instead

### Fixed

-   screenshot saving in case allure-results not exist

## [1.2.0] - 2020-04-10

### Added

-   support for `beforeEach` and `afterEach` hooks
-   improved log message for `cy.request`

## [1.1.2] - 2020-04-07

### Fixed

-   parent step for some cucumber cases

## [1.1.1] - 2020-04-07

### Fixed

-   npm package names in readme

## [1.1.0] - 2020-04-06

### Changed

-   refactored steps handling, now test can have parent steps and child steps
-   renamed allure.logStep ==> allure.step
-   set status of all failed tests as "failed" instead of having some "broken"

### Added

-   api to write categories, executorInfo, environmentInfo
-   cucumber steps are detected as parent steps

### Removed

-   step wrapper as no sense to wrap cypress commands for logging

## [1.0.1] - 2020-04-03

### Fixed

-   path for writing allure results on os windows
-   change configuration tms and issue from url to prefix
-   documentation for setting up tms and issue prefixes
-   cucumber: scenario tags has priority over feature tags

## [1.0.0] - 2020-04-03

### Added

-   support for cucumber tags
-   configurable baseURL for issue and tms commands

### Fixed

-   overwriting of results

## [0.0.6] - 2020-04-03

### Changed

-   Improved type definitions

## [0.0.5] - 2020-04-02

### Added

-   Type definitions for IntelliSense support

## [0.0.1] - 2020-04-02

### Added

-   initial plugin release
-   adjust Allure-mocha reporter to work inside browser with Cypress
-   Allure API both synchronous and Cypress chainer
-   automatically attach screenshots to report
