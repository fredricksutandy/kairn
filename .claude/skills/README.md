# Vendored agent skills

These are committed to the repo on purpose. A `/plugin install` writes to
`~/.claude/plugins/` on one machine and never leaves it — cloud sessions get a
fresh container and see nothing. Skills committed here load everywhere: local
CLI, Claude Code on the web, and for anyone who clones.

## ponytail

Source: <https://github.com/DietrichGebert/ponytail> · MIT (see
`PONYTAIL-LICENSE`) · vendored at **v4.10.0**, commit `e3ba2aa`.

A reuse-first decision ladder for writing code. It is the same instinct as
`CLAUDE.md`'s *never reach for a library when the platform has it* — rung 4 of
its ladder says exactly that.

| Vendored | Why |
|---|---|
| `ponytail` | the ladder itself |
| `ponytail-review` | over-engineering pass on a diff |
| `ponytail-audit` | same, repo-wide |
| `ponytail-debt` | collects the `ponytail:` markers the ladder tells you to leave |

Not vendored: `ponytail-gain` (a benchmark scoreboard, reads `benchmarks/`
which does not exist here) and `ponytail-help` (a quick reference for skills
that are listed anyway).

### The hooks are deliberately omitted

Upstream ships 758 lines of JS on `SessionStart`, `SubagentStart` and
`UserPromptSubmit` to keep the mode active automatically. They make no network
calls — that was checked — but they are third-party code executing on every
prompt, and there is a zero-code way to get the same effect: `CLAUDE.md` is
read at the start of every session and already overrides defaults, so it points
at the skill instead. If the ladder ever needs to be automatic in a way a
pointer cannot achieve, review those scripts line by line first.

Consequence: the mode is invoked, not ambient. `/ponytail` to raise it
explicitly.

### Where CLAUDE.md wins

`CLAUDE.md` overrides these skills wherever they disagree. Two places they do:

**The build order is not speculative.** Ponytail's first rung is *does this
need to exist at all — speculative need, skip it*. The orchestrator and the
adversarial harness both look speculative from inside a single task: nothing
consumes them yet. They are mandated, in order, and the harness is a permanent
CI fixture. Do not let the ladder skip them.

**`packages/sections` is out of scope entirely.** `CLAUDE.md` puts it off
limits to design agents because variants are hand-designed from real
invitation references and normalising them into genericness is the failure
mode. Ponytail is not a design agent, but "fewest files, shortest diff" pushes
the same direction. Variants are allowed to be long and specific.

Upgrading: re-copy the `skills/<name>/SKILL.md` files from a newer tag and
update the version and commit recorded above.
