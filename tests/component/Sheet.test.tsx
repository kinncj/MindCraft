import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Sheet } from '../../src/components/ui/Sheet';

describe('Sheet ghost-click guard', () => {
  it('ignores clicks in its first moments (the tap that opened it), then accepts them', async () => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 1 }); // a touch screen
    const now = vi.spyOn(performance, 'now');
    now.mockReturnValue(1000);
    const onClose = vi.fn();
    const onPick = vi.fn();
    render(
      <Sheet title="Ride" onClose={onClose}>
        <button type="button" onClick={onPick}>Ask Mia to fly it</button>
      </Sheet>,
    );
    now.mockReturnValue(1100);
    fireEvent.click(screen.getByRole('button', { name: 'Ask Mia to fly it' }));
    fireEvent.click(screen.getByRole('presentation'));
    expect(onPick).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    now.mockReturnValue(1600);
    fireEvent.click(screen.getByRole('button', { name: 'Ask Mia to fly it' }));
    expect(onPick).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalledTimes(1);
    now.mockRestore();
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 0 });
    vi.useRealTimers();
  });
});
