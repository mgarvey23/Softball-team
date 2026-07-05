import { useState } from 'react';
import {
  AVAILABILITY_LABELS,
  availabilityCounts,
  playerName,
  type Availability,
  type Practice,
  type TeamApi,
} from '../types';
import { addPractice, removePractice, setAvailability } from '../teamOps';
import { formatDate, isUpcoming, todayISO } from '../format';

interface Props {
  team: TeamApi;
  meId: string;
}

const ORDER: Availability[] = ['yes', 'maybe', 'no'];

/** Propose practice times and let everyone mark whether they're in. */
export function Practices({ team, meId }: Props) {
  const { state } = team;
  const [showForm, setShowForm] = useState(false);

  const upcoming = state.practices.filter((p) => isUpcoming(p.date));
  const past = state.practices.filter((p) => !isUpcoming(p.date)).reverse();

  return (
    <section className="view">
      <div className="view-head">
        <div>
          <h2>Practices &amp; Games</h2>
          <p className="muted">Suggest a time and mark who's in</p>
        </div>
        {!showForm && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            + Propose a time
          </button>
        )}
      </div>

      {showForm && (
        <PracticeForm
          onCancel={() => setShowForm(false)}
          onCreate={(input) => {
            team.update((s) => addPractice(s, { ...input, createdBy: meId }));
            setShowForm(false);
          }}
        />
      )}

      {upcoming.map((p) => (
        <PracticeCard key={p.id} team={team} meId={meId} practice={p} />
      ))}

      {upcoming.length === 0 && !showForm && (
        <p className="empty">Nothing on the schedule. Propose a time above.</p>
      )}

      {past.length > 0 && (
        <details className="past-section">
          <summary>Past ({past.length})</summary>
          {past.map((p) => (
            <PracticeCard key={p.id} team={team} meId={meId} practice={p} past />
          ))}
        </details>
      )}
    </section>
  );
}

function PracticeForm({
  onCreate,
  onCancel,
}: {
  onCreate: (input: { date: string; time?: string; location?: string; note?: string }) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');

  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        if (!date) return;
        onCreate({ date, time, location, note });
      }}
    >
      <div className="field-row">
        <label className="field">
          <span>Date *</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="field grow">
          <span>Time</span>
          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="6:30 PM"
          />
        </label>
      </div>
      <label className="field">
        <span>Location</span>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Field / address"
        />
      </label>
      <label className="field">
        <span>Note</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional details"
        />
      </label>
      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          Post it
        </button>
      </div>
    </form>
  );
}

function PracticeCard({
  team,
  meId,
  practice,
  past,
}: {
  team: TeamApi;
  meId: string;
  practice: Practice;
  past?: boolean;
}) {
  const { state } = team;
  const counts = availabilityCounts(practice);
  const mine = practice.responses[meId];

  return (
    <div className={`card practice ${past ? 'is-past' : ''}`}>
      <div className="practice-head">
        <div>
          <span className="practice-date">{formatDate(practice.date)}</span>
          {practice.time && <span className="practice-time">{practice.time}</span>}
        </div>
        {practice.createdBy === meId && (
          <button
            className="btn-ghost sm danger"
            onClick={() => {
              if (confirm('Delete this?')) team.update((s) => removePractice(s, practice.id));
            }}
          >
            Delete
          </button>
        )}
      </div>

      {practice.location && <p className="practice-loc">📍 {practice.location}</p>}
      {practice.note && <p className="practice-note">{practice.note}</p>}

      <div className="avail-buttons">
        {ORDER.map((v) => (
          <button
            key={v}
            className={`avail-btn avail-${v} ${mine === v ? 'active' : ''}`}
            onClick={() => team.update((s) => setAvailability(s, practice.id, meId, v))}
          >
            {AVAILABILITY_LABELS[v]}
            <span className="avail-count">{counts[v]}</span>
          </button>
        ))}
      </div>

      {Object.keys(practice.responses).length > 0 && (
        <div className="avail-lists">
          {ORDER.map((v) => {
            const who = Object.entries(practice.responses)
              .filter(([, val]) => val === v)
              .map(([pid]) => playerName(state, pid));
            if (who.length === 0) return null;
            return (
              <div className="avail-list" key={v}>
                <span className={`avail-dot avail-${v}`} />
                <span className="avail-label">{AVAILABILITY_LABELS[v]}:</span>{' '}
                {who.join(', ')}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
