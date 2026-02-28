export interface FileIconInfo {
  emoji: string;
  color: string;
}

const EXT_MAP: Record<string, FileIconInfo> = {
  ts:   { emoji: '📘', color: 'text-blue-400' },
  tsx:  { emoji: '📘', color: 'text-blue-400' },
  js:   { emoji: '📒', color: 'text-yellow-300' },
  jsx:  { emoji: '📒', color: 'text-yellow-300' },
  json: { emoji: '📄', color: 'text-yellow-400' },
  css:  { emoji: '🎨', color: 'text-pink-400' },
  scss: { emoji: '🎨', color: 'text-pink-400' },
  html: { emoji: '🌐', color: 'text-orange-400' },
  md:   { emoji: '📝', color: 'text-emerald-400' },
  py:   { emoji: '🐍', color: 'text-blue-500' },
  sh:   { emoji: '⚡', color: 'text-slate-300' },
  env:  { emoji: '🔒', color: 'text-rose-400' },
};

export function getFileIcon(filename: string): FileIconInfo {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return EXT_MAP[ext] ?? { emoji: '📄', color: 'text-slate-400' };
}
