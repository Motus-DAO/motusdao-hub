# Security patching — October 2026 advisories

> **Last verified:** 2026-11-06 · Scope: Hub web app, dependencies, CI/runtime.
> This is an operational record, not a claim of complete vulnerability coverage.

## What was announced

| Ecosystem | Advisory | Affected here? | Fixed / action |
|-----------|----------|----------------|----------------|
| **Next.js** | [Oct 14, 2026 security update](https://nextjs.org/blog/nextjs-security-update-october-14-2026): `use cache` RCE ([GHSA-673q-mjm6-r5xr](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr)) | **No**: Next 16.x with Cache Components; we had 15.5.9 and no `use cache` | Upgrade anyway |
| **Next.js** | SVG image-optimizer RCE ([GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw) / [CVE-2026-96889](https://www.cve.org/CVERecord?id=CVE-2026-96889)) | **Yes**: Next 10–15.5.27 + `sharp` < 0.35.5; we had 15.5.9 + `sharp` 0.34.3 | Next **15.5.29** + `sharp` **0.35.5** |
| **Next.js** | Server Actions DoS ([GHSA-p3m5-59mp-jv5r](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r)) | **No current app code**: no `use server` directives | Upgrade anyway |
| **React** | Upstream advisories referenced by the Next update (`GHSA-xqc2-xf4c-x3h3`, `GHSA-h3gv-c5rc-p453`) | **Yes**: React 19.2.3 | React / React DOM **19.2.9** |
| **Node.js** | [Oct 21, 2026 security releases](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases): Brotli RCE `CVE-2026-111497`, DNS NUL truncation, TLS hostname bypasses | **Yes**: local 22.23.2; CI was on Node 20 (EOL) | Node **22.23.4+**; CI **22** with `check-latest` |
| **PHP** | PHP fixes released 2026-10-21: 8.5.12, 8.4.27, 8.3.36, 8.2.35 | **No**: no `.php` files, no `composer.json` | No action in this repo |
| **npm (PostHog)** | `posthog-js` 1.434.15 bundled DOMPurify 3.4.16 (critical XSS bypass advisories) | **Yes**: provider mounted globally | `posthog-js` **1.447.3** + `dompurify` **3.4.17** override |
| **npm (PostCSS)** | PostCSS <= 8.5.22 (file read / XSS in stringify) | Build-time only | `postcss` **8.5.32** override |

## What changed in the repo

```text
next          15.5.9   -> 15.5.29
react         19.2.3   -> 19.2.9
react-dom     19.2.3   -> 19.2.9
posthog-js    1.434.15 -> 1.447.3
sharp         0.34.3   -> 0.35.5 (direct dependency, so Next resolves it)
eslint-config-next 15.5.7 -> 15.5.29
overrides: dompurify ^3.4.17, postcss ^8.5.32
engines.node: >=22.23.4
CI: node-version 22 + check-latest (was 20)
```

## Why the reachable risks mattered

- `/pagos`, perfil and therapist pages use `next/image`; `remotePatterns` allow Supabase public objects
  and `i.postimg.cc`. `dangerouslyAllowSVG` is **not** enabled, which reduces the SVG path, but the
  optimizer with `sharp` 0.34.3 was still a real CVE surface (including AVIF). Patching closes it.
- PostHog is mounted globally (`components/PostHogProvider.tsx`) and pulled DOMPurify 3.4.16 into the
  client bundle; that is a browser XSS surface, so it was patched even though the app does not render
  untrusted HTML through it.
- There are **no Server Actions** (`grep -r "use server"` returns nothing), so the Server Actions DoS
  advisory did not apply to current app code. We upgraded anyway.
- There is **no PHP** in the repo. Wix is a SaaS, and Jitsi is Java/Lua; if a separate PHP/WordPress
  host exists, it must be patched on its own.

## Verification (2026-11-06)

| Check | Result |
|-------|--------|
| `npm run lint` | ✅ 0 errors, 22 warnings |
| `npx tsc --noEmit` | ✅ |
| `npm test` | ✅ 33 files, 123 tests |
| `npm run build` | ✅ |
| `npm audit --omit=dev` | 148 vulnerabilities: 15 low, 52 moderate, 76 high, 5 critical. **`next`, `posthog-js` and `dompurify` are clean.** |

## Remaining audit debt (not runtime-reachable today)

The 5 production criticals are transitive:

- `form-data`, `request`, `tar`, `proxy-addr` → `@motus-dao/root-agent` → `@celo/contractkit` →
  `web3@1.10` → `web3-bzz` / `swarm-js` / `express`. `@motus-dao/root-agent` is imported only by
  `lib/root-agent.ts` and demo scripts, **not by an app route**.
- `protobufjs` → `web3.storage`. No imports of `web3.storage` were found in `app/`, `lib/` or
  `components/`.

High-severity direct packages that still need a planned upgrade (not a blind `npm audit fix --force`):
`@prisma/client` (via the Prisma CLI), `@lighthouse-web3/sdk`, `@privy-io/react-auth` (optional
provider), and the Solana peer packages required by Privy.

## Next steps

1. **Confirm Vercel uses Node 22.x with patch >= 22.23.4.** `engines` sets a floor; the Vercel
   project dashboard controls the actual runtime.
2. **Retire or move demo-only dependencies.** Removing `@motus-dao/root-agent` and `web3.storage`
   (if the scripts and NFT upload path no longer use them) removes the 5 criticals above.
3. **Upgrade Lighthouse, Privy and Prisma in separate PRs** with `npm test`, `tsc`, `build` and an
   `npm audit --omit=dev` diff.
4. **Re-run this checklist monthly** and after any dependency change. Treat new Next/React/Node
   advisories as P0.

## Rollback

`git revert <commit>` restores `package.json`, the lockfile and CI. Do **not** downgrade Next below
15.5.28 while CVE-2026-96889 is public.
