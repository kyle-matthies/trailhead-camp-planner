# Security policy

## Supported version

Security fixes are applied to the current `main` branch and latest tagged release.

## Reporting a vulnerability

Please use [GitHub private vulnerability reporting](https://github.com/kyle-matthies/trailhead-camp-planner/security/advisories/new). Do not open a public issue for vulnerabilities, credentials, private data exposure, authorization bypasses, or unsafe AI-authored writes.

Include the affected commit or version, reproduction steps using synthetic data, expected impact, and any suggested mitigation. Do not access or retain data that does not belong to you.

## Security boundaries

- The fictional demo is browser-only, in-memory, and must make no network requests.
- Connected mode relies on explicit Postgres grants and row-level security; UI permission checks are not an authorization boundary.
- The optional API forwards the signed-in member's JWT for data writes and must not bypass RLS.
- AI suggestions require review of an allow-listed change set before execution.
- Credentials and hosted-project identifiers belong only in ignored local configuration or deployment secret stores.

See [docs/security-and-privacy.md](docs/security-and-privacy.md) for the threat model and operational checklist.
