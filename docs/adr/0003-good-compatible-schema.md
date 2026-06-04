# ADR 0003: GOOD-Compatible Artifact Schema

## Decision

Use GOOD-compatible stat and slot keys at the scanner boundary, then map them into internal TypeScript enums for probability logic.

## Rationale

GOOD compatibility reduces friction with existing Genshin tools and lets the scanner reuse established community vocabulary.

## Consequences

All scanner output must be validated and normalized before evaluation.
