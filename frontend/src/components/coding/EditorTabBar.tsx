import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getFileIcon } from './fileIcons';

interface Props {
  openFiles: { path: string; content: string }[];
  activeFile: string | null;
  onTabClick: (path: string) => void;
  onTabClose: (path: string) => void;
}

export const EditorTabBar: React.FC<Props> = ({ openFiles, activeFile, onTabClick, onTabClose }) => {
  return (
    <div className="h-10 bg-black/20 border-b border-white/[0.04] flex items-center px-2 gap-1 overflow-x-auto no-scrollbar shrink-0">
      {openFiles.map((file) => {
        const name = file.path.split('/').pop() ?? file.path;
        const icon = getFileIcon(name);
        const isActive = activeFile === file.path;

        return (
          <div
            key={file.path}
            onClick={() => onTabClick(file.path)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition-all border shrink-0',
              isActive
                ? 'bg-jb-accent/10 text-jb-accent border-jb-accent/25 shadow-[0_0_10px_rgba(60,113,247,0.08)]'
                : 'text-white/30 border-transparent hover:text-white/50 hover:bg-white/5',
            )}
          >
            <span className={cn('shrink-0', isActive ? 'text-jb-accent' : icon.color)}>{icon.emoji}</span>
            <span>{name}</span>
            <X
              size={11}
              className="ml-0.5 hover:text-rose-400 opacity-50 hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onTabClose(file.path); }}
            />
          </div>
        );
      })}
    </div>
  );
};
