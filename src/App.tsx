import { useEffect, useMemo, useState } from 'react';
import { isFirebaseConfigured, TEAM_ID } from './firebase';
import { useAnonAuth } from './hooks/useAnonAuth';
import { useCloudTeam } from './hooks/useCloudTeam';
import { useLocalTeam } from './hooks/useLocalTeam';
import { useIdentity } from './hooks/useIdentity';
import { Welcome, initials } from './components/Welcome';
import { Roster } from './components/Roster';
import { Practices } from './components/Practices';
import { Forum } from './components/Forum';
import { Ideas } from './components/Ideas';
import { Lineups } from './components/Lineups';
import { SettingsModal } from './components/SettingsModal';
import type { TeamApi } from './types';

// Firebase config is fixed per page load, so branching on it at the top level is
// safe (the chosen component — and therefore its hooks — is stable per render).
export default function App() {
  return isFirebaseConfigured ? <CloudApp /> : <LocalApp />;
}

/** Local-only path: on-device storage, no backend needed. */
function LocalApp() {
  const team = useLocalTeam();
  return <TeamShell team={team} mode="local" />;
}

/** Cloud path: shared Firestore doc, anonymous sign-in behind the scenes. */
function CloudApp() {
  const status = useAnonAuth();
  const { state, update } = useCloudTeam(TEAM_ID);

  if (status === 'error') {
    return (
      <Centered>
        <p>Couldn't connect to the team database.</p>
        <p className="muted">
          Check that Anonymous sign-in is enabled in Firebase Authentication.
        </p>
      </Centered>
    );
  }
  if (status === 'connecting' || !state) {
    return <Centered>Connecting to the team…</Centered>;
  }
  return <TeamShell team={{ state, update }} mode="cloud" />;
}

type Tab = 'roster' | 'practices' | 'forum' | 'ideas' | 'lineups';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'roster', label: 'Roster', icon: '🧢' },
  { id: 'practices', label: 'Schedule', icon: '📅' },
  { id: 'forum', label: 'Forum', icon: '💬' },
  { id: 'ideas', label: 'Ideas', icon: '💡' },
  { id: 'lineups', label: 'Lineups', icon: '⚾' },
];

/** The main app once the data backend is ready: identity gate + navigation. */
function TeamShell({ team, mode }: { team: TeamApi; mode: 'local' | 'cloud' }) {
  const { meId, setMe } = useIdentity();
  const [tab, setTab] = useState<Tab>('roster');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const me = useMemo(
    () => team.state.players.find((p) => p.id === meId) ?? null,
    [team.state.players, meId],
  );

  // Reflect the team's chosen name in the browser tab.
  useEffect(() => {
    document.title = team.state.teamName || 'Softball Team';
  }, [team.state.teamName]);

  // Not identified yet (first visit, or the chosen player was removed).
  if (!me) {
    return <Welcome team={team} onPicked={setMe} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <span className="brand-logo sm">⚾</span>
          <button className="team-name" onClick={() => setSettingsOpen(true)} title="Settings">
            {team.state.teamName}
          </button>
        </div>
        <div className="header-right">
          <span className={`conn conn-${mode}`} title={mode === 'cloud' ? 'Synced with the team' : 'On this device only'}>
            {mode === 'cloud' ? '● Live' : '● Local'}
          </span>
          <button className="me-chip" onClick={() => setMe(null)} title="Not you? Switch">
            <span className="avatar sm">{initials(me.name)}</span>
            <span className="me-name">{me.name}</span>
          </button>
        </div>
      </header>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>

      <main className="app-main">
        {tab === 'roster' && <Roster team={team} meId={me.id} />}
        {tab === 'practices' && <Practices team={team} meId={me.id} />}
        {tab === 'forum' && <Forum team={team} meId={me.id} />}
        {tab === 'ideas' && <Ideas team={team} meId={me.id} />}
        {tab === 'lineups' && <Lineups team={team} meId={me.id} />}
      </main>

      {settingsOpen && (
        <SettingsModal team={team} mode={mode} onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-loading">
      <div>{children}</div>
    </div>
  );
}
