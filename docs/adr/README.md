# Architecture decision records

Short records of decisions a reviewer would ask "why?" about. Add new ones with the `write-adr` skill ([`.claude/skills/write-adr/SKILL.md`](../../.claude/skills/write-adr/SKILL.md)). Project rules that follow from them are in [`CLAUDE.md`](../../CLAUDE.md).

| ADR                                  | Decision                                                              | Status   | Applies to |
| ------------------------------------ | --------------------------------------------------------------------- | -------- | ---------- |
| [0001](0001-pharmacy-data-source.md) | Pharmacy data from OpenStreetMap via Overpass, called from the client | Accepted | web, iOS   |
| [0002](0002-minimal-dependencies.md) | Minimal runtime dependencies                                          | Accepted | web        |
| [0003](0003-geocoding.md)            | Digitransit behind a narrow proxy (web), Apple on iOS                 | Accepted | web, iOS   |
| [0004](0004-hosting.md)              | One Cloudflare Worker with static assets                              | Accepted | web        |

This repository is the web app. The iOS app lives in its own repository. ADRs marked "iOS" record decisions both apps share.
