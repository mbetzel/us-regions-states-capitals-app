import { describe, expect, it } from 'vitest';
import { feature } from 'topojson-client';
import { geoContains } from 'd3-geo';
import type { Topology, GeometryCollection } from 'topojson-specification';
import statesTopology from 'us-atlas/states-10m.json';
import { REGIONS, REGION_BY_ID, type RegionId } from './regions';
import { STATES, STATE_BY_FIPS, statesInRegion } from './states';

const topology = statesTopology as unknown as Topology;
const stateFeatures = feature(topology, topology.objects.states as GeometryCollection);
const featureById = new Map(stateFeatures.features.map((f) => [String(f.id), f]));

const EXPECTED_COUNTS: Record<RegionId, number> = {
  'new-england': 6,
  'mid-atlantic': 5,
  southern: 12,
  midwest: 12,
  southwest: 4,
  pacific: 5,
  mountain: 6,
};

const TINY_ABBRS = ['RI', 'DE', 'CT', 'NJ', 'MD', 'MA', 'NH', 'VT', 'HI'];

describe('regions', () => {
  it('defines seven regions in spec order with REGION_BY_ID lookup', () => {
    expect(REGIONS.map((r) => r.id)).toEqual([
      'new-england',
      'mid-atlantic',
      'southern',
      'midwest',
      'southwest',
      'pacific',
      'mountain',
    ]);
    for (const region of REGIONS) {
      expect(REGION_BY_ID[region.id]).toBe(region);
    }
  });

  it('uses the spec colors', () => {
    expect(REGION_BY_ID['new-england'].color).toBe('#3B82F6');
    expect(REGION_BY_ID['mid-atlantic'].color).toBe('#B91C1C');
    expect(REGION_BY_ID.southern.color).toBe('#22C55E');
    expect(REGION_BY_ID.midwest.color).toBe('#A855F7');
    expect(REGION_BY_ID.southwest.color).toBe('#F97316');
    expect(REGION_BY_ID.pacific.color).toBe('#FB7185');
    expect(REGION_BY_ID.mountain.color).toBe('#A16207');
  });
});

describe('states data', () => {
  it('has all 50 states and no D.C.', () => {
    expect(STATES).toHaveLength(50);
    expect(STATES.some((s) => s.fips === '11')).toBe(false);
  });

  it('has exact per-region counts', () => {
    for (const region of REGIONS) {
      expect(statesInRegion(region.id)).toHaveLength(EXPECTED_COUNTS[region.id]);
    }
    const total = REGIONS.reduce((sum, r) => sum + statesInRegion(r.id).length, 0);
    expect(total).toBe(50);
  });

  it('places every state in exactly one valid region', () => {
    const validIds = new Set<string>(REGIONS.map((r) => r.id));
    for (const state of STATES) {
      expect(validIds.has(state.region)).toBe(true);
    }
    const memberships = new Map<string, number>();
    for (const region of REGIONS) {
      for (const state of statesInRegion(region.id)) {
        memberships.set(state.abbr, (memberships.get(state.abbr) ?? 0) + 1);
      }
    }
    expect(memberships.size).toBe(50);
    for (const count of memberships.values()) {
      expect(count).toBe(1);
    }
  });

  it('has unique names, abbrs, capitals and FIPS codes', () => {
    const unique = (values: string[]) => new Set(values).size === values.length;
    expect(unique(STATES.map((s) => s.name))).toBe(true);
    expect(unique(STATES.map((s) => s.abbr))).toBe(true);
    expect(unique(STATES.map((s) => s.capital))).toBe(true);
    expect(unique(STATES.map((s) => s.fips))).toBe(true);
  });

  it('uses 2-digit FIPS strings', () => {
    for (const state of STATES) {
      expect(state.fips).toMatch(/^\d{2}$/);
    }
    expect(Object.keys(STATE_BY_FIPS)).toHaveLength(50);
    expect(STATE_BY_FIPS['17'].abbr).toBe('IL');
  });

  it('flags exactly the nine tiny states', () => {
    const tiny = STATES.filter((s) => s.tiny)
      .map((s) => s.abbr)
      .sort();
    expect(tiny).toEqual([...TINY_ABBRS].sort());
  });

  it('never uses the capital as the famous city', () => {
    for (const state of STATES) {
      if (state.famousCity !== undefined) {
        expect(state.famousCity).not.toBe(state.capital);
      }
    }
  });

  it('has every FIPS code present in the us-atlas file', () => {
    for (const state of STATES) {
      expect(featureById.has(state.fips), state.name).toBe(true);
    }
  });

  it('has each capital point inside its own state geometry', () => {
    for (const state of STATES) {
      const shape = featureById.get(state.fips);
      expect(shape, state.name).toBeDefined();
      expect(geoContains(shape!, state.capitalLonLat), `${state.capital}, ${state.name}`).toBe(
        true,
      );
    }
  });
});
