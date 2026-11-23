import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ModeCard } from './ModeCard';

describe('ModeCard', () => {
  it('only lifts on hover when motion is allowed', () => {
    render(<ModeCard mode="states" stars={0} onSelect={() => {}} />);
    const card = screen.getByRole('button', { name: /States/ });
    expect(card.className).toContain('motion-safe:hover:-translate-y-1');
    expect(card.className.split(/\s+/)).not.toContain('hover:-translate-y-1');
  });
});
