// src/components/FamilyQuotaIndicator.tsx
const MAX_NIGHTS = 30

interface FamilyQuotaIndicatorProps {
  familyName: string
  usedNights: number
}

export function FamilyQuotaIndicator({ familyName, usedNights }: FamilyQuotaIndicatorProps) {
  const pct = Math.min((usedNights / MAX_NIGHTS) * 100, 100)
  const remaining = MAX_NIGHTS - usedNights

  return (
    <div className="bg-white border border-border rounded-xl p-4 shadow-card">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-sm font-medium text-navy">{familyName}</span>
        <span className="text-sm text-muted">
          <span className="font-semibold text-navy">{usedNights}</span> / {MAX_NIGHTS} noches
        </span>
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            usedNights >= MAX_NIGHTS ? 'bg-red-400' : 'bg-gold'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {usedNights < MAX_NIGHTS ? (
        <p className="text-xs text-muted mt-1.5">
          Te quedan <span className="font-medium text-navy">{remaining} noches</span> disponibles en los próximos 4 meses
        </p>
      ) : (
        <p className="text-xs text-red-500 mt-1.5 font-medium">
          Cuota agotada — no puedes hacer nuevas reservas este período
        </p>
      )}
    </div>
  )
}
