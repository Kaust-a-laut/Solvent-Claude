import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiffBanner } from './DiffBanner';

describe('DiffBanner', () => {
  it('renders description', () => {
    render(<DiffBanner description="Fix null check" onApplyAll={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText(/Fix null check/)).toBeTruthy();
  });

  it('calls onApplyAll when Apply All clicked', () => {
    const onApplyAll = vi.fn();
    render(<DiffBanner description="test" onApplyAll={onApplyAll} onReject={vi.fn()} />);
    fireEvent.click(screen.getByText('Apply All'));
    expect(onApplyAll).toHaveBeenCalledOnce();
  });

  it('calls onReject when Reject clicked', () => {
    const onReject = vi.fn();
    render(<DiffBanner description="test" onApplyAll={vi.fn()} onReject={onReject} />);
    fireEvent.click(screen.getByText('Reject'));
    expect(onReject).toHaveBeenCalledOnce();
  });
});
