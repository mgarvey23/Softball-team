import { useState } from 'react';
import type { TeamApi } from '../types';
import { addPlayer, type PlayerInput } from '../teamOps';
import { PlayerForm } from './PlayerForm';

interface Props {
  team: TeamApi;
  onPicked: (playerId: string) => void;
}

/**
 * First-visit gate. The person either picks who they are from the existing
 * roster or signs themselves up. Their choice is remembered on the device, so
 * this only appears once (until they "switch").
 */
export function Welcome({ team, onPicked }: Props) {
  const { state } = team;
  const [signingUp, setSigningUp] = useState(state.players.length === 0);

  function handleSignUp(input: PlayerInput) {
    // Generate the id up front so it stays stable through the cloud transaction,
    // letting us mark this new player as "me" reliably.
    const newId = crypto.randomUUID();
    team.update((s) => addPlayer(s, input, newId).state);
    onPicked(newId);
  }

  return (
    <div className="welcome">
      <div className="welcome-card">
        <div className="brand">
          <span className="brand-logo">⚾</span>
          <h1>{state.teamName}</h1>
        </div>

        {signingUp ? (
          <>
            <p className="welcome-sub">Sign up for the team</p>
            <PlayerForm
              submitLabel="Join the team"
              onSubmit={handleSignUp}
              onCancel={state.players.length ? () => setSigningUp(false) : undefined}
            />
          </>
        ) : (
          <>
            <p className="welcome-sub">Who are you?</p>
            <div className="who-list">
              {state.players.map((p) => (
                <button
                  key={p.id}
                  className="who-item"
                  onClick={() => onPicked(p.id)}
                >
                  <span className="avatar">{initials(p.name)}</span>
                  <span className="who-name">{p.name}</span>
                  {p.jersey && <span className="who-jersey">#{p.jersey}</span>}
                </button>
              ))}
            </div>
            <button className="btn-primary block" onClick={() => setSigningUp(true)}>
              + I'm new — sign me up
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}
