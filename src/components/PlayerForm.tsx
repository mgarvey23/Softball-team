import { useState } from 'react';
import { POSITIONS, POSITION_LABELS, type Hand, type Player, type Position } from '../types';
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
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [bats, setBats] = useState<Hand | ''>(initial?.bats ?? '');
  const [throws, setThrows] = useState<'L' | 'R' | ''>(initial?.throws ?? '');
  const [positions, setPositions] = useState<Position[]>(initial?.positions ?? []);

  function togglePosition(pos: Position) {
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
      email,
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
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="optional"
          />
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
