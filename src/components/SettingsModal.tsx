import { useCallback, useEffect, useState } from 'react';
import type { TeamApi, TeamState } from '../types';
import { setTeamName } from '../teamOps';
import { exportState, importState } from '../storage';
import { TEAM_ID } from '../firebase';
import { listBackups, saveBackup, type Backup } from '../services/firestoreTeam';

interface Props {
  team: TeamApi;
  mode: 'local' | 'cloud';
  onClose: () => void;
}

function backupSummary(s: TeamState): string {
  const parts = [
    [s.players.length, 'players'],
    [s.practices.length, 'events'],
    [s.topics.length, 'topics'],
    [s.ideas.length, 'ideas'],
    [s.lineups.length, 'lineups'],
  ] as const;
  const nonZero = parts.filter(([n]) => n > 0).map(([n, label]) => `${n} ${label}`);
  return nonZero.length ? nonZero.join(' · ') : 'empty';
}

/** Team settings: rename the team, back up / restore data, and see how the
 *  app is currently storing things. */
export function SettingsModal({ team, mode, onClose }: Props) {
  const [name, setName] = useState(team.state.teamName);
  const [importText, setImportText] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [backups, setBackups] = useState<Backup[] | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshBackups = useCallback(async () => {
    try {
      setBackups(await listBackups(TEAM_ID));
    } catch {
      setBackups([]); // e.g. rules not updated yet; fail quietly
    }
  }, []);

  useEffect(() => {
    if (mode === 'cloud') void refreshBackups();
  }, [mode, refreshBackups]);

  async function backupNow() {
    setBusy(true);
    try {
      await saveBackup(TEAM_ID, team.state);
      await refreshBackups();
      setMsg('Backup saved.');
    } catch {
      setMsg("Couldn't save backup. Make sure the Firestore rules are updated.");
    } finally {
      setBusy(false);
    }
  }

  function restore(b: Backup) {
    const when = new Date(b.createdAt).toLocaleString();
    if (confirm(`Restore the team to the backup from ${when}?\n\nThis replaces the current data for everyone.`)) {
      team.update(() => b.state);
      setMsg(`Restored backup from ${when}.`);
    }
  }

  function download() {
    const blob = new Blob([exportState(team.state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'softball-team-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function doImport() {
    try {
      const next = importState(importText);
      team.update(() => next);
      setMsg('Imported successfully.');
      setImportText('');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Import failed.');
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <label className="field">
          <span>Team name</span>
          <div className="inline-save">
            <input value={name} onChange={(e) => setName(e.target.value)} />
            <button
              className="btn-primary"
              onClick={() => {
                team.update((s) => setTeamName(s, name));
                setMsg('Team name saved.');
              }}
            >
              Save
            </button>
          </div>
        </label>

        <div className="settings-section">
          <h3>Data</h3>
          <p className="muted">
            {mode === 'cloud'
              ? 'Synced live with your whole team via Firebase.'
              : 'Stored on this device only. Add Firebase config to share with the team.'}
          </p>
          <div className="form-actions left">
            <button className="btn-ghost" onClick={download}>
              Download backup
            </button>
          </div>
          <details className="import-box">
            <summary>Restore from a backup file</summary>
            <textarea
              rows={4}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste a backup file's contents here"
            />
            <button className="btn-ghost" onClick={doImport} disabled={!importText.trim()}>
              Import (replaces current data)
            </button>
          </details>
        </div>

        {mode === 'cloud' && (
          <div className="settings-section">
            <div className="backups-head">
              <h3>Automatic backups</h3>
              <button className="btn-ghost sm" onClick={backupNow} disabled={busy}>
                {busy ? 'Saving…' : 'Back up now'}
              </button>
            </div>
            <p className="muted">
              Snapshots are saved automatically as the team changes. If anything
              gets wiped, restore one here.
            </p>

            {backups === null ? (
              <p className="muted">Loading backups…</p>
            ) : backups.length === 0 ? (
              <p className="muted">No backups yet.</p>
            ) : (
              <ul className="backup-list">
                {backups.map((b) => (
                  <li className="backup-row" key={b.id}>
                    <div className="backup-info">
                      <span className="backup-when">
                        {new Date(b.createdAt).toLocaleString()}
                      </span>
                      <span className="backup-summary">{backupSummary(b.state)}</span>
                    </div>
                    <button className="btn-ghost sm" onClick={() => restore(b)}>
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {msg && <p className="settings-msg">{msg}</p>}
      </div>
    </div>
  );
}
