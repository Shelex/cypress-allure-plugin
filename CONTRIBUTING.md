# Contributing to cypress-allure-plugin

Firstly, thanks for considering contributing to _cypress-allure-plugin_. To make it a really
great tool we need your help.

_cypress-allure-plugin_ is [Apache 2.0 licenced](LICENSE) and accepts contributions via GitHub
pull requests. There are many ways to contribute, from writing tutorials or blog posts,
improving the documentation, submitting bug reports and feature requests or writing code.

## Certificate of Origin

By contributing to this project you agree to the [Developer Certificate of
Origin](https://developercertificate.org/). This was created by the Linux
Foundation and is a simple statement that you, as a contributor, have the legal
right to make the contribution.

To signify that you agree to the DCO you must signoff all commits:

```bash
git commit --signoff
```

## Getting Started

-   Fork the repository on GitHub
-   Read the [README](README.md) for getting started as a user and learn how/where to ask for help
-   If you want to contribute as a developer, continue reading this document for further instructions
-   Play with the project, submit bugs, submit pull requests!

### Contribution workflow

#### 1. Set up your environment

1. You'll need the following tools:

-   [Git](https://git-scm.com/)
-   [Node.JS](https://nodejs.org/en/), x64, version >= 10.16.0, < 11.0.0
-   [Yarn](https://yarnpkg.com/en/), follow the [installation guide](https://yarnpkg.com/en/docs/install)
-   [Visual Studio Code](https://code.visualstudio.com/), version >= 1.38.0

2. Fork this repository and clone it by running:

```bash
git clone git@github.com:<yourusername>/cypress-allure-plugin.git
```

3. Install dependencies:

```bash
cd cypress-allure-plugin
yarn install
```

#### 2. Find a feature to work on

-   Look at the existing [issues](https://github.com/90poe/cypress-allure-plugin/issues) to see if there is anything
    you would like to work on. If don't see anything then feel free to create your own feature request.

-   If you are a new contributor then take a look at the issues marked
    with [good first issue](https://github.com/90poe/cypress-allure-plugin/labels/good%20first%20issue).

-   Make your code changes within a feature branch:

    ```bash
    git checkout -b <feature-name>
    ```

*   Try to commit changes in logical units with a commit message in this [format](#commit-message-format). Remember
    to signoff your commits.

*   Don't forget to update the docs if relevent. The [README](README.md) is where docs usually live.

*   Make sure the tests pass and that there are no linting problems.

#### 3. Create a pull request

Push your changes to your fork and then create a pull request to origin. Where possible use the PR template.

You can mark a PR as wotk in progress by prefixing the title of your PR with `WIP:`.

### Commit Message Format

We would like to follow the **Conventional Commits** format for commit messsages. The full specification can be
read [here](https://www.conventionalcommits.org/en/v1.0.0-beta.3/). The format is:

```
<type>: <description>

[optional body]

[optional footer]
```

Where `<type>` is one of the following:

-   `feat` - a new feature
-   `fix` - a bug fix
-   `chore` - changes to the build pocess, code generation or anything that doesn't match elsewhere
-   `docs` - documentation only changes
-   `style` - changes that don't affect the meaning of the code (i.e. code formatting)
-   `refactor` - a change that doesn't fix a feature or bug
-   `test` - changes to tests only.

The `body` should include details of what changed and why. If there is a breaking change then the `body` should start with the
following: `BREAKING CHANGE`.

The footer should include any related github issue numbers.

An example:

```text
feat: Added new command to run cypress

A new command has been added to run cypress. The
command will execute cypress for single spec file with option `--no-exit`

Fixes: #123
```

A tool like [Commitizen](https://github.com/commitizen/cz-cli) can be used to help with formatting commit messages.
