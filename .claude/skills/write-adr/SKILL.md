---
name: write-adr
description: Record an architecture decision as a short ADR in docs/adr/. Use when choosing or changing a dependency, data source, hosting, state approach or anything a reviewer would ask "why?" about, or when a change would contradict an existing ADR.
---

# Write an ADR

1. **Read first.** Read [`docs/adr/README.md`](../../../docs/adr/README.md) and any ADR your decision touches. Don't contradict an accepted ADR silently: supersede it (step 7).
2. **Number it.** List `docs/adr/` and take the next number after the highest one. Filename: `NNNN-short-kebab-title.md`.
3. **Get today's date** with `date +%F`. Don't guess it.
4. **Use this template** (it matches the existing ADRs):

   ```markdown
   # N. Title as a decision ("Use X for Y")

   - Status: Proposed
   - Date: YYYY-MM-DD
   - Applies to: web app | iOS app | both

   ## Context
   The problem and the forces at play. What would break or be harder without a decision.

   ## Decision
   What we do, stated plainly. Include the key details (config, query, versions) a reader needs.

   ## Consequences
   **Good**
   - ...

   **Bad, and how we handle it**
   - ...

   ## Alternatives considered
   - Option: why not, in one line.
   ```

   If the options compare well in a table (as in ADR 0001 and 0003), put the table in Context and drop "Alternatives considered". When a decision is revisited later, add a dated "Revisited" section instead of rewriting history.

5. **Keep it short:** about one screen. Write it for a reviewer who wasn't in the conversation. Prefer concrete reasons over general principles.
6. **Status stays `Proposed`** until the user accepts it. Then change it to `Accepted`.
7. **Superseding:** if this replaces an earlier ADR, set the old one's status to `Superseded by NNNN` and link both ways.
8. **Cross-reference.**
   - Link related ADRs with relative links, for example `[ADR-0003](0003-geocoding.md)`.
   - Add a row for it to the table in `docs/adr/README.md`.
   - If it changes a rule in [`CLAUDE.md`](../../../CLAUDE.md) (stack, ground rules, scope), update that rule and link the ADR there. Update the README if setup or commands change.
