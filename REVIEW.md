I will start by checking the `package.json` files in the root, `backend/`, and `frontend/` directories to identify the build and lint commands.
I will now run the backend build to check for any errors.
I will examine `REVIEW.md`, `SPEC.md`, and `technical_facts.txt` to see if they contain any information about the build or lint failure.
I will delegate the task of finding and fixing the build/lint error to the `codebase_investigator`, as it is better suited for root-cause analysis and may have access to the necessary tools.
I will search for `TODO` and `FIXME` in the `backend/src` and `frontend/src` directories to see if they point to any known issues that could be causing the build or lint failure.
I will examine `backend/src/server.ts` to check for any obvious errors in the backend entry point.
I will check `backend/src/routes/aiRoutes.ts` to see if there are any issues there.
I will check the `frontend/src/components/` directory to see if there are any new components that might be causing a lint error.
I will check `frontend/src/components/ChatView.tsx` for any potential issues, as it was recently uploaded and might contain errors.
I will examine `backend/src/services/taskService.ts` for any potential errors, as it is dynamically imported in `aiRoutes.ts`.
I will search for other usages of `bullmq` in the project to verify how `Job` states are checked.
I will examine `backend/src/worker.ts` to see how it interacts with `bullmq`.
I will search for `job.active` in the entire project to see if it is used elsewhere and if it might be causing a type error.
I will examine `backend/src/services/aiService.ts` for any other potential errors.
I will check `frontend/src/store/useAppStore.ts` for any potential type mismatches.
I will examine `frontend/src/store/types.ts` to see the state definitions.
I will check `frontend/src/components/MessageItem.tsx` to see how the `Message` interface is used.
I will examine `frontend/src/components/MessageList.tsx` for any potential errors.
I will check where `deviceInfo` is initialized in the store, starting with `frontend/src/store/chatSlice.ts`.
I will check `frontend/src/store/settingsSlice.ts` for the `deviceInfo` initialization.
I will examine `backend/src/utils/AppError.ts` for any potential errors.
I will check `frontend/src/lib/file-utils.ts` for any potential errors.
I will examine `frontend/src/components/WaterfallVisualizer.tsx` for any potential errors.
I will examine `frontend/src/store/waterfallSlice.ts` to see the structure of the `waterfall` object.
I will examine `frontend/src/lib/waterfallStateMachine.ts` to see how transitions are handled.
I will examine `backend/src/jobs/indexProjectJob.ts` for any potential errors.
I will check `backend/src/jobs/imageGenJob.ts` and `backend/src/jobs/memoryMaintenanceJob.ts` for any potential errors, specifically for the presence of `DoneCallback`.
I will examine `backend/src/services/aiProviderFactory.ts` to see if there are any issues in the plugin system.
I will examine `backend/src/services/
