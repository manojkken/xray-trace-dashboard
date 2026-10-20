# Contributing

Thanks for considering a contribution to `xray-trace-dashboard`.

## Dev setup

```bash
npm install
AWS_PROFILE=your-profile-name AWS_REGION=eu-central-1 npm run dev
```

See `.env.example` for the full list of environment variables. You'll need AWS credentials with `xray:GetTraceSummaries` access to see real data.

## Before opening a PR

- Run `npx tsc --noEmit` and make sure it's clean — this is the same check CI runs.
- Keep the frontend dependency-free. `frontend/traces.html` is intentionally a single file with no build step; Chart.js is the only external dependency, loaded via CDN.
- Match the existing code style (no linter is configured yet, so just follow what's around your change).

## Proposing bigger changes

For anything beyond a small fix — a new panel, a new data source, a schema change — please open an issue first so we can agree on the approach before you put in the work.

## Good first issues

Issues labeled [`good first issue`](https://github.com/manojkken/xray-trace-dashboard/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) are scoped to be approachable without deep familiarity with the codebase.

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
