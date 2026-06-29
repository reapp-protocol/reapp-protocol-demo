# vendor/reapp-cli.mjs

A self-contained bundle of the **reapp-protocol-cli** (`reapp` command), used by
`/api/cli` so the `/t2/demo` terminal runs the *real* CLI server-side.

Why bundled (not `npx`): the bundle inlines `@reapp-sdk/core` from the
**reapp-protocol workspace**, which carries the tranche-2 settlement fix
(`timeoutInSeconds` on `execute_payment`). The published `@reapp-sdk/core@0.2.0`
lacks it, so `npx reapp-protocol-cli` would be flaky on a slow testnet. Bundling
the fixed core makes the demo reliable. `@stellar/stellar-sdk` is left external
and resolved from this app's `node_modules` at runtime.

## Regenerate

From the `reapp-protocol` repo:

```
npm run cli:bundle
cp packages/cli/dist/reapp-cli.bundle.mjs ../reapp-protocol-demo/vendor/reapp-cli.mjs
```

Re-run whenever the CLI or the core settlement logic changes.
