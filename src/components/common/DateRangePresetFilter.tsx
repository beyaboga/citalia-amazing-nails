'use client';

import { DATE_RANGE_PRESET_LABELS, type DateRangePreset } from '@/lib/reportFilters';

interface DateRangePresetFilterProps {
  preset: DateRangePreset;
  onPresetChange: (preset: DateRangePreset) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
}

const PRESETS: DateRangePreset[] = ['TODAY', 'WEEK', 'MONTH', 'LAST_MONTH', 'CUSTOM'];

const DateRangePresetFilter = ({
  preset,
  onPresetChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
}: DateRangePresetFilterProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="max-w-xs">
        <label className="caption text-muted-foreground block mb-1">Período</label>
        <select
          value={preset}
          onChange={(e) => onPresetChange(e.target.value as DateRangePreset)}
          className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {PRESETS.map((p) => (
            <option key={p} value={p}>{DATE_RANGE_PRESET_LABELS[p]}</option>
          ))}
        </select>
      </div>

      {preset === 'CUSTOM' && (
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div>
            <label className="caption text-muted-foreground block mb-1">Desde</label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => onCustomFromChange(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="caption text-muted-foreground block mb-1">Hasta</label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => onCustomToChange(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePresetFilter;
