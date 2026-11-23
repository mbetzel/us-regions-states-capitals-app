import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Stars } from './Stars';

describe('Stars', () => {
  it.each([0, 1, 2, 3] as const)('labels %i earned stars for screen readers', (count) => {
    render(<Stars count={count} />);
    expect(screen.getByRole('img', { name: `${count} of 3 stars` })).toBeInTheDocument();
  });

  it('fills only the earned stars', () => {
    const { container } = render(<Stars count={2} />);
    const stars = Array.from(container.querySelectorAll('span[aria-hidden="true"]'));
    expect(stars).toHaveLength(3);
    expect(stars.map((s) => s.className.includes('text-amber-400'))).toEqual([true, true, false]);
  });
});
