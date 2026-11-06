import { MapPin, Hash, Layers, BookMarked } from 'lucide-react';
import { AvailabilityBadge } from './AvailabilityBadge';
import type { BookCopy } from '../../types';

interface LocationCardProps {
  copy: BookCopy;
  index?: number;
}

export function LocationCard({ copy, index }: LocationCardProps) {
  return (
    <div className="card p-4 hover:border-primary-500/30 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookMarked size={16} className="text-primary-400 flex-shrink-0" />
          <span className="font-mono font-semibold text-white text-sm">
            {copy.accessionNumber}
          </span>
          {index !== undefined && (
            <span className="text-xs text-slate-500">Copy #{index + 1}</span>
          )}
        </div>
        <AvailabilityBadge status={copy.status} />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <LocationItem
          icon={<MapPin size={13} />}
          label="Rack"
          value={copy.rackId}
        />
        <LocationItem
          icon={<Layers size={13} />}
          label="Row"
          value={copy.rowNumber}
        />
        <LocationItem
          icon={<Hash size={13} />}
          label="Shelf"
          value={copy.shelfId}
        />
      </div>

      {copy.condition && (
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <span className="text-slate-600">Condition:</span>
          <span className="text-slate-400">{copy.condition}</span>
        </p>
      )}

      {copy.notes && (
        <p className="text-xs text-slate-500 mt-1 italic">{copy.notes}</p>
      )}
    </div>
  );
}

function LocationItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-slate-800/80 rounded-lg p-2 text-center">
      <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
        {icon}
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <span className="font-mono font-bold text-primary-400 text-sm">{value}</span>
    </div>
  );
}
