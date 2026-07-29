<!-- Tracking issue: no ticket. This spec captures the motivation and scope. -->
<!--
Motivation: Automated booking (the `auto-booking` capability) is a premium
feature unlocked by a paid subscription; campsite discovery stays free.
Subscriptions are processed with Stripe. Crucially, purchases are completed
through Stripe web checkout OUTSIDE the native iOS/Android in-app-purchase flow,
so the app-store commission (up to ~30%) does not apply.

Priority: THIRD. Needed before auto-booking, which is gated behind an active
subscription.

Open question / risk (for design.md):
- App-store anti-steering policies: iOS and Android historically restrict
  directing users to external payment. Recent (2024-2025) rulings have relaxed
  US anti-steering rules, but the exact compliant presentation (and per-store
  differences) must be validated before launch.
-->

## ADDED Requirements

### Requirement: Offer a paid subscription processed through Stripe

The system SHALL offer a paid subscription processed through Stripe, and SHALL
record whether a user currently has an active subscription based on Stripe's
record of the subscription.

#### Scenario: User subscribes successfully

- **WHEN** a user without an active subscription completes payment through Stripe
- **THEN** the system records the user as having an active subscription and
  unlocks subscriber-only features

#### Scenario: Payment fails

- **WHEN** a user's Stripe payment does not complete successfully
- **THEN** the system does not grant an active subscription and informs the user
  that the purchase did not complete

### Requirement: Complete purchases outside the native in-app-purchase flow

On iOS and Android, the system SHALL complete subscription purchases through
Stripe web checkout rather than the platform's native in-app-purchase system, so
that app-store commission does not apply to the subscription.

#### Scenario: Native user is taken to external Stripe checkout

- **WHEN** a user on the iOS or Android app chooses to subscribe
- **THEN** the system completes the purchase via Stripe web checkout outside the
  native in-app-purchase flow, and does not charge through the app store

#### Scenario: Web user checks out with Stripe

- **WHEN** a user on the web app chooses to subscribe
- **THEN** the system completes the purchase via Stripe checkout

### Requirement: Reflect Stripe subscription state in the app

The system SHALL keep the user's in-app entitlement in sync with the current
state of their Stripe subscription.

#### Scenario: Entitlement is granted after Stripe confirms payment

- **WHEN** Stripe confirms a successful subscription payment for a user
- **THEN** the system grants that user the active-subscription entitlement

#### Scenario: Entitlement is removed when Stripe reports the subscription ended

- **WHEN** Stripe reports that a user's subscription has expired, been cancelled,
  or failed to renew
- **THEN** the system removes that user's active-subscription entitlement

### Requirement: Gate auto-booking behind an active subscription

The system SHALL restrict access to the auto-booking capability to users with an
active subscription.

#### Scenario: Active subscriber can access auto-booking

- **WHEN** a user with an active subscription opens the auto-booking feature
- **THEN** the system grants access to configure auto-booking requests

#### Scenario: Non-subscriber is prompted to subscribe

- **WHEN** a user without an active subscription attempts to access auto-booking
- **THEN** the system blocks access and presents the option to subscribe

### Requirement: Manage an existing subscription

The system SHALL allow a subscriber to view their subscription status and cancel
their subscription (for example, through the Stripe customer billing portal).

#### Scenario: Subscriber views status

- **WHEN** a subscriber opens their account
- **THEN** the system displays the subscription status and renewal or expiry date

#### Scenario: Subscriber cancels

- **WHEN** a subscriber cancels their subscription
- **THEN** the system records the cancellation and keeps access active until the
  end of the paid period, after which the subscription becomes inactive
