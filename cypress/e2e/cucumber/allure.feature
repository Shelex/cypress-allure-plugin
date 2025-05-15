@epic("AllureAPI")
@story("Cucumber")
@owner("OleksandrShevtsov")
@tagForFeature
Feature: AllureAPI
    I want to use allure api in cypress tests

    @tagForRule
    Rule: TestRule

    @testID("12345")
    @issue("jira", "tmsLink")
    @tms("tms", "tmsLink")
    @link("example", "https://example.com")
    @severity("minor")
    @tagForTest
    Scenario: Cucumber tags should work
        Given I have allure tags set for Feature
        When I run any test
        Then I should see allure api working properly
        And Tags from test should overwrite tags from feature


    @testID("111|222")
    Scenario Outline: Cucumber tags should work
        Given I have allure tags set for Feature
        When I run any test whit "<Value>"
        Then I should see allure api working properly
        And Tags from test should overwrite tags from feature

        Examples:
            | Value |
            | 1111  |
            | 2222  |
