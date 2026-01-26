# SPEC.md: Solvent AI Intelligence & Reliability Hardening

## Goal
Enhance Solvent AI's architectural reasoning, context relevance, and autonomous verification capabilities through semantic relationship mapping, automated testing, and multi-model adversarial synthesis.

---

## 1. Semantic Code Graph (RAG++) - [COMPLETED]

### Objective
Transition from naive text-similarity chunking to a relationship-aware retrieval system that understands code hierarchy and dependencies.

### Detailed Tasks
- **Parser Integration:** [DONE] Implement a lightweight static analysis parser within `VectorService.indexProject`.
- **Memory Schema Expansion:** [DONE] Update `VectorEntry` metadata to include a `links` array.
- **Graph-Augmented Retrieval:** [DONE] Modify `VectorService.search` to implement "one-hop expansion".
- **Visualization:** [TODO] Expose link data to `KnowledgeMap.tsx`.

---

## 2. Automated Synthetic Test Suite - [COMPLETED]

### Objective
Enable Solvent AI to autonomously verify its own implementations against the `SPEC.md`.

### Detailed Tasks
- **TestToolPlugin Implementation:** [DONE] Create `backend/src/plugins/tools/testRunner.ts`.
- **Logic Flow:**
    1. **Context Extraction:** [DONE]
    2. **Test Generation:** [DONE]
    3. **File I/O:** [DONE]
    4. **Execution:** [DONE]
    5. **Feedback Loop:** [DONE]

---

## 3. Multi-Model Debate Mode - [COMPLETED]

### Objective
Synthesize high-fidelity decisions by pitting models against each other.

### Detailed Tasks
- **DebateService:** [DONE] Orchestrate multi-round debate between Gemini and Ollama.
- **API Integration:** [DONE] Expose `/api/v1/debate` endpoint.
- **Frontend Hook:** [DONE] (Logic implemented, UI exists in `DebateArea.tsx`).