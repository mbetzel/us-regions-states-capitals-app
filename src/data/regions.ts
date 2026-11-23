export type RegionId =
  'new-england' | 'mid-atlantic' | 'southern' | 'midwest' | 'southwest' | 'pacific' | 'mountain';

export interface Region {
  id: RegionId;
  name: string; // "New England"
  color: string; // fill when highlighted
  lightColor: string; // tint used for "context" shading
}

export const REGIONS: Region[] = [
  { id: 'new-england', name: 'New England', color: '#3B82F6', lightColor: '#BFDBFE' },
  { id: 'mid-atlantic', name: 'Mid-Atlantic', color: '#B91C1C', lightColor: '#FECACA' },
  { id: 'southern', name: 'Southern', color: '#22C55E', lightColor: '#BBF7D0' },
  { id: 'midwest', name: 'Midwest', color: '#A855F7', lightColor: '#E9D5FF' },
  { id: 'southwest', name: 'Southwest', color: '#F97316', lightColor: '#FED7AA' },
  { id: 'pacific', name: 'Pacific', color: '#FB7185', lightColor: '#FFE4E6' },
  { id: 'mountain', name: 'Mountain', color: '#A16207', lightColor: '#FDE68A' },
];

export const REGION_BY_ID: Record<RegionId, Region> = Object.fromEntries(
  REGIONS.map((region) => [region.id, region]),
) as Record<RegionId, Region>;
