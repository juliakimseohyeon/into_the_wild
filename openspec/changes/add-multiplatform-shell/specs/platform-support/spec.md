<!-- Tracking issue: no ticket. This spec captures the motivation and scope. -->
<!--
Motivation: Into The Wild must reach campers wherever they are — in a browser,
on iPhone, and on Android — without maintaining three separate codebases. The
app is built with Capacitor, which wraps a single web build (Vite) as native iOS
and Android apps. This capability establishes that shared multi-platform shell as
the foundation every other feature builds on.

Priority: FIRST. Everything else ships on top of this shell.
-->

## ADDED Requirements

### Requirement: Ship from a single codebase to web, iOS, and Android

The system SHALL be built from a single Capacitor codebase and SHALL be
distributable as a web app, an iOS app, and an Android app. The web layer SHALL
be built with Vite into `dist/` and synced to the native projects with
`npx cap sync`.

#### Scenario: App runs as a web app

- **WHEN** a user opens the app's web URL in a supported browser
- **THEN** the app loads and its core features are usable

#### Scenario: App runs on iOS

- **WHEN** a user launches the installed iOS app
- **THEN** the app loads the shared web build inside the Capacitor iOS shell and
  its core features are usable

#### Scenario: App runs on Android

- **WHEN** a user launches the installed Android app
- **THEN** the app loads the shared web build inside the Capacitor Android shell
  and its core features are usable

### Requirement: Consistent core experience across platforms

The system SHALL provide the same core campsite-discovery behaviour on web, iOS,
and Android.

#### Scenario: Same search behaviour on every platform

- **WHEN** a user performs the same campsite search on web, iOS, and Android
- **THEN** the app returns equivalent results and behaviour on each platform,
  differing only where a platform capability requires it

### Requirement: Access device capabilities through Capacitor plugins

The system SHALL access native device capabilities (such as the camera and
splash screen) through Capacitor plugins so the same code path works across
platforms, degrading gracefully on the web where a capability is unavailable.

#### Scenario: Native capability degrades gracefully on web

- **WHEN** the app uses a native-only device capability and runs on the web where
  that capability is unavailable
- **THEN** the app continues to function and does not crash, hiding or disabling
  the unavailable capability
