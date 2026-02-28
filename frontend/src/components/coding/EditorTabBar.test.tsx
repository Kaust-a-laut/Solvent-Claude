import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditorTabBar } from './EditorTabBar';

const files = [
  { path: 'src/app.ts', content: '' },
  { path: 'src/utils.ts', content: '' },
];

describe('EditorTabBar', () => {
  it('renders tab names', () => {
    render(
      <EditorTabBar
        openFiles={files}
        activeFile="src/app.ts"
        onTabClick={vi.fn()}
        onTabClose={vi.fn()}
      />
    );
    expect(screen.getByText('app.ts')).toBeTruthy();
    expect(screen.getByText('utils.ts')).toBeTruthy();
  });

  it('calls onTabClick when tab clicked', () => {
    const onTabClick = vi.fn();
    render(
      <EditorTabBar
        openFiles={files}
        activeFile="src/app.ts"
        onTabClick={onTabClick}
        onTabClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('utils.ts'));
    expect(onTabClick).toHaveBeenCalledWith('src/utils.ts');
  });
});
