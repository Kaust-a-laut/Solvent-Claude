import { create } from 'zustand';
import { AppState } from './types';
import { createChatSlice } from './chatSlice';
import { createSettingsSlice } from './settingsSlice';
import { createGraphSlice } from './graphSlice';
import { createActionSlice } from './actionSlice';
import { createWaterfallSlice } from './waterfallSlice';

export const useAppStore = create<AppState>()((...a) => ({
  ...createChatSlice(...a),
  ...createSettingsSlice(...a),
  ...createGraphSlice(...a),
  ...createActionSlice(...a),
  ...createWaterfallSlice(...a),
}));

export * from './types';