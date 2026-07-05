import { useState } from 'react';
import type { TeamApi } from '../types';
import { setTeamName } from '../teamOps';
import { exportState, importState } from '../storage';

interface Props {
  team: TeamApi;
  mode: 'local' | 'cloud';
  onClose: () => void;
}

/** Team settings: rename the team, back up / restore data, and see how the
 *  app is currently storing things. */
export function SettingsModal({ team, mode, onClose }: Props) {
  const [name, setName] = useState(team.state.teamName);
  const [importText, setImportText] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

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
            <summary>Restore from backup</summary>
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

        {msg && <p className="settings-msg">{msg}</p>}
      </div>
    </div>
  );
}
