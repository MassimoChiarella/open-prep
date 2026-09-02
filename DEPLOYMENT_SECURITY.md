# Deployment Security Contract

Open Prep is an origin-root static PWA. Official releases must be served over
HTTPS from `/` and must preserve the generated `_headers` file or configure the
same response headers through the hosting provider.

## Required Headers

The verified build generates these provider-neutral protections for all paths:

- `Content-Security-Policy` limits runtime resources to the same origin, blocks
  objects and framing, and contains SHA-256 allowances for the exact inline
  scripts emitted by that build. It never permits `unsafe-eval`.
- `X-Content-Type-Options: nosniff` prevents MIME sniffing.
- `Referrer-Policy: no-referrer` avoids sending route details in the HTTP
  `Referer` header.
- `Permissions-Policy` disables unused device capabilities.
- `X-Frame-Options: DENY` provides framing protection for older clients in
  addition to CSP `frame-ancestors 'none'`.

The generated CSP uses `style-src 'self' 'unsafe-inline'` because application
components and charts use inline presentation attributes. Script allowances are
hash-based and generated from the exact HTML bytes; do not hand-edit or reuse a
`_headers` file from another build.

The deployed-origin checker parses this policy and requires the generated
directive/source contract exactly, except that `script-src` contains the
build-specific SHA-256 values. Added wildcards, network schemes, external
hosts, duplicate directives, or broad script allowances fail the check.

## Host Configuration

- Publish the verified archive's single top-level directory at the origin root.
- If the host supports `_headers`, deploy the generated file unchanged. On other
  hosts, configure the same names and values from that file.
- For Vercel, run `npm run vercel:prepare` after the clean verified build and
  publish with `vercel deploy --prebuilt`. The generated Build Output API routes
  apply the exact `_headers` values; do not copy CSP hashes into a permanent
  configuration file. Disable Vercel Toolbar in the deployment environments.
- Keep `sw.js` revalidated rather than immutable. Hashed `_next/static/` assets
  may use long-lived immutable caching.
- Serve correct MIME types and enable Brotli or gzip for compressible files.
- Add HSTS only after the production domain and every required subdomain are
  confirmed to work exclusively over HTTPS.
- Run the post-deployment smoke command against the final HTTPS origin and record
  the result in `RELEASE_CHECKLIST.md`.

```bash
npm run postdeploy:check -- https://practice.example.com/
```

The origin must be an explicit credential-free HTTPS origin root. The command
uses a fresh Playwright context and synthetic local data; it does not inspect
or transmit learner records. It blocks cross-origin HTTP(S) requests and
non-GET/HEAD requests during the exercised routes, except for
`POST /_vercel/insights/view` on `https://openprep.app` with a validated pageview
payload and a reported page URL without query strings or fragments. Other
writes remain blocked. Historical release upgrades,
failed worker installation, IndexedDB retention, and broader private-data
workflows remain separate release-checklist evidence. A host-specific failure
must be resolved and the command rerun before hosted release evidence is marked
complete.

These headers do not add a server runtime. The authorized production Vercel
Web Analytics integration loads `/_vercel/insights/script.js` and sends page
views to `/_vercel/insights/view` on the same origin, so it requires no CSP
expansion. Analytics is excluded from service-worker caches, respects Do Not
Track, and is skipped offline; it is not required for practice or local saving.
Vercel may also collect referral information and standard visitor metadata;
see the [privacy disclosure in README.md](README.md#privacy-and-local-data).
