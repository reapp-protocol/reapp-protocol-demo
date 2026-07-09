# vendor/reapp-cli.mjs

A self-contained bundle of the **reapp-protocol-cli** (`reapp` command), used by
`/api/cli` so the hosted terminal runs the real CLI server-side.

Why bundled (not `npx`): the bundle inlines `@reapp-sdk/core` from the
**reapp-protocol workspace**, keeping the hosted demo pinned to the exact CLI
source used for the site. `@stellar/stellar-sdk` is left external and resolved
from this app's `node_modules` at runtime.

## Regenerate

From the `reapp-protocol` repo:

```
npm run cli:bundle
cp packages/cli/dist/reapp-cli.bundle.mjs ../reapp-protocol-demo/vendor/reapp-cli.mjs
```

Re-run whenever the CLI or the core settlement logic changes.
