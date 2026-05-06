Feature: User Login
  As a registered user
  I want to log in
  So that I can access my profile and book rooms

  Scenario: Successful login
    Given I have a registered account "john@example.com"
    And I am on the login page
    When I enter my email "john@example.com" and password "Password123"
    And I click "Login"
    Then I should be redirected to the home screen
    And I should see my name "John Doe" in the header
