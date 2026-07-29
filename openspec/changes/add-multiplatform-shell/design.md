## Context

Into The Wild is scaffolded as a Capacitor app: `capacitor.config.json` (appId
`com.example.app`, `webDir: dist`), a Vite web build rooted at `src/`, and the
`@capacitor/core`, `@capacitor/camera`, and `@capacitor/splash-screen`
dependencies. What does **not** exist yet: the native iOS and Android projects
(`npx cap add ios` / `npx cap add android` have not been run), a `dist/` build
output, or any CI wiring for the three targets.

This change establishes the shared multi-platform shell that every later feature
(campsite-discovery, subscriptions, auto-booking) builds on. It is deliberately
scoped to "the same app runs on web, iOS, and Android" — not to any product
feature.

## Goals / Non-Goals

**Goals:**
- One Capacitor codebase produces a web app, an iOS app, and an Android app.
- A repeatable build/sync flow: `npm run build` (Vite → `dist/`) then
  `npx cap sync` to update the native projects.
- Native device capabilities (camera, splash screen) are reached through
  Capacitor plugins and degrade gracefully on the web.
- The iOS and Android native projects exist and open/run in their toolchains.

**Non-Goals:**
- Any campsite, subscription, or booking feature (separate changes).
- App Store / Play Store submission and signing (a later release concern).
- Choosing a UI framework or design system beyond the current vanilla shell.
- Push notifications, deep-link routing, and analytics.

## Decisions

- **Capacitor over React Native / PWA-only.** The repo is already a Capacitor
  app, and Capacitor lets a single web build ship natively while keeping the web
  target first-class. Alternative considered: PWA-only — rejected because the
  product needs installable iOS/Android apps (and, later, native scheduling and
  store presence). Alternative considered: React Native — rejected as a rewrite
  of the existing web shell for no current benefit.
- **`appId` must be finalized before adding platforms.** The scaffold ships
  `com.example.app`; the native projects bake the bundle/application id in at
  `cap add` time, so the real reverse-DNS id (e.g. `care.junehealth.intothewild`
  or similar) should be set in `capacitor.config.json` first. Changing it later
  means regenerating the native projects. **Open question below.**
- **Commit the native projects to the repo.** Simpler for a small team than
  regenerating them in CI; keeps native config edits reviewable. Trade-off:
  larger repo and occasional merge noise in generated files.
- **Feature detection for native capabilities.** Guard camera/splash usage with
  Capacitor's platform/availability checks so the web build never calls an
  unavailable API.

## Risks / Trade-offs

- [Native toolchains needed] Building iOS requires macOS + Xcode; Android
  requires the Android SDK. → Document prerequisites; keep the web target usable
  without either so most development doesn't need them.
- [Generated native projects drift] Committed `ios/` and `android/` folders can
  drift from `capacitor.config.json`. → Always run `npx cap sync` after config
  or web changes; add it to the tasks/PR checklist.
- [`appId` churn] Adding platforms before finalizing `appId` forces a
  regeneration. → Finalize `appId` as the first task.

## Migration Plan

Greenfield — no existing users or data to migrate. Rollout is simply: land the
native projects and the build/sync flow, verify the app launches on all three
targets, then build features on top. Rollback is deleting the generated `ios/`
and `android/` folders; the web app is unaffected.

## Open Questions

- What is the final production `appId` (reverse-DNS) and app display name? The
  scaffold's `com.example.app` / `into_the_wild` are placeholders.
- Minimum supported iOS and Android versions?
- Should `ios/` and `android/` be committed, or regenerated in CI? (Design
  assumes committed; confirm with the team.)
