import { useState } from 'react';
import { playerName, type TeamApi } from '../types';
import { addIdea, removeIdea, toggleVote } from '../teamOps';
import { timeAgo } from '../format';

interface Props {
  team: TeamApi;
  meId: string;
}

/** A lightweight idea board: drop a suggestion, everyone upvotes the good ones. */
export function Ideas({ team, meId }: Props) {
  const { state } = team;
  const [text, setText] = useState('');

  // Most-voted first, then newest.
  const ideas = [...state.ideas].sort(
    (a, b) => b.votes.length - a.votes.length || b.createdAt - a.createdAt,
  );

  return (
    <section className="view">
      <div className="view-head">
        <div>
          <h2>Ideas</h2>
          <p className="muted">Suggestions for the team — vote up the best</p>
        </div>
      </div>

      <form
        className="idea-add"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          team.update((s) => addIdea(s, text, meId));
          setText('');
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Team dinner? New jerseys? Practice drill?"
        />
        <button className="btn-primary" disabled={!text.trim()}>
          Add
        </button>
      </form>

      <div className="idea-list">
        {ideas.map((idea) => {
          const voted = idea.votes.includes(meId);
          return (
            <div className="idea" key={idea.id}>
              <button
                className={`vote ${voted ? 'voted' : ''}`}
                onClick={() => team.update((s) => toggleVote(s, idea.id, meId))}
                title={voted ? 'Remove your vote' : 'Upvote'}
              >
                ▲<span className="vote-count">{idea.votes.length}</span>
              </button>
              <div className="idea-body">
                <p className="idea-text">{idea.text}</p>
                <span className="idea-meta">
                  {playerName(state, idea.authorId)} · {timeAgo(idea.createdAt)}
                </span>
              </div>
              {idea.authorId === meId && (
                <button
                  className="post-del"
                  title="Delete"
                  onClick={() => team.update((s) => removeIdea(s, idea.id))}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      {ideas.length === 0 && <p className="empty">No ideas yet. Toss one out!</p>}
    </section>
  );
}
