# CI

Review Consent Manager changes in pull requests. Push them when the pull request merges.

| Event               | Command                                                    |
| ------------------- | ---------------------------------------------------------- |
| Pull request opened | `transcend inventory push --file ./transcend.yml --dryRun` |
| Merge to main       | `transcend inventory push --file ./transcend.yml`          |

A push does not deploy. Deploy by hand with the MCP tools, or with `transcend consent update-consent-manager --deploy` (this also upgrades airgap.js to the latest version).

## API keys

Create one API key per organization with the scopes the yml sections need. Store it in the CI secret store. Pass it with `--auth`, or set `TRANSCEND_API_KEY`. Use a read-only key for the dry run if your scopes allow it.

## GitHub Actions sketch

```yaml
name: Consent as code

on:
  pull_request:
    paths: ['transcend.yml']
  push:
    branches: [main]
    paths: ['transcend.yml']

jobs:
  consent:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Preview
        if: github.event_name == 'pull_request'
        env:
          TRANSCEND_API_KEY: ${{ secrets.TRANSCEND_API_KEY }}
        run: npx -y -p @transcend-io/cli transcend inventory push --file ./transcend.yml --dryRun
      - name: Push
        if: github.event_name == 'push'
        env:
          TRANSCEND_API_KEY: ${{ secrets.TRANSCEND_API_KEY }}
        run: npx -y -p @transcend-io/cli transcend inventory push --file ./transcend.yml
```

Check `transcend inventory push --help` for the exact auth flag and binary name in your CLI version.

## Tips

- Add `--json` with `--dryRun` to print the plan as JSON. Post it as a pull request comment.
- Keep the file small. Pull only `consentManager,purposes,dataFlows,cookies,consentSites` with `transcend inventory pull --resources`.
- Use a protected environment for the push job so a person approves each production push.
- Keep the domains rule in review. A pull request that shortens `consent-manager.domains` removes hosts on push.
