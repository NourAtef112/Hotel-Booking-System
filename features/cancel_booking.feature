Feature: Cancel a Booking
  As a logged-in user
  I want to cancel a room booking
  So that I am not charged for a room I no longer need

  Scenario: Successful cancellation
    Given I have a confirmed booking with ID "12345"
    When I click "Cancel Booking" for ID "12345"
    Then the booking status should change to "cancelled"
    And I should receive a cancellation confirmation

  Scenario: Attempt to cancel a past booking
    Given I have a completed booking with ID "54321" from a past date
    When I click "Cancel Booking" for ID "54321"
    Then I should see an error message "Cannot cancel a booking that is already completed or in the past"
    And the booking status should remain "completed"
