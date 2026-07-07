# iOS App Store / TestFlight Checklist

Shared checklist for taking any iOS app from local archive to TestFlight and App Store submission. Keep it generic; put app-specific listing copy and reviewer notes in that app's repo.

Last checked against Apple docs: 2026-07-07.

## 1. Repo Release Lane

- [ ] Root `Makefile` has release targets:
  - `make release-bump`: bump `CFBundleVersion`, archive, export, upload.
  - `make release`: archive/export/upload without bumping.
  - `make release-ipa`: archive/export only, no upload.
- [ ] TestFlight builds use a `Beta` configuration with Release optimization/signing and any internal-only compile flag, e.g. `INTERNAL_BUILD`.
- [ ] Plain `Release` stays production-facing for App Store submission.
- [ ] Project uses Apple Generic versioning (`MARKETING_VERSION`, `CURRENT_PROJECT_VERSION`) so `agvtool`/`ios-release --bump-build` can bump builds.
- [ ] Add `.release.env` only when auto-detect needs help; do not commit ASC credentials.

Recommended target pattern:

```make
release:
	CONFIGURATION=Beta ios-release

release-bump:
	CONFIGURATION=Beta ios-release --bump-build

release-ipa:
	CONFIGURATION=Beta ios-release --no-upload
```

## 2. Xcode Project

- [ ] `xcodebuild -list -project App.xcodeproj` shows the expected app scheme and build configurations.
- [ ] Bundle IDs are final and unique for the app and every extension.
- [ ] Developer Team is set; signing is automatic unless the repo intentionally manages profiles.
- [ ] Required capabilities are present on the right targets and in Apple Developer Identifiers.
- [ ] Restricted capabilities, such as Family Controls, have distribution approval before App Store submission.
- [ ] Export compliance is declared through build settings or Info.plist (`ITSAppUsesNonExemptEncryption` / `INFOPLIST_KEY_ITSAppUsesNonExemptEncryption`).
- [ ] Privacy manifest exists when the app or SDKs use required-reason APIs or collect privacy-relevant data.
- [ ] Archive entitlements are verified when capabilities matter:

```bash
codesign -d --entitlements - build/App.xcarchive/Products/Applications/App.app
```

## 3. App Store Connect Setup

- [ ] Create the ASC app record: platform, name, primary bundle ID, SKU, user access.
- [ ] Fill App Information: subtitle, category, content rights, age rating.
- [ ] Add privacy policy URL and support URL.
- [ ] Complete App Privacy answers for first-party and third-party data collection.
- [ ] Add TestFlight beta app description, feedback email, and beta review information.
- [ ] Create internal tester group; enable automatic distribution when useful.
- [ ] For external testers, prepare beta review notes and group/public-link criteria.

## 4. Pre-Upload Gate

- [ ] Working tree clean except the intentional build-number bump.
- [ ] Local build/test gate passes for the release branch.
- [ ] App icon includes the 1024px marketing icon.
- [ ] Launch screen is native and nonblank.
- [ ] Privacy/support URLs are live.
- [ ] App-specific reviewer notes cover sensitive permissions, login/demo flow, and reset path.
- [ ] If using restricted entitlements, every entitled app/extension bundle ID is enabled in the developer portal.

## 5. Upload And TestFlight

- [ ] Run `make release-bump`.
- [ ] Wait for processing in ASC TestFlight.
- [ ] If status is `Missing Compliance`, answer/export compliance before testing.
- [ ] When status is `Ready to Submit` or `Testing`, add the build to internal testers.
- [ ] External testers require TestFlight App Review for the first build in a group.
- [ ] Watch TestFlight feedback, screenshots, and crash reports after distribution.
- [ ] Commit the build-number bump after a successful upload:

```bash
git add App.xcodeproj/project.pbxproj
git commit -m "chore: bump build to N"
```

## 6. App Store Submission

- [ ] App listing copy is final: name, subtitle, promotional text, description, keywords.
- [ ] Screenshots meet current device slots; never upload placeholders.
- [ ] Reviewer notes explain core permissions and the fastest happy-path test flow.
- [ ] Select the processed build in the App Store version page.
- [ ] Confirm privacy answers still match the exact submitted binary.
- [ ] Submit for review.
- [ ] After approval, choose manual release, scheduled release, or phased release intentionally.

## 7. Shared Tooling

- `ios-release`: local wrapper from `~/ios-release-toolkit`; delegates archive/export/upload to Xcode and ASC API credentials.
- `~/.config/ios-release/defaults.env`: machine-global `ASC_KEY_ID`, `ASC_ISSUER`, `TEAM_ID`.
- `~/.appstoreconnect/private_keys/AuthKey_<ASC_KEY_ID>.p8`: ASC API key location.

## Sources

- Apple TestFlight overview: https://developer.apple.com/testflight/
- Apple App Store Connect app privacy: https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/
- Apple App build statuses: https://developer.apple.com/help/app-store-connect/reference/app-uploads/app-build-statuses/
- Apple Family Controls entitlement request: https://developer.apple.com/documentation/familycontrols/requesting-the-family-controls-entitlement
