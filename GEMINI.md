# Project Instructions

- The project maintains a standard changelog (`CHANGELOG.md`) in the project root.

## Architecture Guidelines (for AI Agents)

- **Primary Engine:** Unlike Cucumber, there is no regex matching for step definitions. The LLM is the primary compilation engine.
- **Cache is Secondary:** The local cache (`bdd-cache.json`) is strictly an optimization to speed up subsequent runs, not the source of truth. Do not mistake the library for a static-matching tool.
