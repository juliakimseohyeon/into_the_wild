## 1. Finalize app identity and config

- [ ] 1.1 Decide the production `appId` (reverse-DNS) and app display name, and set them in `capacitor.config.json`
- [ ] 1.2 Confirm minimum supported iOS and Android versions
- [ ] 1.3 Decide whether `ios/` and `android/` are committed to the repo or regenerated in CI, and record it in the design

## 2. Web build baseline

- [ ] 2.1 Install dependencies (`npm install`) and run the dev server (`npm start`) to confirm the web app loads
- [ ] 2.2 Produce a production web build with `npm run build` and confirm output lands in `dist/`
- [ ] 2.3 Verify the app runs as a web app in a supported browser (core shell loads)

## 3. Add native platforms

- [ ] 3.1 Add the CLI dependency and platform packages (`@capacitor/ios`, `@capacitor/android`)
- [ ] 3.2 Run `npx cap add ios` and `npx cap add android` to generate the native projects
- [ ] 3.3 Run `npx cap sync` to copy the `dist/` build and plugins into both native projects

## 4. Verify on each target

- [ ] 4.1 Launch the iOS app (`npx cap open ios`, run in the simulator) and confirm the shared web build loads
- [ ] 4.2 Launch the Android app (`npx cap open android`, run in an emulator) and confirm the shared web build loads
- [ ] 4.3 Confirm campsite-discovery behaviour (once available) is equivalent across web, iOS, and Android

## 5. Native capability guards

- [ ] 5.1 Wrap camera and splash-screen usage in Capacitor platform/availability checks so the web build degrades gracefully
- [ ] 5.2 Confirm the web app does not crash when a native-only capability is unavailable

## 6. Document and finish

- [ ] 6.1 Document the build/sync flow (`npm run build` → `npx cap sync`) and native prerequisites (Xcode, Android SDK) in the README
- [ ] 6.2 Run the web build and `npx cap sync` a final time before opening the PR
