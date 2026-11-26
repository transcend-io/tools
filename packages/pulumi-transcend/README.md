# @transcend-io/pulumi-transcend

Manage a Transcend organization from `transcend.yml` with Pulumi. It runs the same push, pull, and dry run as `transcend inventory push` and `transcend inventory pull`.

> Pre-release. The plugin is not published yet. Install it from a local build.

## Use

```typescript
import * as fs from 'node:fs';
import * as pulumi from '@pulumi/pulumi';
import * as transcend from '@transcend-io/pulumi-transcend';

const config = new pulumi.Config();

const provider = new transcend.Provider('us', {
  apiKey: config.requireSecret('transcendApiKey'),
  url: 'https://api.us.transcend.io',
});

new transcend.Config('consent', { yaml: fs.readFileSync('./transcend.yml', 'utf8') }, { provider });
```

Without an explicit provider, set `transcend:apiKey` (as a secret) and `transcend:url` in stack config. The default API is the EU host.

`Config.variables` is always stored as a secret in state. When `yaml` or `content` inlines webhook header values or other secrets, wrap those inputs with `pulumi.secret(...)` before passing them to `Config`.

## Behavior

| Pulumi step      | What happens                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| `pulumi preview` | Validates the file, then runs a dry run against the organization. Dashboard drift shows as an update. |
| `pulumi up`      | Pushes the file. A push creates and updates. It is safe to retry.                                     |
| `pulumi import`  | `pulumi import transcend:index:Config name dataSilos,purposes` pulls those sections as YAML.          |
| Remove resource  | Stops managing the slice. Nothing is deleted in the organization.                                     |

A push stages changes. Visitors see consent changes only after you deploy a bundle.

## Limits

- Preview reports a changed resource, not a per-field diff. Use `transcend inventory push --dryRun` for a field-level view.
- The plugin needs Node 22.12 or later on the machine that runs Pulumi.
- Two `Config` resources that write the same section overwrite each other. Use one per section.
