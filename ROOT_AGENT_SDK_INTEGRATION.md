## RootAgent SDK Integration Notes (`@motus-dao/root-agent`)

**Context**

- **Date**: 2026-03-08
- **Project**: MotusDAO Hub (Next.js + scripts)
- **SDK**: `@motus-dao/root-agent@0.1.0`

---

## Setup & Configuration Experience

- **Install**: `npm install @motus-dao/root-agent` worked smoothly; types are bundled via `dist/index.d.ts`.
- **Config surface (`RootAgentConfig`)**:
  - `celoNetwork: 'mainnet' | 'alfajores' | 'celo-sepolia'` is clear and easy to use.
  - `transakApiKey?: string` is required for funding but not enforced at construction time — only at `fundWallet()`, which is OK but could be called out more explicitly in docs.
  - `selfConfig?: SelfConfig` shape is different from the high-level README (uses `scope/appName/endpoint/endpointType/logoBase64`), so having a dedicated "SelfConfig" section in the README would help.
- **Env mapping**:
  - Created a central helper `getRootAgent()` in `lib/root-agent.ts` that reads:
    - `ROOT_AGENT_CELO_NETWORK` → `celoNetwork`
    - `TRANSAK_API_KEY` → `transakApiKey`
    - `ROOT_AGENT_SELF_SCOPE_ID`, `ROOT_AGENT_SELF_APP_NAME`, `ROOT_AGENT_SELF_ENDPOINT`, `ROOT_AGENT_SELF_ENDPOINT_TYPE`, `ROOT_AGENT_SELF_LOGO_BASE64` → `selfConfig`
    - `ROOT_AGENT_GAS_SPONSORSHIP` → `gasSponsorship`
  - This worked fine, but the SDK docs don’t prescribe any env naming convention; adding a recommended env schema would improve drop‑in DX.

---

## Demo Flow & Runtime Behavior

### What was implemented

- Added shared factory: `lib/root-agent.ts` with `getRootAgent()` singleton.
- Added end‑to‑end script: `scripts/demo-root-agent-flow.ts` that calls:
  1. `createUser({ method: 'email', email })`
  2. `user.fundWallet()`
  3. `verifyUser({ user, method: 'self', scope })` (skipped if Self config is missing)
  4. `createAgent({ owner, name, selfCredentials?, permissions })`

### Observed behavior (with current env)

- **Config summary logged by script**:
  - `celoNetwork: 'alfajores'`
  - `hasTransakKey: false`
  - `hasSelfConfig: false`
  - `gasSponsorship: false`
- **createUser**:
  - Succeeds with `method: 'email'`.
  - Returns a wallet and identifier; `verified` is `false`, `selfId` is `null` as expected.
- **fundWallet**:
  - Fails with error:
    - `message: "root-agent-sdk: transakApiKey is required to fund a wallet"`
  - This is a good, explicit error message, but it surfaced only at call time; the script now logs config summary first so the missing key is obvious.
- **verifyUser**:
  - Skipped in this run because `selfConfig` was not configured; script logs a clear message instead of throwing.
- **createAgent**:
  - Succeeds even without prior `verifyUser` / ZK credentials.
  - Returns a new agent wallet, owner, name, permissions; `selfId` is `null`, which matches expectations when no Self verification has happened.

---

## DX / Ergonomics Feedback

### What worked well

- **Type coverage**:
  - Strong typing for all core concepts (`RootAgentConfig`, `RootUser`, `CreateUserOptions`, `RootAgentInstance`, `Escrow*`, `Self*`) makes usage straightforward in TypeScript.
  - Utility exports (`getCeloProvider`, `getCUSDBalance`, `buildTransakUrl`, `PSYESCROW_ABI`, etc.) give a nice escape hatch for advanced use‑cases.
- **Runtime error quality**:
  - The `fundWallet` error message clearly states that `transakApiKey` is required, which made diagnosis trivial.

### Friction / Improvement Opportunities

1. **Docs vs. actual types for `SelfConfig`**
   - README currently focuses on high‑level `selfConfig` description but doesn’t show the exact `SelfConfig` interface (`scope/appName/endpoint/endpointType/logoBase64`).
   - **Suggestion**: Add a dedicated "SelfConfig" section with the exact type, example env mapping, and recommended `endpointType` values for mainnet vs staging.

2. **Environment variable conventions**
   - There is no canonical env mapping in the docs; integrators must invent their own.
   - **Suggestion**:
     - Document a suggested set of env vars, e.g.:
       - `ROOT_AGENT_CELO_NETWORK`
       - `ROOT_AGENT_GAS_SPONSORSHIP`
       - `ROOT_AGENT_TRANSAK_API_KEY`
       - `ROOT_AGENT_SELF_SCOPE_ID`
       - `ROOT_AGENT_SELF_APP_NAME`
       - `ROOT_AGENT_SELF_ENDPOINT`
       - `ROOT_AGENT_SELF_ENDPOINT_TYPE`
       - `ROOT_AGENT_SELF_LOGO_BASE64`
     - Provide a sample `root-agent.env.example` in the repo and show a small `getRootAgent()` helper in the README.

3. **Config validation / warnings**
   - It’s easy to construct `RootAgent` without critical options (e.g. `transakApiKey`), only to discover missing config later via runtime errors.
   - **Suggestion**:
     - Add an optional `validateConfig()` helper or have the constructor log/warn when:
       - `transakApiKey` is missing but `createUser().fundWallet()` is likely to be used.
       - `selfConfig` is missing but `verifyUser` is called.
     - Alternatively, expose a `root.getConfigSummary()` method that can be logged safely.

4. **Network selection ergonomics**
   - `celoNetwork` supports `'celo-sepolia'`, which is nice, but docs highlight only mainnet/alfajores.
   - **Suggestion**:
     - Extend README "Networks" table to include `celo-sepolia`.
     - Clarify which network is recommended for first‑time integrators and whether Self / Transak staging align with `celo-sepolia`.

5. **Example flows**
   - The README has a strong narrative example (PsyChat), but lacks a minimal "integration test" script that can be copy‑pasted.
   - **Suggestion**:
     - Add a `scripts/demo-flow.ts` example to the repo (similar to the one created here) that:
       - Logs a redacted config summary.
       - Runs `createUser → fundWallet → verifyUser → createAgent → createEscrow` with clear step headers and error formatting.

---

## Suggested TODOs for SDK Repo

- **Docs**
  - Add full `SelfConfig` and `VerifyUserOptions` type snippets to README.
  - Add an "Environment Setup" section with recommended env variable names and a `.env.example`.
  - Extend network table to include `celo-sepolia` and staging recommendations.
- **API / DX**
  - Consider a `RootAgent.validate()` or `RootAgent.diagnostics()` method to pre‑check config and return a list of missing/optional capabilities (e.g. "Transak disabled", "Self disabled").
  - Optionally allow `createAgent` to accept a high‑level `verifiedUser` object from `verifyUser` to reduce manual wiring of `zkCredentials`.
  - Provide a small `createDemoFlow()` helper or example script in the package docs.

