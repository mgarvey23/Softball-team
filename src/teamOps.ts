// ---------------------------------------------------------------------------
// Pure operations on TeamState. Every mutation the UI performs is expressed as
// one of these `(state, ...) => state` functions, so the local and cloud hooks
// stay identical: they just `update(op)`. Nothing here touches storage, React,
// or Firebase.
// ---------------------------------------------------------------------------

import type {
  Availability,
  FieldAssignment,
  Idea,
  Lineup,
  LineupEntry,
  Player,
  PlayerPosition,
  TeamState,
  Topic,
} from './types';

function uid(): string {
  return crypto.randomUUID();
}

// --- Settings --------------------------------------------------------------

export function setTeamName(state: TeamState, name: string): TeamState {
  return { ...state, teamName: name.trim() || state.teamName };
}

// --- Roster ----------------------------------------------------------------

export interface PlayerInput {
  name: string;
  jersey?: string;
  email?: string;
  phone?: string;
  bats?: Player['bats'];
  throws?: Player['throws'];
  positions?: PlayerPosition[];
}

/**
 * Add a player and return both the new state and the created player. Pass `id`
 * to keep the player's id stable when the op is re-applied inside a Firestore
 * transaction (so the caller can reliably reference the new player, e.g. to set
 * "this is me").
 */
export function addPlayer(
  state: TeamState,
  input: PlayerInput,
  id: string = uid(),
): { state: TeamState; player: Player } {
  const player: Player = {
    id,
    name: input.name.trim(),
    jersey: input.jersey?.trim() || undefined,
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    bats: input.bats,
    throws: input.throws,
    positions: input.positions ?? [],
    createdAt: Date.now(),
  };
  return { state: { ...state, players: [...state.players, player] }, player };
}

export function updatePlayer(
  state: TeamState,
  id: string,
  patch: Partial<PlayerInput>,
): TeamState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.id === id
        ? {
            ...p,
            ...('name' in patch ? { name: (patch.name ?? p.name).trim() } : {}),
            ...('jersey' in patch ? { jersey: patch.jersey?.trim() || undefined } : {}),
            ...('email' in patch ? { email: patch.email?.trim() || undefined } : {}),
            ...('phone' in patch ? { phone: patch.phone?.trim() || undefined } : {}),
            ...('bats' in patch ? { bats: patch.bats } : {}),
            ...('throws' in patch ? { throws: patch.throws } : {}),
            ...('positions' in patch ? { positions: patch.positions ?? [] } : {}),
          }
        : p,
    ),
  };
}

/** Remove a player and clean up their references across the team state. */
export function removePlayer(state: TeamState, id: string): TeamState {
  const scrubResponses = (responses: Record<string, Availability>) => {
    const { [id]: _removed, ...rest } = responses;
    return rest;
  };
  return {
    ...state,
    players: state.players.filter((p) => p.id !== id),
    practices: state.practices.map((pr) => ({
      ...pr,
      responses: scrubResponses(pr.responses),
    })),
    ideas: state.ideas.map((idea) => ({
      ...idea,
      votes: idea.votes.filter((v) => v !== id),
    })),
    lineups: state.lineups.map((l) => ({
      ...l,
      entries: l.entries.filter((e) => e.playerId !== id),
    })),
  };
}

// --- Practices -------------------------------------------------------------

export interface PracticeInput {
  date: string;
  time?: string;
  location?: string;
  note?: string;
  createdBy: string;
}

export function addPractice(state: TeamState, input: PracticeInput): TeamState {
  const practice = {
    id: uid(),
    date: input.date,
    time: input.time?.trim() || undefined,
    location: input.location?.trim() || undefined,
    note: input.note?.trim() || undefined,
    createdBy: input.createdBy,
    createdAt: Date.now(),
    responses: {},
  };
  const practices = [...state.practices, practice].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  return { ...state, practices };
}

export function removePractice(state: TeamState, id: string): TeamState {
  return { ...state, practices: state.practices.filter((p) => p.id !== id) };
}

export function setAvailability(
  state: TeamState,
  practiceId: string,
  playerId: string,
  value: Availability,
): TeamState {
  return {
    ...state,
    practices: state.practices.map((p) =>
      p.id === practiceId
        ? { ...p, responses: { ...p.responses, [playerId]: value } }
        : p,
    ),
  };
}

// --- Forum -----------------------------------------------------------------

export function addTopic(
  state: TeamState,
  title: string,
  body: string,
  authorId: string,
): TeamState {
  const now = Date.now();
  const topic: Topic = {
    id: uid(),
    title: title.trim(),
    authorId,
    createdAt: now,
    posts: body.trim()
      ? [{ id: uid(), authorId, body: body.trim(), createdAt: now }]
      : [],
  };
  return { ...state, topics: [topic, ...state.topics] };
}

export function addPost(
  state: TeamState,
  topicId: string,
  body: string,
  authorId: string,
): TeamState {
  const trimmed = body.trim();
  if (!trimmed) return state;
  return {
    ...state,
    topics: state.topics.map((t) =>
      t.id === topicId
        ? {
            ...t,
            posts: [
              ...t.posts,
              { id: uid(), authorId, body: trimmed, createdAt: Date.now() },
            ],
          }
        : t,
    ),
  };
}

export function removeTopic(state: TeamState, topicId: string): TeamState {
  return { ...state, topics: state.topics.filter((t) => t.id !== topicId) };
}

export function removePost(
  state: TeamState,
  topicId: string,
  postId: string,
): TeamState {
  return {
    ...state,
    topics: state.topics.map((t) =>
      t.id === topicId
        ? { ...t, posts: t.posts.filter((p) => p.id !== postId) }
        : t,
    ),
  };
}

// --- Ideas -----------------------------------------------------------------

export function addIdea(state: TeamState, text: string, authorId: string): TeamState {
  const trimmed = text.trim();
  if (!trimmed) return state;
  const idea: Idea = {
    id: uid(),
    authorId,
    text: trimmed,
    votes: [authorId],
    createdAt: Date.now(),
  };
  return { ...state, ideas: [idea, ...state.ideas] };
}

export function toggleVote(state: TeamState, ideaId: string, playerId: string): TeamState {
  return {
    ...state,
    ideas: state.ideas.map((idea) =>
      idea.id === ideaId
        ? {
            ...idea,
            votes: idea.votes.includes(playerId)
              ? idea.votes.filter((v) => v !== playerId)
              : [...idea.votes, playerId],
          }
        : idea,
    ),
  };
}

export function removeIdea(state: TeamState, ideaId: string): TeamState {
  return { ...state, ideas: state.ideas.filter((i) => i.id !== ideaId) };
}

// --- Lineups ---------------------------------------------------------------

export function addLineup(
  state: TeamState,
  name: string,
  createdBy: string,
  id: string = uid(),
): { state: TeamState; lineup: Lineup } {
  const now = Date.now();
  const lineup: Lineup = {
    id,
    name: name.trim() || 'New lineup',
    entries: [],
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
  return { state: { ...state, lineups: [lineup, ...state.lineups] }, lineup };
}

function mapLineup(
  state: TeamState,
  id: string,
  fn: (l: Lineup) => Lineup,
): TeamState {
  return {
    ...state,
    lineups: state.lineups.map((l) =>
      l.id === id ? { ...fn(l), updatedAt: Date.now() } : l,
    ),
  };
}

export function renameLineup(state: TeamState, id: string, name: string): TeamState {
  return mapLineup(state, id, (l) => ({ ...l, name: name.trim() || l.name }));
}

export function removeLineup(state: TeamState, id: string): TeamState {
  return { ...state, lineups: state.lineups.filter((l) => l.id !== id) };
}

/** Add a player to the bottom of a lineup's batting order (if not already in). */
export function addToLineup(
  state: TeamState,
  lineupId: string,
  playerId: string,
): TeamState {
  return mapLineup(state, lineupId, (l) =>
    l.entries.some((e) => e.playerId === playerId)
      ? l
      : { ...l, entries: [...l.entries, { playerId, position: 'BENCH' }] },
  );
}

export function removeFromLineup(
  state: TeamState,
  lineupId: string,
  playerId: string,
): TeamState {
  return mapLineup(state, lineupId, (l) => ({
    ...l,
    entries: l.entries.filter((e) => e.playerId !== playerId),
  }));
}

export function setLineupPosition(
  state: TeamState,
  lineupId: string,
  playerId: string,
  position: FieldAssignment,
): TeamState {
  return mapLineup(state, lineupId, (l) => ({
    ...l,
    entries: l.entries.map((e) =>
      e.playerId === playerId ? { ...e, position } : e,
    ),
  }));
}

/** Move a batting-order entry up (dir -1) or down (dir +1). */
export function moveLineupEntry(
  state: TeamState,
  lineupId: string,
  playerId: string,
  dir: -1 | 1,
): TeamState {
  return mapLineup(state, lineupId, (l) => {
    const idx = l.entries.findIndex((e) => e.playerId === playerId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= l.entries.length) return l;
    const entries = [...l.entries];
    const [moved] = entries.splice(idx, 1);
    entries.splice(target, 0, moved);
    return { ...l, entries };
  });
}

export function replaceState(_state: TeamState, next: TeamState): TeamState {
  return next;
}

/** Convenience for building LineupEntry objects in tests/UI. */
export function makeEntry(playerId: string, position: FieldAssignment): LineupEntry {
  return { playerId, position };
}
