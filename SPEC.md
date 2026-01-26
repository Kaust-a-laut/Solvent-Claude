I will begin by analyzing the current codebase, specifically examining the `VectorService` for the Semantic Code Graph, the plugin architecture for the Synthetic Test Suite, and the frontend components for the Multi-Model Debate Mode.
I will read the current `SPEC.md` to understand the project's foundation, then examine `vectorService.ts` for memory handling and `DebateArea.tsx` to assess its current implementation.
I will now examine `backend/src/plugins/tools/fileOperations.ts` to understand the tool architecture, which will help me design the automated synthetic test suite plugin.
I will now check `backend/src/types/plugins.ts` and `backend/src/types/memory.ts` to determine how to extend them for the Semantic Code Graph and the automated synthetic test suite.
I'll refine the `VectorEntry` metadata by adding a `SemanticRelation` type and a `CodeBlockMemory` interface to `memory.ts`. For the Synthetic Test Suite, I'll design a plugin to generate and run Vitest tests from `SPEC.md`. Finally, I'll investigate `backend/src/services/aiService.ts` to see how it handles multiple models, which will inform the creation of a `DebateService` to orchestrate multi-model architectural decisions.
I've completed my analysis and am ready to draft the `SPEC.md`. This specification will focus on three key pillars: hardening Solvent AI's intelligence with Semantic Graph RAG for relationship-aware retrieval, implementing an Automated Synthetic Test Suite via a `TestToolPlugin` for autonomous verification, and establishing a Multi-Model Debate Mode to produce high-fidelity architectural decisions through adversarial model interaction and synthesis.

```markdown
# SPEC.md: Solvent AI Intelligence & Reliability Hardening

## Goal
Enhance Solvent AI's architectural reasoning, context relevance, and autonomous verification capabilities through semantic relationship mapping, automated testing, and multi-model adversarial synthesis.

---

## 1. Semantic Code Graph (RAG++)

### Objective
Transition from naive text-similarity chunking to a relationship-aware retrieval system that understands code hierarchy and dependencies.

### Detailed Tasks
- **Parser Integration:** Implement a lightweight static analysis parser (regex or AST-based) within `VectorService.indexProject` to identify:
    - `imports` / `exports`
    - `class` / `interface` implementations
    - Function calls and service injections.
- **Memory Schema Expansion:** Update `VectorEntry` metadata to include a `links` array:
  ```typescript
  links: { targetId: string, type: 'import' | 'implements' | 'calls' | 'depends_on' }[]
  ```
- **Graph-Augmented Retrieval:**
    - Modify `VectorService.search` to implement "one-hop expansion": if a relevant code block is found, automatically include its linked definitions (e.g., the interface it implements) in the context.
- **Visualization:** (Optional) Expose link data to `KnowledgeMap.tsx` for visual graph exploration.

### Technical Constraints
- Must remain performant during indexing (use worker threads if necessary).
- Support `.ts`, `.tsx`, and `.js` initially.

### Success Criteria
- Retrieval of a service implementation automatically pulls in its corresponding interface/type definitions.
- Improved accuracy in "Find usages" or "Impact analysis" queries.

---

## 2. Automated Synthetic Test Suite

### Objective
Enable Solvent AI to autonomously verify its own implementations against the `SPEC.md` using the project's existing testing infrastructure.

### Detailed Tasks
- **TestToolPlugin Implementation:** Create `backend/src/plugins/tools/testRunner.ts`.
- **Logic Flow:**
    1. **Context Extraction:** Tool reads `SPEC.md` and the recent `architectural_decision` from `VectorService`.
    2. **Test Generation:** Agent uses Gemini to generate `vitest` test suites based on requirements.
    3. **File I/O:** Write generated tests to `backend/tests/synthetic/`.
    4. **Execution:** Run `npm run test` (subset for synthetic tests) via `exec`.
    5. **Feedback Loop:** Return pass/fail results and error logs back to the Agent for self-correction.
- **Integration:** Register the tool in `ToolService` so the Waterfall Agent can call it after code generation.

### Technical Constraints
- Tests must run in a isolated directory to avoid polluting the main test suite.
- Timeout limits on test execution to prevent infinite loops in generated code.

### Success Criteria
- The "Waterfall" agent can successfully implement a feature and confirm it passes 100% of generated synthetic tests before declaring the task complete.

---

## 3. Multi-Model Debate Mode

### Objective
Produce higher-fidelity architectural decisions by pitting Gemini (Lead Architect) against Ollama/Qwen (Senior Developer/Skeptic).

### Detailed Tasks
- **DebateService (Backend):** Create a service to manage the "Dialectical Synthesis" workflow:
    - **Propose:** Gemini generates an architectural proposal.
    - **Critique:** Ollama (Qwen) identifies flaws, edge cases, and suggests alternatives.
    - **Synthesize:** Gemini reviews the critique and produces a final, hardened `SupervisoryInsight`.
- **Frontend Integration:**
    - Connect `DebateArea.tsx` to the `DebateService`.
    - Add a "Commit to Memory" button that saves the synthesis as an `architectural_decision` in `VectorService`.
- **UI/UX Enhancement:** Display the "Conflict Points" between models to help the user understand the trade-offs.

### Technical Constraints
- Must handle Ollama unavailability gracefully (fallback to a smaller Gemini model for critique).
- Debate history must be persisted in the session state.

### Success Criteria
- Generation of a `SupervisoryInsight` that explicitly addresses at least two "Skeptical Points" raised by the secondary model.
- User-validated architectural decisions marked with `confidence: HIGH`.

---

## Success Criteria (Overall)
- **Zero-Touch Verification:** 80% of generated features pass synthetic tests on the first try.
- **Deep Context:** LLM provides answers that reference non-local but semantically linked files (interfaces/types).
- **Consensus Logic:** All major architectural changes are backed by a multi-model debate log.
```
