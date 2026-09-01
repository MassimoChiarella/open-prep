# Open Prep Browser Support

Open Prep supports the current stable desktop browser families listed below.
"Current stable" means the production release available when a release
candidate is tested, not a fixed major-version floor. Maintainers record the
exact browser and operating-system versions for each release; this policy does
not promise indefinite support for older releases, beta channels, or every
browser and operating-system combination.

## Supported Browser Families

| Browser family | Required branded-browser check | Automated signal |
| --- | --- | --- |
| Google Chrome, current stable | Windows, when an available Windows device is part of the release check | Playwright Chromium |
| Microsoft Edge, current stable | Windows, when an available Windows device is part of the release check | Playwright Chromium |
| Mozilla Firefox, current stable | One available Windows or macOS device | Playwright Firefox |
| Apple Safari, current stable | macOS, when an available macOS device is part of the release check | Playwright WebKit |

The reference operating systems above define a bounded release check, not an
OS-specific product restriction. Other current browsers may work, but they are
not part of the release gate unless this policy is updated with repeatable
evidence.

Core practice, local IndexedDB storage, and same-origin offline behavior are
expected in each supported family. Browser-local data remains tied to the
browser profile and site origin; use the app's export and import controls when
moving it between browsers.

## Automation Boundary

- `npm run e2e` runs the complete functional and visual suite in Playwright
  Chromium. Chromium remains the authoritative visual-baseline environment.
- `npm run e2e:cross-browser` runs only the stable `@browser-smoke` journeys in
  Playwright Chromium, Firefox, and WebKit. Failures retain diagnostic traces
  and screenshots; Firefox and WebKit do not have golden visual baselines.
- Playwright's Chromium, Firefox, and WebKit projects are controlled test
  engines. They are useful compatibility signals, but they are not the branded
  Google Chrome, Microsoft Edge, Mozilla Firefox, or Apple Safari applications.
  In particular, Playwright WebKit does not substitute for a real Safari check
  on macOS.
- Chromium and Firefox automation exercise an offline route navigation. Because
  Playwright WebKit's offline-navigation emulation can fail inside the engine,
  its smoke verifies the installed cache response and offline local interaction;
  the real Safari route-restart check below remains required.
- Link traversal in Safari/WebKit also depends on the operating system's Full
  Keyboard Access setting. WebKit automation verifies skip-link focus and
  keyboard activation directly; the real Safari check must verify Tab discovery.

## Bounded Manual Release Check

Use a verified release candidate on its intended HTTPS origin and synthetic
practice data. On current stable Chrome and Edge on an available Windows
device, current stable Firefox on one available Windows or macOS device, and
current stable Safari on an available macOS device:

1. Open the home page, a direct core route, and an unknown route; use the
   keyboard to reach and activate the primary workflow.
2. Complete one generated drill and one exhibit question, reload, and confirm
   the saved results remain available in the same browser profile.
3. Change the theme and interface locale, reload, and confirm both persist;
   include one RTL locale in the release-candidate matrix.
4. Warm the app online, disable the network, and confirm a core offline route
   and one saved-practice interaction still work.

Treat a missing device or branded-browser run as `Not run`, not as a pass
inferred from Playwright. Under the release process, an uncompleted required
check remains release-blocking until it is run or a documented central review
changes the policy.

## PWA Installation And Updates

Operating-system and browser installation surfaces are manual QA. Where the
browser offers installation, inspect the displayed name and icons, standalone
launch, warmed offline restart, retained local data, and a subsequent app
update. If a browser or operating system does not expose an install or update
surface, record that platform limitation rather than treating an engine test
as evidence that the UI exists.

Record exact versions, date, reviewer, source revision or release candidate,
origin, result, evidence, and limitations in a fresh copy of the
[release checklist](RELEASE_CHECKLIST.md). Evidence must contain only synthetic
data.

This policy does not add a full visual matrix, native launchers,
platform-specific installers, configurable base paths, accounts, cloud sync,
analytics, runtime AI, or external APIs.
