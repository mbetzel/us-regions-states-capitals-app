import type { Mode } from '../quiz/engine';

export const MODE_LIST: readonly Mode[] = ['regions', 'states', 'capitals'];

export const MODE_INFO: Record<Mode, { title: string; subtitle: string; icon: string }> = {
  regions: { title: 'Regions', subtitle: 'Name the 7 regions', icon: '🗺️' },
  states: { title: 'States', subtitle: 'Find all 50 states', icon: '📍' },
  capitals: { title: 'Capitals', subtitle: 'Match capitals to states', icon: '⭐' },
};

export function isMode(value: unknown): value is Mode {
  return typeof value === 'string' && (MODE_LIST as readonly string[]).includes(value);
}
