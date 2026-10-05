## Unreleased

- Support DSH `0.2.0-rc.2` explicitly and check its native UI types in CI.
- Resolve the native assembler after Conversation activation to avoid a browser module cycle.
- Keep decorators subscribed to the shared playback controller before slot hooks activate.
- Exclude transient assistant chunks from durable replay state.

## 0.3.1 — 2026-09-24

- Publish from the `memorax-ai` organization repository with updated package metadata.

## 0.3.0 — 2026-09-19

- Migrate playback to native Conversation, Chat and Session services in DSH 0.1.5/0.1.6.
- Project keyed chat reads onto historical nodes and release Session-owned playback state on disposal.
- Require DSH 0.1.5 or 0.1.6; previous releases retain the older DSH baseline.

# Changelog

## 0.2.1 — 2026-08-21

- Make time seeking logarithmic and extend the built-client smoke test across raw events, slider boundaries, reverse playback, and replay exit.
- Add complete English and Simplified Chinese repository documentation.
- Format replay timestamps with the active DSH locale and cover live language switching.
- Publish GitHub Releases and npm packages automatically from version tags.

## 0.2.0 — 2026-08-21

- Add optional simulated typing in the native read-only composer.
- Make time seeking continuous and correct event stepping at both boundaries.
- Add visible loading, failure, and retry states for older history.
- Keep historical Turn Fold clocks static at the replay cursor.
- Reuse historical projections between events and while future live events arrive.
- Improve touch targets, playback accessibility, and narrow-header behavior.
- Add built-client integration coverage for plugin wiring and historical projection.

## 0.1.1 — 2026-08-20

- Publish through npm Trusted Publishing with provenance.

## 0.1.0 — 2026-08-20

- Initial read-only session playback release.
