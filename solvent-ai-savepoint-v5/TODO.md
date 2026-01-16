# TODO: Gemini Image Generation Implementation

## Backend
- [x] Investigate current backend image generation logic (if any).
- [x] Install/Verify Gemini API dependencies.
- [x] Implement Gemini image generation service.
- [x] Create `generated_images` directory and ensure it's served.
- [x] Update API endpoint to use Gemini and save images locally.

## Frontend
- [x] Update image generation request logic.
- [x] Display generated image in the UI.
- [x] Add "Download" button for the generated image.

## Resilience & UX
- [x] Centralized .env validation (Backend)
- [x] Service Health Check Endpoint (/health/services)
- [x] System Status UI in Navigation

## Verification
- [x] Test end-to-end flow. (Verified with mock, real Gemini hit quota)
- [x] Verify image saving and retrieval. (Passed)