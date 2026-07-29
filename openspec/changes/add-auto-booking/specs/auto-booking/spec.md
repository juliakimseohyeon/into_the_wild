<!-- Tracking issue: no ticket. This spec captures the motivation and scope. -->
<!--
Motivation: Popular BC Parks campsites sell out within seconds of becoming
reservable. Both frontcountry and backcountry reservations open at 07:00 Pacific
Time, and new arrival dates are released on a rolling daily basis. Subscribers
want the app to grab a spot for them automatically the moment it opens, instead
of racing the waiting-room queue themselves.

Scope: subscriber-only. A subscriber records what they want (location + dates)
for a frontcountry or backcountry campsite; a scheduled job attempts to book a
matching reservation-required campsite when inventory opens, and the user is
notified of the outcome.

Priority: FOURTH (last). Depends on campsite-discovery (knowing sites and
availability) and subscriptions (entitlement gating). Also the riskiest — see
the "Investigate the booking mechanism" requirement below, which MUST be
resolved before implementation.

Confirmed facts (BC Parks):
- Reservations open at 07:00 America/Vancouver for BOTH frontcountry and
  backcountry (the user's original "6am" was off by an hour).
- Frontcountry: new arrival dates release on a rolling daily basis.
- Backcountry: bookable up to ~3 months before arrival; some parks (e.g. Bowron
  Lakes, Berg Lake Trail) have special single launch dates instead.
- At 07:00 launch, users are placed in a randomized waiting-room queue.
-->

## ADDED Requirements

### Requirement: Investigate the booking mechanism before implementation

Before auto-booking is implemented, the system's booking mechanism SHALL be
determined by a documented investigation of BC Parks' reservation interfaces for
both frontcountry and backcountry, covering: whether an official or partner
booking API exists; the feasibility and Terms-of-Service implications of
automating a reservation on the user's behalf (including handling the user's BC
Parks credentials); how the 07:00 randomized waiting-room queue is handled; and
the differing booking windows (rolling frontcountry dates, ~3-month backcountry
windows, and special launch-date parks).

#### Scenario: Investigation completed and approved before build

- **WHEN** the auto-booking capability is planned for implementation
- **THEN** a documented investigation of the booking mechanism and its Terms-of-
  Service, credential-handling, and feasibility constraints exists and is
  approved before implementation begins

### Requirement: Configure an auto-booking request

The system SHALL allow a subscriber to create an auto-booking request specifying
one or more target locations (frontcountry or backcountry campsites, parks, or
regions) and the desired arrival and departure dates. Auto-booking requests SHALL
be available only to users with an active subscription.

#### Scenario: Subscriber creates an auto-booking request

- **WHEN** a subscriber submits a location and a valid date range for an
  auto-booking request
- **THEN** the system saves the request and schedules it to be attempted when the
  matching reservation window opens

#### Scenario: Non-subscriber cannot create a request

- **WHEN** a user without an active subscription attempts to create an
  auto-booking request
- **THEN** the system rejects the attempt and prompts the user to subscribe

#### Scenario: Subscriber cancels a pending request

- **WHEN** a subscriber cancels an auto-booking request that has not yet been
  fulfilled
- **THEN** the system removes the request from the schedule and makes no further
  booking attempts for it

### Requirement: Run a daily scheduled booking job at reservation-open time

The system SHALL run a scheduled job once per day, timed to BC Parks'
reservation-open time of 07:00 America/Vancouver, that attempts to fulfil pending
auto-booking requests (frontcountry and backcountry) whose target dates become
reservable that day.

#### Scenario: Job runs at reservation-open time

- **WHEN** the clock reaches 07:00 America/Vancouver on a given day
- **THEN** the system runs the auto-booking job for all pending requests whose
  target arrival date becomes reservable on that day

#### Scenario: Job accounts for daylight saving time

- **WHEN** the local Pacific time observes a daylight saving transition
- **THEN** the job still runs at 07:00 America/Vancouver (not a fixed UTC offset)

#### Scenario: Job handles special backcountry launch-date parks

- **WHEN** a request targets a backcountry park that opens all dates on a single
  launch date rather than on a rolling basis
- **THEN** the system schedules the attempt for that park's launch date at 07:00
  America/Vancouver

### Requirement: Attempt to book a matching campsite

When a request's target dates become reservable, the system SHALL attempt to
reserve a reservation-required campsite that matches the request's location and
dates.

#### Scenario: A matching site is available

- **WHEN** the job runs and a campsite matching the request's location and dates
  is available to reserve
- **THEN** the system attempts to complete a reservation for that campsite on the
  subscriber's behalf

#### Scenario: No matching site is available

- **WHEN** the job runs and no campsite matching the request is available
- **THEN** the system records the attempt as unsuccessful and, per the request's
  configuration, either retries on a following day or stops

### Requirement: Notify the subscriber of the booking outcome

The system SHALL notify the subscriber of the outcome of each auto-booking
attempt.

#### Scenario: Booking succeeds

- **WHEN** the system successfully reserves a campsite for a request
- **THEN** the system notifies the subscriber of the confirmed reservation,
  including the campsite, dates, and any booking reference

#### Scenario: Booking does not succeed

- **WHEN** the system is unable to reserve any matching campsite for a request
- **THEN** the system notifies the subscriber that no reservation was secured
