import { useState } from 'react';
import type { Player, TeamApi } from '../types';
import { addPlayer, removePlayer, updatePlayer, type PlayerInput } from '../teamOps';
import { PlayerForm } from './PlayerForm';
import { initials } from './Welcome';

interface Props {
  team: TeamApi;
  meId: string;
}

/** The team roster: everyone who's signed up, with add / edit / remove. */
export function Roster({ team, meId }: Props) {
  const { state } = team;
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const players = [...state.players].sort((a, b) => a.name.localeCompare(b.name));

  function handleAdd(input: PlayerInput) {
    team.update((s) => addPlayer(s, input).state);
    setAdding(false);
  }

  return (
    <section className="view">
      <div className="view-head">
        <div>
          <h2>Roster</h2>
          <p className="muted">{players.length} on the team</p>
        </div>
        {!adding && (
          <button className="btn-primary" onClick={() => setAdding(true)}>
            + Add player
          </button>
        )}
      </div>

      {adding && (
        <div className="card">
          <PlayerForm
            submitLabel="Add player"
            onSubmit={handleAdd}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      <div className="roster-grid">
        {players.map((p) =>
          editingId === p.id ? (
            <div className="card" key={p.id}>
              <PlayerForm
                initial={p}
                submitLabel="Save"
                onSubmit={(input) => {
                  team.update((s) => updatePlayer(s, p.id, input));
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            </div>
          ) : (
            <PlayerCard
              key={p.id}
              player={p}
              isMe={p.id === meId}
              onEdit={() => setEditingId(p.id)}
              onRemove={() => {
                if (confirm(`Remove ${p.name} from the roster?`)) {
                  team.update((s) => removePlayer(s, p.id));
                }
              }}
            />
          ),
        )}
      </div>

      {players.length === 0 && !adding && (
        <p className="empty">No players yet. Add the first one!</p>
      )}
    </section>
  );
}

function PlayerCard({
  player,
  isMe,
  onEdit,
  onRemove,
}: {
  player: Player;
  isMe: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const handed = [
    player.bats && `Bats ${player.bats}`,
    player.throws && `Throws ${player.throws}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className={`player-card ${isMe ? 'is-me' : ''}`}>
      <div className="player-top">
        <span className="avatar">{initials(player.name)}</span>
        <div className="player-id">
          <span className="player-name">
            {player.name}
            {isMe && <span className="you-badge">You</span>}
          </span>
          {player.jersey && <span className="player-jersey">#{player.jersey}</span>}
        </div>
      </div>

      {player.positions.length > 0 && (
        <div className="pos-tags">
          {player.positions.map((pos) => (
            <span className="pos-tag" key={pos}>
              {pos}
            </span>
          ))}
        </div>
      )}

      {handed && <p className="player-meta">{handed}</p>}
      {player.email && <p className="player-meta">{player.email}</p>}
      {player.phone && <p className="player-meta">{player.phone}</p>}

      <div className="card-actions">
        <button className="btn-ghost sm" onClick={onEdit}>
          Edit
        </button>
        <button className="btn-ghost sm danger" onClick={onRemove}>
          Remove
        </button>
      </div>
    </div>
  );
}
