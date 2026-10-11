# PokemonPedia project instructions

Preserve the current application design and the user's work in progress.

Start a continuation by reading `docs/next-session.md` and `docs/implementation-progress.md`, then check Git status before editing. Keep the handoff accurate when completing a batch.

For every implementation batch, update `docs/update-log.json` after each completed step with concrete changes, validation evidence, and remaining limitations. Keep `docs/implementation-progress.md` and README accurate. Before delivering a batch, refresh both `docs/PokemonPedia Improvement Plan.docx` and the matching PDF with the cumulative implementation history. Preserve the original plan as historical context and clearly distinguish completed work from pending validation. Render and inspect the updated documents.

Run type checking, lint, formatting checks, the relevant unit/API tests, and browser scenarios for changed behavior. Data refreshes use the shared cache and lock; do not import upstream data during visits. Never publish or change accounts without an explicit destination and authorization.
