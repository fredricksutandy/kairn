# Vendored agent tooling

Committed to the repo on purpose. A `/plugin install` writes to
`~/.claude/plugins/` on one machine and never leaves it — cloud sessions get a
fresh container and see nothing. What lives here loads everywhere: local CLI,
Claude Code on the web, and for anyone who clones.

## `../agents/code-simplifier.md`

Source: [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/code-simplifier/agents/code-simplifier.md).
Vendored verbatim.

A pass, not a mode: it runs over recently-changed code and applies
clarity/consistency fixes while **preserving 100% of functionality**. It will
never delete a speculative abstraction or refuse a dependency — it polishes what
exists.

Cloud sessions already have a near-identical `/simplify` skill, so this one
mainly earns its keep locally.

## Why ponytail is no longer here

It was vendored and then removed deliberately. It is a *mode* — active every
response, changing what gets built — which collides head-on with superpowers'
mandated TDD and planning phases. Two always-on rulesets legislating the same
decisions means one silently loses, which is the failure `CLAUDE.md` already
names for antislop/hallmark alongside impeccable.

Its load-bearing rung survives without it: **never reach for a library when the
platform has it** is already in `CLAUDE.md` and already auto-loads. That is the
rung that matters for this project — a mid-range Android makes less code a
product requirement, not a style preference.

Consequence to stay honest about: nothing in the toolchain now *prevents* code
volume growing. `code-simplifier` polishes, it does not subtract. If the repo
starts accreting, that is the signal to bring prevention back.

## superpowers — run it locally, it is not here

[obra/superpowers](https://github.com/obra/superpowers) cannot reach a cloud
session unless vendored, and it is a methodology rather than a skill, so it is
deliberately not vendored. Its TDD discipline closes one real gap found in
practice: tests here assert that a rule *fires*, not what its message *says*,
and a wrong message shipped once already.

Worth reaching for locally at:

| Step | Skill | Why |
|---|---|---|
| 4 manifest + registry | TDD | Composition validation is real branching logic, unlike the orchestrator's DOM work |
| 7 device gate | systematic-debugging | A desync on a real Android is exactly a 4-phase root-cause hunt |
| 8 builder UI | brainstorming | The only genuinely undecided design in the project |

Do not pair it with a second always-on ruleset.
