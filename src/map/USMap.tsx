import { memo } from 'react';
import { REGION_BY_ID, type RegionId } from '../data/regions';
import { STATES } from '../data/states';
import {
  BACKGROUND_PATHS,
  BORDER_PATH,
  STATE_PATHS,
  boundsOf,
  capitalPoint,
  centroidOf,
} from './geo';

export type MapHighlight =
  | { kind: 'region'; regionId: RegionId }
  | { kind: 'state'; fips: string; showCapital?: boolean }
  | null;

export interface USMapProps {
  highlight: MapHighlight;
  colorMode?: 'highlight-only' | 'regions';
  onStateClick?: (fips: string) => void;
}

const DEFAULT_FILL = '#E2E8F0';
const STAR_POINTS =
  '0,-12 3.5,-4.2 12,-3.7 5.6,1.8 7.6,10 0,5.6 -7.6,10 -5.6,1.8 -12,-3.7 -3.5,-4.2';

function USMapImpl({ highlight, colorMode = 'highlight-only', onStateClick }: USMapProps) {
  const targetRegion: RegionId | null = highlight
    ? highlight.kind === 'region'
      ? highlight.regionId
      : (STATES.find((s) => s.fips === highlight.fips)?.region ?? null)
    : null;

  const states = STATES.map((s) => {
    const region = REGION_BY_ID[s.region];
    let fill = DEFAULT_FILL;
    let level: 'target' | 'context' | 'none' = 'none';
    if (highlight?.kind === 'region' && s.region === highlight.regionId) {
      fill = region.color;
      level = 'target';
    } else if (highlight?.kind === 'state' && s.region === targetRegion) {
      if (s.fips === highlight.fips) {
        fill = region.color;
        level = 'target';
      } else {
        fill = region.lightColor;
        level = 'context';
      }
    } else if (colorMode === 'regions') {
      fill = region.color;
    }
    return { s, fill, level };
  });

  // Callout rings only point at a single tiny target state. A highlighted region is already
  // big enough to see, and ringing every small state in New England or the Mid-Atlantic
  // stacks 4-5 overlapping circles that look busy, especially on a phone.
  const ringStates = STATES.filter(
    (s) => s.tiny && highlight?.kind === 'state' && s.fips === highlight.fips,
  );

  const capital =
    highlight?.kind === 'state' && highlight.showCapital ? capitalPoint(highlight.fips) : null;

  return (
    <svg
      viewBox="0 0 975 610"
      className="h-auto w-full"
      role="img"
      aria-label="Map of the United States with one area highlighted"
    >
      <g>
        {Object.entries(BACKGROUND_PATHS).map(([id, d]) => (
          <path key={id} d={d} fill="#CBD5E1" pointerEvents="none" />
        ))}
        {states.map(({ s, fill, level }) => (
          <path
            key={s.fips}
            d={STATE_PATHS[s.fips]}
            fill={fill}
            data-fips={s.fips}
            data-highlight={level}
            onClick={onStateClick ? () => onStateClick(s.fips) : undefined}
            style={onStateClick ? { cursor: 'pointer' } : undefined}
          />
        ))}
      </g>
      <path
        d={BORDER_PATH}
        fill="none"
        stroke="#fff"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        pointerEvents="none"
      />
      {ringStates.map((s) => {
        const [cx, cy] = centroidOf(s.fips);
        const [[x0, y0], [x1, y1]] = boundsOf(s.fips);
        const r = Math.max(14, Math.max(x1 - x0, y1 - y0) / 2 + 8);
        return (
          <circle
            key={s.fips}
            data-testid="callout-ring"
            data-fips={s.fips}
            className="callout-ring"
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={REGION_BY_ID[s.region].color}
            strokeWidth={4}
            pointerEvents="none"
          />
        );
      })}
      {capital && (
        <polygon
          data-testid="capital-star"
          points={STAR_POINTS}
          transform={`translate(${capital[0]} ${capital[1]})`}
          fill="#FACC15"
          stroke="#A16207"
          strokeWidth={2}
          strokeLinejoin="round"
          pointerEvents="none"
        />
      )}
    </svg>
  );
}

export const USMap = memo(USMapImpl);
export default USMap;
