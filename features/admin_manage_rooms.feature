Feature: Admin Managing Rooms
  As an administrator
  I want to manage rooms
  So that I can update housing capacity and availability

  Scenario: Add a new room successfully
    Given I am logged in as an administrator
    When I navigate to the "Manage Rooms" dashboard
    And I add a new "Double Room" with room number "205"
    Then the room should be successfully created
    And it should appear in the available rooms list

  Scenario: Attempt to add a duplicate room number
    Given I am logged in as an administrator
    And a room with number "205" already exists
    When I navigate to the "Manage Rooms" dashboard
    And I add a new "Single Room" with room number "205"
    Then I should see an error message "Room number already exists"
    And the duplicate room should not be created
