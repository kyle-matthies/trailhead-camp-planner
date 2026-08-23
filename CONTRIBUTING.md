# Contributing

Thanks for helping make group planning calmer, clearer, and safer.

## Before opening a change

- Search existing issues and pull requests.
- For substantial features or schema changes, open a feature request that explains the user problem, role implications, privacy constraints, and intended outcome.
- Use only fictional or anonymized examples. Never add real trip details, credentials, account identifiers, private locations, messages, or photos.

## Local development

Start with the browser-only fictional demo described in the [README](README.md). It requires no account or cloud service.

Run the frontend checks:

```bash
cd frontend
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Run the backend checks when backend code changes:

```bash
cd backend
python -m pip install --require-hashes -r requirements.lock
python -m pytest -q
```

Run `scripts/run-rls-tests.sh` when changing migrations, grants, policies, storage rules, authenticated queries, or role behavior.

## Product and security expectations

- Keep role boundaries understandable in the UI and authoritative in Postgres RLS.
- Keep AI planning separate from execution; a person must review the exact allow-listed changes before a write.
- Preserve the zero-configuration fictional demo and its no-network boundary.
- Update architecture, security, and decision documentation when a change alters a boundary or product rule.

## Pull requests

Keep changes focused. Explain the user problem, product decision, verification performed, and any privacy or permission impact. All required CI checks must pass before merge.
