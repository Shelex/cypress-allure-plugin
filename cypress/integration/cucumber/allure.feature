@epic("AllureAPI")
@story("Cucumber")
@owner("OleksandrShevtsov")
@tagForFeature
Feature: AllureAPI
    I want to use allure api in cypress tests

@issue("jira","tmsLink")
@tms("tms","tmsLink")
@severity("minor")
@tagForTest
Scenario: Cucumber tags should work
    Given I have allure tags set for Feature
    When  I run any test
    Then  I should see allure api working properly
    And   Tags from test should overwrite tags from feature