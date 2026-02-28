import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentCodeBlock } from './AgentCodeBlock';

const suggestion = {
  id: 'sg1',
  language: 'typescript',
  code: 'const x = 1;',
  applied: false,
  rejected: false,
};

describe('AgentCodeBlock', () => {
  it('renders the code', () => {
    render(<AgentCodeBlock suggestion={suggestion} onApply={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText(/const x = 1/)).toBeTruthy();
  });

  it('shows Apply and Reject buttons when not yet acted on', () => {
    render(<AgentCodeBlock suggestion={suggestion} onApply={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText('Apply')).toBeTruthy();
    expect(screen.getByText('Reject')).toBeTruthy();
  });

  it('calls onApply with suggestion id', () => {
    const onApply = vi.fn();
    render(<AgentCodeBlock suggestion={suggestion} onApply={onApply} onReject={vi.fn()} />);
    fireEvent.click(screen.getByText('Apply'));
    expect(onApply).toHaveBeenCalledWith('sg1');
  });

  it('shows Applied badge when applied=true', () => {
    render(<AgentCodeBlock suggestion={{ ...suggestion, applied: true }} onApply={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText('Applied')).toBeTruthy();
  });

  it('calls onReject with suggestion id', () => {
    const onReject = vi.fn();
    render(<AgentCodeBlock suggestion={suggestion} onApply={vi.fn()} onReject={onReject} />);
    fireEvent.click(screen.getByText('Reject'));
    expect(onReject).toHaveBeenCalledWith('sg1');
  });

  it('shows Rejected badge when rejected=true', () => {
    render(<AgentCodeBlock suggestion={{ ...suggestion, rejected: true }} onApply={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText('Rejected')).toBeTruthy();
  });
});
