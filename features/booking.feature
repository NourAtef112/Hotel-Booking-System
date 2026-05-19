Feature: Booking a Room
  As a logged-in user
  I want to book a housing room
  So that I have a place to stay

  Scenario: Successful room booking
    Given I am logged in as "john@example.com"
    And I have selected a "Single Room" for dates "2024-06-01" to "2024-06-05"
    When I click "Confirm Booking"
    Then my booking should be created with status "pending"
    And I should see a booking confirmation screen

  Scenario: Room is no longer available
    Given I am logged in as "john@example.com"
    And I have selected a "Single Room" for dates "2024-06-01" to "2024-06-05"
    And the room is booked by another user before confirmation
    When I click "Confirm Booking"
    Then I should see an error message "Room is no longer available for these dates"
    And my booking should not be created
