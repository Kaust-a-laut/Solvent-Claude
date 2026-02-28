import { describe, it, expect } from 'vitest';
import { parseSlashCommand, buildSystemPrompt, SLASH_COMMANDS } from './slashCommands';

describe('parseSlashCommand', () => {
  it('returns null for plain text', () => {
    expect(parseSlashCommand('hello world')).toBeNull();
  });
  it('returns command for /fix', () => {
    expect(parseSlashCommand('/fix the return type')).toEqual({
      command: 'fix',
      rest: 'the return type',
    });
  });
  it('returns command for /explain with no rest', () => {
    expect(parseSlashCommand('/explain')).toEqual({ command: 'explain', rest: '' });
  });
  it('returns parsed command even for unknown command ids', () => {
    expect(parseSlashCommand('/unknown some text')).toEqual({ command: 'unknown', rest: 'some text' });
  });
  it('returns null for inputs starting with //', () => {
    expect(parseSlashCommand('// a comment')).toBeNull();
  });
});

describe('buildSystemPrompt', () => {
  it('includes active file path and content', () => {
    const prompt = buildSystemPrompt('src/app.ts', 'const x = 1;', null);
    expect(prompt).toContain('src/app.ts');
    expect(prompt).toContain('const x = 1;');
  });
  it('includes selection when provided', () => {
    const prompt = buildSystemPrompt('src/app.ts', 'const x = 1;', 'const x = 1;');
    expect(prompt).toContain('Selected code');
  });
  it('omits file section when filePath is null', () => {
    const prompt = buildSystemPrompt(null, null, null);
    expect(prompt).not.toContain('Active file:');
  });
});

describe('SLASH_COMMANDS', () => {
  it('has at least 7 commands', () => {
    expect(SLASH_COMMANDS.length).toBeGreaterThanOrEqual(7);
  });
});
