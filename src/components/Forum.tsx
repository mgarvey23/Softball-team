import { useState } from 'react';
import { playerName, type TeamApi, type Topic } from '../types';
import { addPost, addTopic, removePost, removeTopic } from '../teamOps';
import { timeAgo } from '../format';
import { initials } from './Welcome';

interface Props {
  team: TeamApi;
  meId: string;
}

/** A simple discussion forum: create topics and reply within them. */
export function Forum({ team, meId }: Props) {
  const { state } = team;
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const open = state.topics.find((t) => t.id === openId) ?? null;
  if (open) {
    return (
      <TopicThread
        team={team}
        meId={meId}
        topic={open}
        onBack={() => setOpenId(null)}
      />
    );
  }

  return (
    <section className="view">
      <div className="view-head">
        <div>
          <h2>Forum</h2>
          <p className="muted">Start a topic, keep it organized</p>
        </div>
        {!creating && (
          <button className="btn-primary" onClick={() => setCreating(true)}>
            + New topic
          </button>
        )}
      </div>

      {creating && (
        <NewTopicForm
          onCancel={() => setCreating(false)}
          onCreate={(title, body) => {
            team.update((s) => addTopic(s, title, body, meId));
            setCreating(false);
          }}
        />
      )}

      <div className="topic-list">
        {state.topics.map((t) => {
          const replies = Math.max(0, t.posts.length - 1);
          const last = t.posts[t.posts.length - 1];
          return (
            <button className="topic-row" key={t.id} onClick={() => setOpenId(t.id)}>
              <div className="topic-main">
                <span className="topic-title">
                  {t.title}
                  {t.authorId === meId && <span className="you-badge">You</span>}
                </span>
                <span className="topic-meta">
                  by {playerName(state, t.authorId)} · {timeAgo(last?.createdAt ?? t.createdAt)}
                </span>
              </div>
              <span className="topic-count">{replies === 0 ? 'new' : `${replies} ⤷`}</span>
            </button>
          );
        })}
      </div>

      {state.topics.length === 0 && !creating && (
        <p className="empty">No topics yet. Start the first discussion.</p>
      )}
    </section>
  );
}

function NewTopicForm({
  onCreate,
  onCancel,
}: {
  onCreate: (title: string, body: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onCreate(title, body);
      }}
    >
      <label className="field">
        <span>Topic *</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's this about?"
          autoFocus
        />
      </label>
      <label className="field">
        <span>First message</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Kick off the discussion (optional)"
        />
      </label>
      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={!title.trim()}>
          Post topic
        </button>
      </div>
    </form>
  );
}

function TopicThread({
  team,
  meId,
  topic,
  onBack,
}: {
  team: TeamApi;
  meId: string;
  topic: Topic;
  onBack: () => void;
}) {
  const { state } = team;
  const [reply, setReply] = useState('');

  return (
    <section className="view">
      <button className="btn-ghost back" onClick={onBack}>
        ← All topics
      </button>
      <div className="view-head">
        <h2>{topic.title}</h2>
        {topic.authorId === meId && (
          <button
            className="btn-ghost sm danger"
            onClick={() => {
              if (confirm('Delete this whole topic?')) {
                team.update((s) => removeTopic(s, topic.id));
                onBack();
              }
            }}
          >
            Delete topic
          </button>
        )}
      </div>

      <div className="thread">
        {topic.posts.length === 0 && <p className="empty">No messages yet — say something.</p>}
        {topic.posts.map((post) => (
          <div className={`post ${post.authorId === meId ? 'mine' : ''}`} key={post.id}>
            <span className="avatar sm">{initials(playerName(state, post.authorId))}</span>
            <div className="post-body">
              <div className="post-head">
                <span className="post-author">{playerName(state, post.authorId)}</span>
                <span className="post-time">{timeAgo(post.createdAt)}</span>
                {post.authorId === meId && (
                  <button
                    className="post-del"
                    title="Delete"
                    onClick={() => team.update((s) => removePost(s, topic.id, post.id))}
                  >
                    ×
                  </button>
                )}
              </div>
              <p className="post-text">{post.body}</p>
            </div>
          </div>
        ))}
      </div>

      <form
        className="reply-bar"
        onSubmit={(e) => {
          e.preventDefault();
          if (!reply.trim()) return;
          team.update((s) => addPost(s, topic.id, reply, meId));
          setReply('');
        }}
      >
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Write a reply…"
        />
        <button className="btn-primary" disabled={!reply.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}
