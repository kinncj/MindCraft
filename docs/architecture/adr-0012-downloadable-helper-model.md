# ADR-0012: A downloadable on-device language model for villager chat

**Status:** accepted

## Context

Rule-based chat understands the requests a six-year-old makes most often, but
not free-form phrasing ("a little pink cottage by the water"). The browser's
built-in model (ADR-0011) only exists in some Chromium builds. The user asked
for a real small LLM behind a download button.

## Decision

- **Model:** `Qwen2.5-0.5B-Instruct-q4f16_1-MLC` via **WebLLM** on WebGPU,
  about 400 MB once, run in a Web Worker with a 1k-token context window. It is
  the smallest model that reliably follows "answer only in JSON with these
  tools"; the id is a parameter so a bigger model can be offered later.
- **Consent and privacy:** Menu → Friends → "Download a smarter helper" shows
  the size, the fact that the weights come from the model's host on the
  internet, and that nothing the child types leaves the device. This is the
  single deliberate exception to "no external requests at runtime" (README),
  and it never happens without a grown-up tapping twice. The model stays in the
  browser cache; "Remove helper" deletes it. A previously downloaded helper
  loads from the cache in the background on the next start.
- **Safety:** the same JSON-only protocol, tool allowlist, reply cap, URL
  stripping, and deny-list as the built-in provider; anything that fails falls
  back to the rules. The system prompt names the child's age and forbids
  scary or unkind content.
- **Order:** outside agent → helper (if enabled and loaded) → built-in (if
  enabled) → rules.

## Consequences

- WebLLM is its own lazy chunk; the main bundle does not grow.
- The provider is tested with a fake engine; the real model is exercised only
  in a browser with WebGPU.
- `entity_list` and the chat panel show which provider answered.
