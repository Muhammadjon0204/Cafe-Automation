import type { ReactNode } from 'react';
import type { CafeTableLayout, Zone } from '../../api/tablesApi';
import { AllZonesIcon, BarIcon, HallIcon, TerraceIcon, UnzonedIcon, VipIcon } from './tableIcons';

export type ZoneTabKey = 'all' | 'unzoned' | number;

interface ZoneTabsProps {
  zones: Zone[];
  tables: CafeTableLayout[];
  activeTab: ZoneTabKey;
  onSelect: (tab: ZoneTabKey) => void;
}

// Zones are free-text names the cafe creates itself (see ZoneManagerModal), not a fixed
// enum, so the icon is picked by keyword rather than an exact match — falls back to a
// generic "room" icon for anything that doesn't match a known zone type.
function pickZoneIcon(name: string): ReactNode {
  const lower = name.toLowerCase();
  if (/терас|veranda|patio|двор/.test(lower)) return <TerraceIcon />;
  if (/vip|вип/.test(lower)) return <VipIcon />;
  if (/бар|bar/.test(lower)) return <BarIcon />;
  return <HallIcon />;
}

// Counts are computed from the already-fetched `tables` list rather than each zone's
// own TablesCount field, so the tab badges never lag behind an optimistic local update
// (e.g. mid-drag zone reassignment in the editor, Phase 2).
export function ZoneTabs({ zones, tables, activeTab, onSelect }: ZoneTabsProps) {
  const unzonedCount = tables.filter((t) => t.zoneId == null).length;
  const sortedZones = [...zones].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  return (
    <div className="zone-tabs">
      <button type="button" className={`zone-tab ${activeTab === 'all' ? 'is-active' : ''}`} onClick={() => onSelect('all')}>
        <AllZonesIcon />
        Все
        <span className="zone-tab-count">{tables.length}</span>
      </button>
      {sortedZones.map((zone) => (
        <button
          key={zone.id}
          type="button"
          className={`zone-tab ${activeTab === zone.id ? 'is-active' : ''}`}
          onClick={() => onSelect(zone.id)}
        >
          {pickZoneIcon(zone.name)}
          {zone.name}
          <span className="zone-tab-count">{tables.filter((t) => t.zoneId === zone.id).length}</span>
        </button>
      ))}
      {unzonedCount > 0 && (
        <button type="button" className={`zone-tab ${activeTab === 'unzoned' ? 'is-active' : ''}`} onClick={() => onSelect('unzoned')}>
          <UnzonedIcon />
          Без зоны
          <span className="zone-tab-count">{unzonedCount}</span>
        </button>
      )}
    </div>
  );
}
