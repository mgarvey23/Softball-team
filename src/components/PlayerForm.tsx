import { useState } from 'react';
import {
  JERSEY_SIZES,
  POSITIONS,
  POSITION_LABELS,
  ROLES,
  ROLE_LABELS,
  type Hand,
  type JerseySize,
  type Player,
  type PlayerPosition,
} from '../types';
import type { PlayerInput } from '../teamOps';

interface Props {
  initial?: Player;
  submitLabel: string;
  onSubmit: (input: PlayerInput) => void;
  onCancel?: () => void;
}

/** Shared form for signing up a new player or editing an existing one. */
export function PlayerForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [jersey, setJersey] = useState(initial?.jersey ?? '');
  const [jerseySize, setJerseySize] = useState<JerseySize | ''>(initial?.jerseySize ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [bats, setBats] = useState<Hand | ''>(initial?.bats ?? '');
  const [throws, setThrows] = useState<'L' | 'R' | ''>(initial?.throws ?? '');
  const [positions, setPositions] = useState<PlayerPosition[]>(initial?.positions ?? []);

  function togglePosition(pos: PlayerPosition) {
    setPositions((prev) =>
      prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name,
      jersey,
      jerseySize: jerseySize || undefined,
      phone,
      bats: bats || undefined,
      throws: throws || undefined,
      positions,
    });
  }

  return (
    <form className="player-form" onSubmit={handleSubmit}>
      <div className="field-row">
        <label className="field grow">
          <span>Name *</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
            required
          />
        </label>
        <label className="field jersey">
          <span>Jersey #</span>
          <input
            value={jersey}
            onChange={(e) => setJersey(e.target.value)}
            placeholder="00"
            inputMode="numeric"
          />
        </label>
      </div>

      <div className="field-row">
        <label className="field grow">
          <span>Jersey size</span>
          <select
            value={jerseySize}
            onChange={(e) => setJerseySize(e.target.value as JerseySize | '')}
          >
            <option value="">—</option>
            {JERSEY_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <label className="field grow">
          <span>Phone</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="optional"
          />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Bats</span>
          <select value={bats} onChange={(e) => setBats(e.target.value as Hand | '')}>
            <option value="">—</option>
            <option value="R">Right</option>
            <option value="L">Left</option>
            <option value="S">Switch</option>
          </select>
        </label>
        <label className="field">
          <span>Throws</span>
          <select
            value={throws}
            onChange={(e) => setThrows(e.target.value as 'L' | 'R' | '')}
          >
            <option value="">—</option>
            <option value="R">Right</option>
            <option value="L">Left</option>
          </select>
        </label>
      </div>

      <div className="field">
        <span>Positions you can play</span>
        <div className="position-picker">
          {POSITIONS.map((pos) => (
            <button
              type="button"
              key={pos}
              className={`chip ${positions.includes(pos) ? 'chip-on' : ''}`}
              onClick={() => togglePosition(pos)}
              title={POSITION_LABELS[pos]}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Team roles (off the field)</span>
        <div className="position-picker">
          {ROLES.map((role) => (
            <button
              type="button"
              key={role}
              className={`chip chip-role ${positions.includes(role) ? 'chip-on' : ''}`}
              onClick={() => togglePosition(role)}
              title={ROLE_LABELS[role]}
            >
              {role === 'CHEF' ? '👨‍🍳 Chef' : '🧠 GM'}
            </button>
          ))}
        </div>
      </div>

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={!name.trim()}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
