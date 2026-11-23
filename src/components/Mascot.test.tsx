import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Mascot, type MascotMood } from './Mascot';

const MOODS: MascotMood[] = ['idle', 'happy', 'encourage', 'celebrate'];

describe('Mascot', () => {
  it.each(MOODS)('renders the %s mood as a hidden decorative drawing', (mood) => {
    const { container } = render(<Mascot mood={mood} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector(`[data-mood="${mood}"]`)).not.toBeNull();
  });

  it('shows the speech bubble message as visible text', () => {
    render(<Mascot mood="encourage" message="You'll get it next time!" />);
    expect(screen.getByText("You'll get it next time!")).toBeVisible();
  });

  it('renders no speech bubble without a message', () => {
    const { container } = render(<Mascot mood="idle" />);
    expect(container.querySelector('p')).toBeNull();
  });

  it('gives the happy and celebrate moods a bounce and encourage a tilt', () => {
    const { container, rerender } = render(<Mascot mood="happy" />);
    expect(container.querySelector('[data-mood]')).toHaveClass('anim-bounce');
    rerender(<Mascot mood="celebrate" />);
    expect(container.querySelector('[data-mood]')).toHaveClass('anim-bounce');
    rerender(<Mascot mood="encourage" />);
    expect(container.querySelector('[data-mood]')).toHaveClass('anim-tilt');
    rerender(<Mascot mood="idle" />);
    expect(container.querySelector('[data-mood]')).not.toHaveClass('anim-bounce');
  });
});
