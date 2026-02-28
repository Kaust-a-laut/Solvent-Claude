import { describe, it, expect } from 'vitest';
import { getFileIcon } from './fileIcons';

describe('getFileIcon', () => {
  it('returns blue for .ts and .tsx', () => {
    expect(getFileIcon('app.ts').color).toBe('text-blue-400');
    expect(getFileIcon('App.tsx').color).toBe('text-blue-400');
  });
  it('returns yellow for .json', () => {
    expect(getFileIcon('package.json').color).toBe('text-yellow-400');
  });
  it('returns pink for .css and .scss', () => {
    expect(getFileIcon('style.css').color).toBe('text-pink-400');
  });
  it('returns green for .md', () => {
    expect(getFileIcon('README.md').color).toBe('text-emerald-400');
  });
  it('returns default for unknown extensions', () => {
    expect(getFileIcon('Makefile').color).toBe('text-slate-400');
  });
});
