<!-- Tracking issue: no ticket. This spec captures the motivation and scope. -->
<!--
Motivation: Campers in British Columbia have no single place to see which BC
Parks campsites are currently available, whether a site is frontcountry or
backcountry, and whether it can be reserved online or is first-come,
first-served. Into The Wild lets a user search for campsites in BC, see
availability at a glance, and jump straight to the correct official BC Parks
reservation page when a site needs a booking.

Scope: read-only discovery of BOTH frontcountry and backcountry campsites and
their availability, plus an outbound deep link to the official BC Parks site.
Automated booking is out of scope here and specified in the `auto-booking`
capability.

Priority: SECOND (after the multi-platform shell). This is the core free feature.

Open questions (for design.md):
- Availability data source: BC Parks does not publish an open availability API,
  so the source of truth for campsite lists and availability needs to be decided.
-->

## ADDED Requirements

### Requirement: Search for frontcountry and backcountry campsites in British Columbia

The system SHALL allow a user to search for both frontcountry and backcountry BC
Parks campsites by a location query (park name, region, or place name) and SHALL
return the matching campsites, each identified as frontcountry or backcountry.

#### Scenario: Search returns frontcountry and backcountry matches

- **WHEN** a user enters a location query that matches BC campsites
- **THEN** the system displays a list of matching campsites, each showing at
  least the campsite name, its parent park or region, and whether it is
  frontcountry or backcountry

#### Scenario: Search returns no matches

- **WHEN** a user enters a location query that matches no BC campsites
- **THEN** the system displays an empty-state message indicating that no
  campsites were found for that query

### Requirement: Distinguish reservation-required and first-come-first-served campsites

The system SHALL indicate, for each campsite, whether it requires an online
reservation or is available on a first-come, first-served basis. This applies to
frontcountry sites and to backcountry campgrounds, which typically require a
reservation during peak season and may be first-come, first-served outside it.

#### Scenario: Reservation-required campsite is labelled

- **WHEN** a campsite requires an online reservation
- **THEN** the system labels the campsite as reservation-required

#### Scenario: First-come-first-served campsite is labelled

- **WHEN** a campsite is available on a first-come, first-served basis
- **THEN** the system labels the campsite as first-come, first-served and does
  not present a reservation link for it

#### Scenario: Backcountry campground reservation requirement varies by season

- **WHEN** a user views a backcountry campground that is reservation-required in
  peak season and first-come, first-served outside peak season
- **THEN** the system indicates the reservation requirement applicable to the
  dates the user is viewing

### Requirement: Show campsite availability

The system SHALL display availability information for a campsite so the user can
see whether, and for which dates, the campsite currently has open spots.

#### Scenario: Availability is shown for an available campsite

- **WHEN** a user views a campsite that has open spots
- **THEN** the system displays the dates or date ranges for which the campsite
  is available

#### Scenario: Fully booked campsite is shown as unavailable

- **WHEN** a user views a campsite that has no open spots for the period shown
- **THEN** the system indicates that the campsite is fully booked for that period

### Requirement: Deep link to the correct BC Parks reservation page

For a reservation-required campsite, the system SHALL provide a link that opens
the official BC Parks reservation page for that specific campsite, using the
frontcountry or backcountry reservation flow as appropriate.

#### Scenario: User opens the BC Parks page for a frontcountry campsite

- **WHEN** a user selects the reservation link on a reservation-required
  frontcountry campsite
- **THEN** the system opens the official BC Parks frontcountry reservation page
  for that specific campsite

#### Scenario: User opens the BC Parks page for a backcountry campground

- **WHEN** a user selects the reservation link on a reservation-required
  backcountry campground
- **THEN** the system opens the official BC Parks backcountry reservation page
  for that specific campground

#### Scenario: First-come-first-served campsite has no reservation link

- **WHEN** a user views a first-come, first-served campsite
- **THEN** the system does not present a BC Parks reservation link for that
  campsite
