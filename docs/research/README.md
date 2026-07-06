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

## Initial Queue

- Local prior art: `palette`
- Local prior art: `prettyplease`
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

## Current Hypothesis

Most existing tools improve agent capability or workflow. The open opportunity
is a repo-local harness that turns design-system and architecture rules into
checks, hooks, verification evidence, and quality-controlled factories.

The current bias is extraction over invention: prove the harness by lifting
working machinery out of local repos first.

See `../validation-plan.md` for the current build sequence and eval criteria.
See `factory-patterns.md` for the narrower generator claim that has local
evidence.
