---
name: Prompt Paraphraser
description: Paraphrase, clarify, and expand ambiguous, brief, or poorly structured user prompts into actionable engineering tasks before planning or editing code.
---

## When to Use This Skill
- The user provides a vague, overly brief, or multi-part prompt without clear technical constraints.
- You need multiple semantic variations of a query to search the codebase or documentation thoroughly.
- The user explicitly asks to refine, rewrite, or improve a prompt.

## Workflow
1. **Analyze Intent:** Identify the core objective, implicit codebase context, and any missing constraints in the user's request.
2. **Generate Variations:** Internally paraphrase the original prompt into three distinct angles:
   - **Direct & Concise:** Strips conversational filler to isolate exact file paths, function names, or technical entities.
   - **Expanded & Contextual:** Adds architectural context, edge cases, and expected behavior.
   - **Step-by-Step Specification:** Converts a broad goal into a sequential checklist of verifiable actions.
3. **Verify or Execute:** 
   - If the request is a search/lookup, use the paraphrased variations to run targeted codebase searches.
   - If the request involves modifying files and the intent remains ambiguous, present the refined prompt to the user for quick confirmation before making edits.

## Rules
- Never alter the user's core goal or hard constraints.
- Keep paraphrased prompts plain, direct, and grounded in the active project's tech stack.
