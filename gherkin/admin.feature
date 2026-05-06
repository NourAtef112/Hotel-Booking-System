Feature: Admin Viewing Bookings
  As an administrator
  I want to view all bookings
  So that I can manage the housing capacity

  Scenario: View all bookings list
    Given I am logged in as an administrator
    When I navigate to the "Admin Bookings" dashboard
    Then I should see a list of all current and upcoming bookings
    And I should be able to filter them by user or date
