import { geoAlbersUsa, geoPath } from 'd3-geo';
import type { GeometryCollection, Topology } from 'topojson-specification';
import { feature, mesh } from 'topojson-client';
import atlas from 'us-atlas/states-albers-10m.json';
import { STATES, STATE_BY_FIPS } from '../data/states';

const topology = atlas as unknown as Topology;
const statesObject = topology.objects.states as GeometryCollection;

const path = geoPath(); // null projection: the atlas is already projected
const collection = feature(topology, statesObject);

export const STATE_PATHS: Record<string, string> = {};
export const BACKGROUND_PATHS: Record<string, string> = {};
const centroids: Record<string, [number, number]> = {};
const bounds: Record<string, [[number, number], [number, number]]> = {};

for (const f of collection.features) {
  const fips = String(f.id);
  const d = path(f);
  if (!d) continue;
  if (STATE_BY_FIPS[fips]) {
    STATE_PATHS[fips] = d;
    centroids[fips] = path.centroid(f);
    bounds[fips] = path.bounds(f);
  } else {
    BACKGROUND_PATHS[fips] = d;
  }
}

export const BORDER_PATH: string = path(mesh(topology, statesObject, (a, b) => a !== b)) ?? '';

export function centroidOf(fips: string): [number, number] {
  return centroids[fips];
}

export function boundsOf(fips: string): [[number, number], [number, number]] {
  return bounds[fips];
}

const projection = geoAlbersUsa().scale(1300).translate([487.5, 305]);

export function capitalPoint(fips: string): [number, number] {
  const info = STATE_BY_FIPS[fips];
  const p = projection(info.capitalLonLat);
  return p ?? centroids[fips];
}

export const QUIZZABLE_COUNT = STATES.length;
