# Research

This folder tracks tools, patterns, and prior art for design-engineer agent
systems.

## Evaluation Template

Use this structure for each tool or idea:

```text
Name:
Source:
Category:
What it adds:
What it biases:
What it enforces:
Risk:
Overlap:
Useful pieces to adopt:
Decision:
```

Research notes are evidence and proposals, not the current install surface.
Implemented behavior is documented in `../../README.md` and
`../development-flow.md`; each note should label commands that remain roadmap.

## Initial queue

- Local prior art: `palette`
- Local prior art: `shaba`
- Local prior art: `prettyplease`
- Local prior art: `str8flush`
- Rulepack extraction
- Moveset extensions
- Factory patterns
- Context7
- Superpowers
- Anthropic LSP plugins
- Anthropic Frontend Design
- Ponytail
- Sentry for AI
- GitHub MCP Server
- Playwright CLI / MCP
- Supabase MCP
- AWS Agent Toolkit

## Current hypothesis

Most existing tools improve agent capability or workflow. This repository now
ships the first repo-local harness slice: inventory, config proposal, check
execution, and verification evidence. The open work is proving which additional
rulepacks, factories, and workflow guards improve outcomes in another repo.

The current bias is extraction over invention: prove the harness by lifting
working machinery out of local repos first.

See `../validation-plan.md` for the current build sequence and eval criteria.
See `factory-patterns.md` for the narrower generator claim that has local
evidence.
See `rulepacks.md` for the lightweight way to normalize repo-specific taste
checks without replacing existing scripts.
See `str8flush-adoption-lessons.md` for the first adoption PR lessons around
scope hygiene, deferred findings, aggregate checks, and exemplar integrity.
See `shaba-pr-421-ci-lessons.md` for capability-scoped CI lanes, closed input
sets, fail-closed required statuses, and dated cost evidence.
