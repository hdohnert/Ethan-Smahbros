import { useState } from 'react';
import { addPlayers, AVATAR_COLORS, deletePlayer, updatePlayer, uploadPhoto } from '../data/api';
import type { Player } from '../data/types';
import type { Live } from '../data/useSnapshot';
import { Avatar } from '../ui/Avatar';
import { Confirm } from '../ui/Confirm';
import { PhotoCropper } from '../ui/PhotoCropper';
import { useAction } from '../ui/Toast';

const EMOJI = ['🎂', '🦄', '🦖', '⚡', '🚀', '🐉', '🍕', '👾', '🌈', '🐱', '🏀', '🎮', '🌸', '⭐', '🐼', '🦊', '🐸', '🤖', '🦈', '🍩', '⚽', '🎸', '🐯', '🦋'];

export function PlayersTab({ live }: { live: Live }) {
  const snap = live.snap!;
  const { busy, run } = useAction();
  const [name, setName] = useState('');
  const [many, setMany] = useState('');
  const [editing, setEditing] = useState<Player | null>(null);
  const players = snap.players;
  const isDemo = Boolean(snap.tournament?.is_demo);

  // Names already on the list (case-insensitive) are skipped, so pasting twice is harmless.
  const addNames = (raw: string[]) => {
    const taken = new Set(players.map((p) => p.name.trim().toLowerCase()));
    const names: string[] = [];
    for (const r of raw) {
      const n = r.trim().slice(0, 40);
      if (n && !taken.has(n.toLowerCase())) {
        taken.add(n.toLowerCase());
        names.push(n);
      }
    }
    if (!names.length) return Promise.resolve(0);
    return addPlayers(names, players).then(() => live.refresh()).then(() => names.length);
  };

  if (isDemo) {
    return (
      <div className="stack">
        <section className="card stack">
          <h2 className="card__title">🎪 Demo mode is on</h2>
          <p>
            These are the 20 pretend kids. Your real players are safe and come back when you tap <b>Exit demo</b> on the Match
            tab. Add your real kids after exiting the demo.
          </p>
        </section>
        <section className="card">
          <h2 className="card__title">Demo players</h2>
          <ul className="plist">
            {players.map((p) => (
              <li key={p.id} className="plist__row">
                <span className="plist__who">
                  <Avatar player={p} />
                  <span className="plist__name">{p.name}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

  return (
    <div className="stack">
      <section className="card stack">
        <h2 className="card__title">Add a player</h2>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            const n = name.trim();
            setName('');
            void run(() => addNames([n]), (k) => (k ? `Added ${n}` : `${n} is already on the list`));
          }}
        >
          <input className="grow" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          <button className="btn btn--go" disabled={busy || !name.trim()}>
            Add
          </button>
        </form>
        <details className="many">
          <summary>Add several at once</summary>
          <textarea
            className="many__box"
            rows={8}
            placeholder={'One name per line, e.g.\nMaya\nLeo\nAva'}
            value={many}
            onChange={(e) => setMany(e.target.value)}
          />
          <button
            className="btn btn--go"
            disabled={busy || !many.trim()}
            onClick={() =>
              run(
                () => addNames(many.split(/[\n,]+/)).then((k) => {
                  setMany('');
                  return k;
                }),
                (k) => (k ? `Added ${k} ${k === 1 ? 'player' : 'players'}` : 'Those names are already on the list'),
              )
            }
          >
            Add all
          </button>
        </details>
        <p className="muted small">Add all the kids, even ones who skip the tournament, so they get a Ticket Bank account.</p>
      </section>

      <section className="card">
        <h2 className="card__title">
          Players <span className="muted">({players.filter((p) => p.active).length} here)</span>
        </h2>
        <ul className="plist">
          {players.map((p) => (
            <li key={p.id} className={`plist__row${p.active ? '' : ' plist__row--off'}`}>
              <button className="plist__who" onClick={() => setEditing(p)}>
                <Avatar player={p} />
                <span className="plist__name">{p.name}</span>
              </button>
              <label className="switch" title="Here tonight">
                <input
                  type="checkbox"
                  checked={p.active}
                  onChange={(e) => run(() => updatePlayer(p.id, { active: e.target.checked }).then(live.refresh))}
                />
                <span />
              </label>
            </li>
          ))}
        </ul>
        <p className="muted small">Switch off a kid who leaves or sits out; they drop out of line but keep their scores and tickets.</p>
      </section>

      {editing && <EditPlayer player={editing} live={live} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EditPlayer({ player, live, onClose }: { player: Player; live: Live; onClose: () => void }) {
  const [name, setName] = useState(player.name);
  const [emoji, setEmoji] = useState<string | null>(player.emoji);
  const [color, setColor] = useState(player.color ?? AVATAR_COLORS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [askDelete, setAskDelete] = useState(false);
  const { busy, run } = useAction();

  const save = () =>
    run(async () => {
      await updatePlayer(player.id, { name: name.trim() || player.name, emoji, color });
      await live.refresh();
      onClose();
    });

  if (file) {
    return (
      <PhotoCropper
        file={file}
        onCancel={() => setFile(null)}
        onDone={(blob) => {
          setFile(null);
          void run(async () => {
            const { path, url, expires } = await uploadPhoto(blob, `player-${player.id}`);
            await updatePlayer(player.id, { photo_path: path, photo_url: url, photo_url_expires: expires });
            await live.refresh();
          }, 'Photo saved');
        }}
      />
    );
  }

  if (askDelete) {
    return (
      <Confirm
        title={`Remove ${player.name}?`}
        confirmLabel="Remove"
        danger
        onCancel={() => setAskDelete(false)}
        onConfirm={() =>
          run(async () => {
            await deletePlayer(player.id);
            await live.refresh();
            onClose();
          }, `${player.name} removed`)
        }
      >
        <p className="small">
          This deletes {player.name} for good, including their tickets and any matches they played. To just take them out of
          line for a while, switch them off on the Players list instead.
        </p>
      </Confirm>
    );
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__title">
          <Avatar player={{ ...player, name, emoji, color }} className="avatar--big" />
        </div>
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        </label>
        <div className="field">
          <span>Avatar</span>
          <div className="emoji-grid">
            <button className={`emoji-btn${emoji === null ? ' emoji-btn--on' : ''}`} onClick={() => setEmoji(null)}>
              {name.charAt(0).toUpperCase() || '?'}
            </button>
            {EMOJI.map((e) => (
              <button key={e} className={`emoji-btn${emoji === e ? ' emoji-btn--on' : ''}`} onClick={() => setEmoji(e)}>
                {e}
              </button>
            ))}
          </div>
          <div className="row">
            {AVATAR_COLORS.map((c) => (
              <button key={c} className={`color-dot${color === c ? ' color-dot--on' : ''}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={c} />
            ))}
          </div>
        </div>
        <div className="row">
          <label className="btn grow">
            📷 {player.photo_url ? 'Change photo' : 'Add photo'}
            <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
          </label>
          {player.photo_url && (
            <button
              className="btn"
              onClick={() => run(() => updatePlayer(player.id, { photo_path: null, photo_url: null, photo_url_expires: null }).then(live.refresh))}
            >
              Remove photo
            </button>
          )}
        </div>
        <button className="btn btn--xl btn--go" onClick={save} disabled={busy}>
          Save
        </button>
        <button className="btn btn--ghost btn--danger-text" onClick={() => setAskDelete(true)}>
          Remove player
        </button>
      </div>
    </div>
  );
}
