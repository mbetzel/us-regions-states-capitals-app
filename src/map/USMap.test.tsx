import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { REGIONS, REGION_BY_ID } from '../data/regions';
import { STATES } from '../data/states';
import { USMap } from './USMap';

const statePaths = (c: HTMLElement) => Array.from(c.querySelectorAll('path[data-fips]'));
const byLevel = (c: HTMLElement, level: string) =>
  statePaths(c).filter((p) => p.getAttribute('data-highlight') === level);

describe('USMap', () => {
  it('renders 50 quizzable state paths', () => {
    const { container } = render(<USMap highlight={null} />);
    expect(statePaths(container)).toHaveLength(50);
    expect(byLevel(container, 'none')).toHaveLength(50);
  });

  it('fills every Midwest state for a region highlight', () => {
    const { container } = render(<USMap highlight={{ kind: 'region', regionId: 'midwest' }} />);
    const targets = byLevel(container, 'target');
    expect(targets).toHaveLength(12);
    targets.forEach((p) => expect(p.getAttribute('fill')).toBe('#A855F7'));
    expect(byLevel(container, 'none')).toHaveLength(38);
  });

  it('highlights one state with context for its region', () => {
    const { container } = render(<USMap highlight={{ kind: 'state', fips: '17' }} />);
    const targets = byLevel(container, 'target');
    expect(targets).toHaveLength(1);
    expect(targets[0].getAttribute('data-fips')).toBe('17');
    expect(targets[0].getAttribute('fill')).toBe(REGION_BY_ID.midwest.color);
    const context = byLevel(container, 'context');
    expect(context).toHaveLength(11);
    context.forEach((p) => expect(p.getAttribute('fill')).toBe(REGION_BY_ID.midwest.lightColor));
    expect(container.querySelector('[data-testid="capital-star"]')).toBeNull();
  });

  it('shows a capital star when requested', () => {
    const { container } = render(
      <USMap highlight={{ kind: 'state', fips: '17', showCapital: true }} />,
    );
    expect(container.querySelectorAll('[data-testid="capital-star"]')).toHaveLength(1);
  });

  it('shows a callout ring for tiny states', () => {
    const { container } = render(<USMap highlight={{ kind: 'state', fips: '44' }} />);
    expect(container.querySelectorAll('[data-testid="callout-ring"]')).toHaveLength(1);
  });

  it('shows rings for tiny states in a highlighted region', () => {
    const { container } = render(<USMap highlight={{ kind: 'region', regionId: 'new-england' }} />);
    const tiny = STATES.filter((s) => s.tiny && s.region === 'new-england').length;
    expect(tiny).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-testid="callout-ring"]')).toHaveLength(tiny);
  });

  it('tints all states by region in regions color mode', () => {
    const { container } = render(<USMap highlight={null} colorMode="regions" />);
    const ca = container.querySelector('path[data-fips="06"]');
    expect(ca?.getAttribute('fill')).toBe(REGION_BY_ID.pacific.color);
  });

  it('has an aria-label that does not reveal state or region names', () => {
    const { container } = render(<USMap highlight={{ kind: 'state', fips: '17' }} />);
    const label = container.querySelector('svg')?.getAttribute('aria-label') ?? '';
    expect(label).toBeTruthy();
    for (const name of [...STATES.map((s) => s.name), ...REGIONS.map((r) => r.name)]) {
      expect(label).not.toContain(name);
    }
    expect(container.querySelector('title')).toBeNull();
  });
});
