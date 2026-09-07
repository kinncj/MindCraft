import { getEngine } from '../game/engineRef';
import { useGameStore } from '../game/gameStore';
import { VEHICLE_LABELS, type VehicleKind } from '../engine/entities/vehicles';
import { jobById } from '../engine/entities/villagers';
import { KidButton } from './KidButton';
import { Sheet } from './ui/Sheet';

type Payload = { id: string; name?: string; variant?: string };

/** Tap a ride: hop in yourself, or hand the keys to a friend who drives (or flies) it around. */
export function VehiclePanel() {
  const openPanel = useGameStore((state) => state.openPanel);
  const payload = useGameStore((state) => state.panelPayload) as Payload | null;
  const closePanels = useGameStore((state) => state.closePanels);
  const showToast = useGameStore((state) => state.showToast);
  if (openPanel !== 'vehicle' || !payload) return null;
  const engine = getEngine();
  const ride = engine?.entities.byId(payload.id);
  if (!engine || !ride?.vehicle) return null;
  const kind = (ride.variant ?? 'car') as VehicleKind;
  const info = VEHICLE_LABELS[kind] ?? VEHICLE_LABELS.car;
  const driver = engine.entities.driverOf(ride.id);
  const villagers = engine.entities.all().filter((e) => e.kind === 'villager');
  const label = (v: { name?: string; variant?: string }): string => `${jobById(v.variant ?? '')?.emoji ?? '🧑'} ${v.name ?? 'Friend'}`;

  return (
    <Sheet title={info.label} emoji={info.emoji} onClose={closePanels} kind="dialog" hint={driver ? `${driver.name} is at the wheel!` : info.hint}>
      <div className="dialog-buttons">
        <KidButton
          tone="primary"
          onClick={() => {
            closePanels();
            engine.rideVehicle(ride.id);
          }}
        >
          {info.emoji} Ride it
        </KidButton>
        {driver && (
          <KidButton
            onClick={() => {
              engine.entities.stopRiding(driver.id);
              showToast(`${label(driver)} hopped off.`);
              closePanels();
            }}
          >
            🛑 Tell {driver.name} to hop off
          </KidButton>
        )}
      </div>
      <h3>Ask a friend to ride</h3>
      {villagers.length === 0 ? (
        <p className="sheet-hint">No neighbors nearby yet. Find one in the block list under Friends.</p>
      ) : (
        <div className="menu-list">
          {villagers.map((v) => (
            <KidButton
              key={v.id}
              tone={driver?.id === v.id ? 'primary' : 'default'}
              aria-pressed={driver?.id === v.id}
              onClick={() => {
                if (engine.entities.ride(v.id, ride.id)) {
                  showToast(`${label(v)} takes the ${info.label.toLowerCase()} for a spin! ${info.emoji}`);
                  closePanels();
                }
              }}
            >
              {label(v)}
              <span className="setting-hint">{driver?.id === v.id ? 'Riding now' : `Ask ${v.name} to ${kind === 'plane' || kind === 'helicopter' ? 'fly' : 'drive'} it`}</span>
            </KidButton>
          ))}
        </div>
      )}
    </Sheet>
  );
}
