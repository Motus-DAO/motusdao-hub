# SDD — Chat data, ownership, and portability

> Status: **LOCKED** · Owner: product · Written: 22 Oct 2026
>
> Purpose: the decisions made after [SDD-safety-plan.md](./SDD-safety-plan.md) about Psychat, a saved transcript, training, export, FHIR, RootRouter’s working store, and enclaves. It keeps those details from drifting. It is not a penetration test and not a legal opinion.
>
> It does not reopen safety-plan slices 1–7. Slice 2 still ships a visit-only Psychat with session and consent. Slice 7 still ships Bitácora as a wallet-locked journal. Everything in sections 4–8 below starts only after those two slices are done. Feature work still gets its own spec under `specs/` before code.

---

## 1. How to use this document

Two products stay separate. Do not build the second in order to finish the first.

| Product | What the person gets | When |
|---|---|---|
| Own your data | Motus does not keep the chat, or keeps only ciphertext the wallet can open | After safety-plan slices 2 and 7 |
| Train and earn | A later, separate yes to release a readable copy for model training, with its own notice, and a payment for that copy | After the privacy notice in safety-plan slice 6, and only with the third consent in section 4 |

Care does not depend on either yes. The chat and the psychologist session work the same if the person refuses to save, to export, or to train.

---

## 2. Three promises inside Psychat

These promises are not interchangeable. The screen names which one is on.

### 2.1 Default — Motus does not keep the chat

This is safety-plan slice 2. It is the promise that ships first.

- The person is signed in (SIWE). `consentToAIProcessing` is already true. The model is not asked to set that flag.
- The thread lives in the browser for that visit. It is not written to Postgres.
- The screen names the provider actually configured (`AI_PROVIDER`). It says the message is processed in plaintext at request time. It says the chat is not a therapy note, not an expediente, and not emergency care.
- “We do not keep it” means Motus does not store the transcript. It does not mean the provider never saw the words. A no-retention contract with the provider is a contract. It is not client-side encryption.
- Crisis copy points at local emergency resources and the human-session request. The model does not decide risk, diagnosis, or treatment.

### 2.2 Opt-in — the person keeps a copy only their wallet can open

Off by default. A later slice. Not slice 2.

- Turning it on stores ciphertext and an IV on Motus infrastructure. The key is derived in the browser from a second wallet signature, kept in memory, and wiped on sign-out, account change, or tab close. It is not the SIWE login signature.
- Purpose string `motus-psychat-archive`, `keyVersion` 1. Additional authenticated data is the lowercased `eoaAddress`. This purpose is not `motus-safe-notes`. A Bitácora key does not open a saved Psychat, and the reverse also fails.
- Motus cannot read the body. Admins can see that a row exists. They cannot decrypt it.
- The saved chat is still not the clinical chart and not Bitácora. It is the person’s conversation archive.
- Turning it off stops keeping new copies. Deleting removes the ciphertext Motus holds. A provider that already processed a message is outside that delete.
- Losing the wallet key means losing the archive. The screen says that before the first save.

### 2.3 Later — train a model

A third yes. Off by default. It is not implied by “let the chat answer” or by “save my chat.”

- Motus cannot train on ciphertext it cannot read. Training requires the person to release a readable copy, on purpose, after seeing what would leave.
- The notice names the text, the processor, the purpose, how long that copy is kept, and that a model already trained cannot be untrained. Revocation stops future use. It does not erase weights that already exist.
- The payment, if one exists, is for that consented copy. It is not a universal income. It is not proof the text became anonymous. A therapy narrative plus a payout to a wallet can re-identify a person. The notice says that.
- The shared model is not where “this chat should know me better” is solved. That job is per-person memory: a short summary the person can see, correct, and delete. The browser decrypts it and sends it with the next request. The base model does not change. Diagnosis, risk, and treatment stay with a human.
- Mexico’s federal privacy law treats health data as sensitive and requires express consent for a stated purpose. This section does not claim a legal opinion. The privacy notice in safety-plan slice 6 has to exist before any training copy is collected. US or EEA regimes are a separate decision, as that slice already says.

---

## 3. Bitácora stays the journal

Unchanged from safety-plan slice 7.

- Purpose string `motus-safe-notes`, `keyVersion` 1, AAD = lowercased `eoaAddress`, second wallet signature, ciphertext in Postgres.
- Not an expediente. Not a psychotherapy note. A matched psychologist does not see it unless the person later sends an explicit copy into a therapist-readable store. That store does not exist yet.
- Do not encrypt perfil, matches, academy, payments, or video with either key.

---

## 4. Portability

The wallet is the person’s key. It does not, by itself, let another program display the text. Lock-in happens when the file format is private and there is no export.

Publishing these three things removes that lock-in. Motus still cannot read the bodies.

| Published piece | What it is |
|---|---|
| File format | Ciphertext, IV, `keyVersion`, purpose string, and the account address the AAD was built from |
| Key recipe | Second signature, not the SIWE login signature. Purpose `motus-safe-notes` or `motus-psychat-archive`. `keyVersion` 1. AAD = lowercased `eoaAddress`. Web Crypto AES-GCM |
| Export | A button that downloads that package |

Two exits. They are not the same action.

1. **For the person.** They download the package, or they open it on another device with the same wallet. That is own-your-data.
2. **For another professional or another app.** The full diary is not sent. The person chooses a summary, at the moment they say yes. That summary is a copy into a store the receiver can read. It is out of scope until that store exists. Safety-plan decision 6 still holds.

---

## 5. FHIR

FHIR is the language for the second exit. It is not the format of the diary and not the format of `store.json`.

- A consented summary may be a FHIR `DocumentReference` (or a short patient summary) so another system can see whose document it is, the date, and the type.
- The diary and the saved Psychat are not written as `Condition`, `Observation`, or a progress note. Doing that would present them as an expediente. They are not.
- When the body must travel encrypted, FHIR carries the envelope. The wallet package sits inside it. The other system knows what it received. Only the wallet opens the body.
- SMART on FHIR, and any launch into a clinician record, waits until a therapist-readable store exists.

---

## 6. RootRouter and `store.json`

RootRouter is a context engine with three insertion points: the SDK, the OpenAI-compatible proxy (`@rootrouter/proxy`, default `http://localhost:8787`), and the MCP server. They are alternatives, not a stack. Production integration with Psychat is not built.

`store.json` (and the per-project files under `~/.rootrouter/`) is the proxy’s working memory. Each item is plaintext `text` plus an optional vector, token count, and metadata (`ContextItem` in the SDK). The proxy keeps that file and forwards only a budgeted slice to the upstream model. Local TF-IDF or local MiniLM does that ranking without sending the diary to an embedding API.

The process that holds the file is the “network that keeps everything.”

- If Motus hosts that process, Motus has the chats in the clear.
- If the person runs the proxy on their machine, the working network is theirs. Psychat may point its client `base_url` at that proxy. The Hub must not assemble the full history on Motus’s server in that mode.
- The slice that leaves still reaches the model in plaintext for that request.
- Encrypting `store.json` at rest protects a stolen disk only while the proxy is not running, and only if the key is not stored beside the file. The proxy has to open the file to choose the slice. That encryption is not the wallet package and not FHIR.
- Copying the proxy and its file is one way to move the working network. It does not replace the export button in section 4. RootRouter’s JSON shape is an internal version (`PERSIST_VERSION`), not the health-record format.
- Cursor’s IDE chat does not follow a custom `base_url`. Codex needs an explicit provider config. Antseed’s pattern is the reference for “each person runs their own host”: a local OpenAI-compatible proxy, a changed base URL, a Codex wrapper, and a keyed tunnel when the client (Cursor) calls from somewhere that cannot see `localhost`. Psychat can set the base URL because Motus owns that client. A tunnel is only needed when the proxy must answer from outside the person’s computer.
- RootRouter does not hold the wallet key and does not index Bitácora. It runs after the browser has decrypted what the person chose to use. Optional Celo telemetry stays a summary of routing, not the journal text.

---

## 7. Offering a TEE

A TEE can host the working proxy. It is a room on a server whose memory the host operator does not get to read, if the confidential VM is set up correctly and the person checks the measurement.

The person does not administer the machine. The product is a switch:

1. They turn on “context in an enclave.”
2. The app requires an attestation that the code hash is the published RootRouter build.
3. Only then does the wallet release the key into that room.
4. Psychat uses that proxy as its base URL.
5. If attestation fails, nothing is sent.

Three ways to offer it:

| Offer | What runs | What the person is promised |
|---|---|---|
| Their own computer | Local proxy, no TEE | The working file is on their disk |
| Session enclave | Motus starts a room, the history is used, the room is destroyed | Motus bills the compute. The durable copy remains the wallet package |
| Always-on enclave | A private proxy that stays up | Higher cost. Only when they want it while their own computer is off |

The guarantee is the measurement of the published build. If Motus writes the code inside the enclave, and the person cannot check that measurement, the TEE is a Motus server under another name. Whoever’s code runs inside can read the file. Attestation is what makes that readable code a specific, published build.

Venice’s TEE mode covers the model call, the slice that already left. It does not cover the long working history. The two rooms can sit in sequence: RootRouter’s enclave holds the history, the model enclave answers from the slice.

Side channels, deletion by the host, and downtime remain. The wallet package is still how the person leaves.

---

## 8. Claims this document does not allow

- “HIPAA certified”, “GDPR compliant” as a badge, “expediente”, or “end-to-end encrypted” while the provider receives plaintext.
- “We do not retain your IP.” Vercel, the database, and the video hosts see addresses. The privacy notice says so.
- “Anonymized therapy text is safe to sell.” A city, a family, or an episode can re-identify someone. A token paid to their wallet joins the payment back to them.
- Training, saving, or selling as a condition of using the chat or seeing the psychologist.
- Putting the diary or `store.json` on IPFS, Arweave, Walrus, or Arkiv. Those networks fight deletion. The durable copy stays on infrastructure Motus can delete, as ciphertext.
- Indexing Bitácora or the saved Psychat into a RootRouter store Motus can search.

---

## 9. Order

1. Safety-plan slice 2 — session, consent, visit-only Psychat, honest provider line.
2. Safety-plan slice 7 — Bitácora ciphertext, after slices 1 and 2, as that plan already orders.
3. Export format and the download button for Bitácora, using the key recipe already fixed in slice 7.
4. Psychat opt-in archive (`motus-psychat-archive`), off by default, with the same export.
5. Consented summary, FHIR envelope only at this step.
6. Privacy notice (safety-plan slice 6) before any training copy or token.
7. Local RootRouter proxy as an optional base URL. Session enclave only after attestation is real. Always-on enclave last.

A step is done only when its own `specs/` file is green under the repo QA gate.

---

## 10. Sources for this split

Decided in conversation on 22 Oct 2026, against the locked safety plan and the RootRouter repo at `packages/proxy` and `packages/sdk/src/select`.

- Safety plan: visit-only Psychat, Bitácora purpose `motus-safe-notes`, no transcript archive inside slice 2, therapist-readable copy is a different store, clinical decisions stay human.
- Clinical policy (patient-owned memory): the person decides what may be used for research or model improvement, and can revoke that permission. Revocation does not untrain a model.
- Venice: chat history is local to the browser; “persist” is a browser setting; cross-device is an encrypted backup the operator cannot open; TEE and E2EE are separate badges from “Private” no-retention. A no-retention contract is not client-side encryption.
- RootRouter: `FileContextStore` persists plaintext `ContextItem.text`. The proxy trims what is forwarded and fails open. Cursor IDE chat does not use the proxy `base_url`. MCP, proxy, and SDK are alternative insertion points.
- Antseed: each person runs a local OpenAI-compatible buyer (`http://localhost:8377/v1`). Codex is pointed at it by a wrapper because Codex ignores `OPENAI_BASE_URL`. Cursor needs a public tunnel because some of its requests do not originate on the machine.
- FHIR: use it as the envelope for a consented summary. Do not use clinical resources to impersonate an expediente.
