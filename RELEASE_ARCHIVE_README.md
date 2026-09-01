# Open Prep Static Release Archive

This archive contains a prebuilt, local-first Open Prep web application. It does not need Node.js or a server-side application runtime after deployment.

## Deploy

1. Extract the archive while preserving its single top-level directory.
2. Publish the contents of that directory at the origin root of an HTTP(S) static host, such as `https://practice.example.com/`.
3. Configure the host to apply the response headers in `_headers`, or their equivalent, and to serve each exported route's `index.html` file.
4. Open the hosted origin in a supported browser. HTTPS is required for normal service-worker and installable-PWA behavior; `http://localhost` may be used for local verification.

Opening `index.html` directly with a `file://` URL is unsupported. The app expects origin-root paths and browser service-worker behavior.

The app has no API or account requirement. Practice data remains in that browser profile unless the user explicitly downloads an export or backup. Clearing browser storage can remove local data.

## Verify

The files distributed beside this archive include `SHA256SUMS` and a provenance JSON document. Verify the archive checksum before deployment. `LICENSE`, `BUNDLED_CONTENT_LICENSE.md`, and `THIRD_PARTY_NOTICES.md` are included inside the archive.
