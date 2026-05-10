Feature: User Registration
  As a new visitor
  I want to create an account
  So that I can book rooms

  Scenario: Successful registration as a guest
    Given I am on the registration page
    When I enter valid details "John Doe", "john@example.com", "Password123", role "guest"
    And I submit the form
    Then I should see a "Registration successful" message
    And I should be redirected to the login page
