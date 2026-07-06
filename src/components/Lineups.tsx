import { useEffect, useState } from 'react';
import {
  assignmentLabel,
  isRole,
  POSITIONS,
  ROLES,
  playerName,
  type FieldAssignment,
  type Lineup,
  type TeamApi,
} from '../types';
import {
  addLineup,
  addToLineup,
  moveLineupEntry,
  removeFromLineup,
  removeLineup,
  renameLineup,
  setLineupPosition,
} from '../teamOps';

interface Props {
  team: TeamApi;
  meId: string;
}

/** Where the "ups" build a batting order and assign field positions per game. */
export function Lineups({ team, meId }: Props) {
  const { state } = team;
  const [openId, setOpenId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const open = state.lineups.find((l) => l.id === openId) ?? null;
  if (open) {
    return <LineupEditor team={team} lineup={open} onBack={() => setOpenId(null)} />;
  }

  return (
    <section className="view">
      <div className="view-head">
        <div>
          <h2>Lineups</h2>
          <p className="muted">Set the batting order and who plays where</p>
        </div>
      </div>

      <form
        className="idea-add"
        onSubmit={(e) => {
          e.preventDefault();
          // Fixed id so it survives the cloud transaction and we can open it.
          const id = crypto.randomUUID();
          team.update((s) => addLineup(s, newName || 'New lineup', meId, id).state);
          setNewName('');
          setOpenId(id);
        }}
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Lineup name (e.g. vs Sharks 7/12)"
        />
        <button className="btn-primary">+ New lineup</button>
      </form>

      <div className="lineup-list">
        {state.lineups.map((l) => (
          <button className="topic-row" key={l.id} onClick={() => setOpenId(l.id)}>
            <div className="topic-main">
              <span className="topic-title">{l.name}</span>
              <span className="topic-meta">
                {l.entries.length} batter{l.entries.length === 1 ? '' : 's'}
              </span>
            </div>
            <span className="topic-count">Edit ✎</span>
          </button>
        ))}
      </div>

      {state.lineups.length === 0 && (
        <p className="empty">No lineups yet. Name one above to start building.</p>
      )}
    </section>
  );
}

const FIELD_OPTIONS: FieldAssignment[] = [...POSITIONS, ...ROLES, 'BENCH'];

/** Short label for the position dropdown (field code, or a friendly role/bench). */
function optionLabel(a: FieldAssignment): string {
  if (a === 'BENCH') return 'Bench';
  if (a === 'GM') return '🧠 GM';
  if (a === 'CHEF') return '👨‍🍳 Chef';
  return a;
}

function LineupEditor({
  team,
  lineup,
  onBack,
}: {
  team: TeamApi;
  lineup: Lineup;
  onBack: () => void;
}) {
  const { state } = team;
  // Buffer the name locally and save on blur, so typing doesn't fire a write
  // (and a re-sync) on every keystroke.
  const [nameDraft, setNameDraft] = useState(lineup.name);
  useEffect(() => setNameDraft(lineup.name), [lineup.id]); // resync when switching lineups

  const inLineup = new Set(lineup.entries.map((e) => e.playerId));
  const available = state.players
    .filter((p) => !inLineup.has(p.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Which field positions are already taken, to flag double-ups. Off-field
  // roles (GM, Chef) and the bench aren't fielding spots, so they don't count.
  const taken = new Map<FieldAssignment, number>();
  for (const e of lineup.entries) {
    if (e.position !== 'BENCH' && !isRole(e.position)) {
      taken.set(e.position, (taken.get(e.position) ?? 0) + 1);
    }
  }

  return (
    <section className="view">
      <button className="btn-ghost back" onClick={onBack}>
        ← All lineups
      </button>

      <div className="view-head">
        <input
          className="lineup-name-input"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => {
            if (nameDraft.trim() && nameDraft !== lineup.name) {
              team.update((s) => renameLineup(s, lineup.id, nameDraft));
            }
          }}
        />
        <button
          className="btn-ghost sm danger"
          onClick={() => {
            if (confirm('Delete this lineup?')) {
              team.update((s) => removeLineup(s, lineup.id));
              onBack();
            }
          }}
        >
          Delete
        </button>
      </div>

      <ol className="batting-order">
        {lineup.entries.map((entry, i) => {
          const dup = (taken.get(entry.position) ?? 0) > 1;
          const roleSlot = isRole(entry.position);
          return (
            <li className="batter" key={entry.playerId}>
              <span className="bat-num">{i + 1}</span>
              <span className="bat-name">{playerName(state, entry.playerId)}</span>
              <select
                className={`bat-pos ${entry.position === 'BENCH' ? 'benched' : ''} ${roleSlot ? 'role' : ''} ${dup ? 'dup' : ''}`}
                value={entry.position}
                title={dup ? 'Two players in this position' : assignmentLabel(entry.position)}
                onChange={(e) =>
                  team.update((s) =>
                    setLineupPosition(s, lineup.id, entry.playerId, e.target.value as FieldAssignment),
                  )
                }
              >
                {FIELD_OPTIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {optionLabel(pos)}
                  </option>
                ))}
              </select>
              <div className="bat-move">
                <button
                  disabled={i === 0}
                  onClick={() => team.update((s) => moveLineupEntry(s, lineup.id, entry.playerId, -1))}
                  title="Move up"
                >
                  ▲
                </button>
                <button
                  disabled={i === lineup.entries.length - 1}
                  onClick={() => team.update((s) => moveLineupEntry(s, lineup.id, entry.playerId, 1))}
                  title="Move down"
                >
                  ▼
                </button>
              </div>
              <button
                className="post-del"
                title="Remove from lineup"
                onClick={() => team.update((s) => removeFromLineup(s, lineup.id, entry.playerId))}
              >
                ×
              </button>
            </li>
          );
        })}
        {lineup.entries.length === 0 && (
          <p className="empty">Add players from the bench below.</p>
        )}
      </ol>

      {available.length > 0 && (
        <div className="bench">
          <h3>Add a batter</h3>
          <div className="bench-chips">
            {available.map((p) => (
              <button
                key={p.id}
                className="chip"
                onClick={() => team.update((s) => addToLineup(s, lineup.id, p.id))}
              >
                + {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {state.players.length === 0 && (
        <p className="empty">Add players to the roster first, then build a lineup.</p>
      )}
    </section>
  );
}
