# Potential future feature: Jev for Codriver routing

Status: first version implemented, see "Jev routing" in `docs/codriver-plan.md`. The API details were checked against TypeSafe's documentation (docs.typesafe.ai): the direct endpoint is `POST /v1/systemone`, and the request pins `jev-1.13.0`.

Jev is TypeSafe's "System One" decision model. It does not generate text: it takes a `state` (the text to judge) and a map of typed questions, and returns calibrated probabilities. There are three question types: Choice (pick one of a fixed set of options), Noul (a yes/no question answered as a probability) and Score (a position on an ordered scale). It is reachable directly at `api.typesafe.ai` with a key from console.typesafe.ai, or through OpenRouter (`typesafe/jev-1.13` on `/api/alpha/decisions`), Portkey and DigitalOcean. Published figures are 70-500 ms per call and $0.042 per million input tokens, with output free; these are vendor numbers, not benchmarks.

## Where it fits, and where it does not

Jev cannot replace the Haiku planning call. Most Codriver tools need arguments (map names, settings, player logins, TMX searches), and Jev only chooses between options it is given. Composing replies and splitting steps also stay as they are, since both produce text.

Planning is already cheap: at the prices in `usage.ts` a narrowed planning call costs about $0.0005, and Jev's input price is only about 2.4 times lower than Haiku's. The value of Jev is therefore mainly consistency (fewer misroutes and retries), plus skipping the model entirely for argument-free commands.

## Suggested first version

### 1. Fallback router

`routeRequest` in `router.ts` uses keyword lists. When no keyword matches, `route.fallback` is true and the categories are a guess (`maps`, `mode`, `info`), which costs extra attempts in `runCodriver`: a second try with every tool, and the `cannotDo` retry when a keyword sent the request to the wrong area ("red bull faster" hits the red team).

Keep the keyword router as the first step, since it is free and instant. Only when `route.fallback` is true, ask Jev for one Noul question per category ("Does this request ask about <category description>?") with the request as the state, and offer Haiku the tools of every category above a threshold (for example 0.5). If no category passes, or Jev fails or times out, keep today's fallback behaviour. A confident Jev route counts as a real route, so it no longer triggers the guessed-route retry with every tool.

### 2. Fast path for reworded commands

`parseFastPath` in `fast-path.ts` only matches exact wording. Many of its commands take no arguments (`skip_map`, `restart_map`, `pause_match`, `clear_jukebox`, `get_server_state`, `get_mode_settings`, `list_plugins`, `reload_plugins`, `codriver_help`). When the exact match fails and the request is short, ask Jev one Choice question over those commands plus `other`. Above a high threshold (for example 0.9), run the command without Haiku; it still goes through the same role, validation and confirmation checks as an exact fast-path command. Below the threshold, or on any Jev error, continue to normal planning.

Commands with arguments (plugin toggles, pause versus unpause) only take the Jev path when the argument is fixed by the chosen option, such as separate `pause` and `unpause` options. Requests with "and", "then" or "also" skip the Jev fast path, like the plugin toggle does today.

### Implementation shape

- A `JevClassifier` interface next to `CodriverModel` in `model.ts`, so tests and evals can swap it out, with a `createJevClassifier(apiKey)` that calls the HTTP API with a short timeout (about 1.5 s) and no retries.
- The classifier is optional in `CodriverOptions`; without it, Codriver behaves exactly as today.
- Jev usage is recorded alongside `ModelUsage`, with its price in `costMicros`, so budgets and request history include it.
- A panel-level setting with its own encrypted key, since servers bring their own Anthropic key and Jev needs a separate one. Off by default.
- Logs record when Jev changed the route or took the fast path, with its probability, so thresholds can be tuned from real requests.

## Measuring it

- Extend `scripts/codriver-eval.ts` with a routing check that needs no Haiku calls: does the Jev category set contain the categories of the expected tools, compared with `routeRequest`? Run the fast-path classifier over `eval/cases.json` and count false positives (a command chosen where the case expects something else); this number must stay near zero.
- In production, `codriverRequests` already records `modelCalls`. The share of requests with more than one model call shows how often retries are paid for, which is what the fallback router should reduce. The share of fast-path requests shows the saving from the second part.

## Risks and open questions

- A second third party receives player chat. This needs to be added to `docs/codriver-plan.md` and the security documentation, and operators should be told before enabling it.
- Each Jev call adds latency before planning. Limiting it to fallback routes and short requests keeps common requests unaffected.
- The OpenRouter endpoint is marked alpha and Jev is new, so field names and model versions may change. Every Jev failure must fall back to the current behaviour.
- A fast-path false positive runs a command the player did not ask for. Commands that change the server (skip, restart, clear jukebox) need a high threshold, and the cases for them should be part of the eval set.
- Later candidates, once the first version proves itself: a Noul check replacing the keyword-based `looksIncomplete`, recognising confirm and cancel replies beyond the fixed word lists, and tagging `/feedback` notes.
