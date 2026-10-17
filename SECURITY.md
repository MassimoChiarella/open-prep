# Security Policy

## Supported Version

Security fixes are applied to the latest code on the default branch and the latest published release.

## Reporting A Vulnerability

Use the repository's **Security** tab and **Report a vulnerability** action to send details privately. Do not disclose exploitable details in a public issue.

Include the affected route or file, reproduction steps, expected impact, browser and operating system, and any suggested mitigation. If private vulnerability reporting is not yet available, contact the repository owner through their GitHub profile before sharing technical details.

Reports involving local progress storage, content-pack parsing, service-worker behavior, dependency integrity, or unintended network transmission are in scope.

Conduct concerns are governed by the [Code of Conduct](CODE_OF_CONDUCT.md). It uses the repository's private Security intake with a `Conduct report:` title only as a confidential reporting channel; that does not classify the concern as a vulnerability.

## Dependency maintenance — 17 October 2026

The lockfile patches sharp to 0.35.5 (librsvg 2.63.2) and source-map-js to 1.2.2. A pinned `postcss-selector-parser` 7.1.6 override covers Tailwind 3/PostCSS-nested paths whose declared ranges still select the affected 6.x parser. Keep the override until those parents accept a patched release; selector compatibility, the production CSS build and browser checks must pass when changing it. See the [sharp](https://github.com/advisories/GHSA-wq5f-xc86-pv6w), [source-map](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), and [selector-parser](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) advisories.

**Remaining upstream constraint:** [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) affects braces 3.0.3, and the checked registry has no patched release. Its current paths are build/lint/watch tooling through micromatch, fast-glob, Tailwind and Next's ESLint configuration. The static browser application does not import braces or send locally imported practice content to these glob parsers. This limits the demonstrated exposure; it does not fix the package or make its advisory disappear.

Treat build/lint configuration and repository code as executable input, isolate unreviewed builds, and keep deployment credentials out of those jobs. Reassess the exception when a patched braces release or compatible parent-toolchain replacement becomes available; rerun the advisory inventory and normal release checks. Do not force an unrelated framework/config downgrade or remove practice features to obtain a green advisory count. The [remediation ledger](AUDIT_REMEDIATION_2026_10_17.md) records the exact remaining inventory and validation.
