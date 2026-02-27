import { create } from 'zustand';
import { AppState } from './types';
import { createChatSlice } from './chatSlice';
import { createSettingsSlice } from './settingsSlice';
import { createGraphSlice } from './graphSlice';
import { createActionSlice } from './actionSlice';
import { createWaterfallSlice } from './waterfallSlice';
import { createCodingSlice } from './codingSlice';

export const useAppStore = create<AppState>()((...a) => ({
  ...createChatSlice(...a),
  ...createSettingsSlice(...a),
  ...createGraphSlice(...a),
  ...createActionSlice(...a),
  ...createWaterfallSlice(...a),
  ...createCodingSlice(...a),
}));

export * from './types';