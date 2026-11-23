import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AnswerButton, type AnswerState } from './AnswerButton';

const renderButton = (state: AnswerState, onPick = vi.fn()) => {
  render(<AnswerButton label="Springfield" keyNumber={2} state={state} onPick={onPick} />);
  return { button: screen.getByRole('button', { name: 'Springfield' }), onPick };
};

describe('AnswerButton', () => {
  it('is idle, enabled and clickable', async () => {
    const { button, onPick } = renderButton('idle');
    expect(button).toHaveAttribute('data-state', 'idle');
    expect(button).toBeEnabled();
    await userEvent.click(button);
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it('shows the key number badge', () => {
    const { button } = renderButton('idle');
    expect(button).toHaveTextContent('2');
  });

  it('shows a green check when correct', () => {
    const { button } = renderButton('correct');
    expect(button).toHaveAttribute('data-state', 'correct');
    expect(button).toHaveClass('bg-green-100');
    expect(button).toHaveTextContent('✓');
    expect(button).toBeDisabled();
  });

  it('shows a soft orange return arrow when wrong, not red', () => {
    const { button } = renderButton('wrong');
    expect(button).toHaveAttribute('data-state', 'wrong');
    expect(button).toHaveClass('bg-orange-100');
    expect(button).not.toHaveClass('bg-red-100');
    expect(button).toHaveTextContent('↺');
    expect(button).toBeDisabled();
  });

  it('reveals the correct answer with a green check', () => {
    const { button } = renderButton('reveal-correct');
    expect(button).toHaveAttribute('data-state', 'reveal-correct');
    expect(button).toHaveClass('bg-green-100');
    expect(button).toHaveTextContent('✓');
    expect(button).toBeDisabled();
  });

  it('is disabled and does not respond to clicks when locked', async () => {
    const onPick = vi.fn();
    const { button } = renderButton('disabled', onPick);
    expect(button).toHaveAttribute('data-state', 'disabled');
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onPick).not.toHaveBeenCalled();
  });
});
