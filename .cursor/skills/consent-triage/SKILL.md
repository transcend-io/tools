---
name: consent-triage
description: >-
  Triage cookies and data flows in Transcend Consent Manager. Use when the user
  mentions cookie triage, data flow triage, consent triage, classify trackers,
  or consent manager cleanup.
---

# Consent Triage

Invoke the **`consent-triage`** MCP prompt for the full workflow. It covers
setup, batch fetching, research, review, classification push, and looping.

For Phase 3 (research), spawn subagents in parallel via the Task tool:

- **consent-triage-researcher** agents (2+): split items into groups of 3-5.
  Pass each group as a table with the customer's available purposes.
- **consent-triage-inspector** agent (1): provide all tracker domains + the
  site URL with regime override parameters.

Additional MCP prompts for subagent methodology:

- **`consent-research-tracker`** -- research methodology for a single tracker
- **`consent-inspect-site`** -- live site investigation via browser DevTools

MCP resources (live from docs.transcend.io) provide reference material on
tracking purposes, triage workflow, debugging, and telemetry.
