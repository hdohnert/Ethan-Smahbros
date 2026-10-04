import { useState } from 'react';
import { addPlayer, AVATAR_COLORS, deletePlayer, updatePlayer, uploadPhoto } from '../data/api';
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
  const [editing, setEditing] = useState<Player | null>(null);
  const players = snap.players;
  const isDemo = Boolean(snap.tournament?.is_demo);

  const add = () => {
    const n = name.trim();
    if (!n) return;
    setName('');
    void run(
      () =>
        addPlayer({
          name: n,
          emoji: null,
          color: AVATAR_COLORS[players.length % AVATAR_COLORS.length],
          sort_order: players.reduce((m, p) => Math.max(m, p.sort_order), 0) + 1,
          is_demo: isDemo,
        }).then(live.refresh),
      `Added ${n}`,
    );
  };

  return (
    <div className="stack">
      <section className="card stack">
        <h2 className="card__title">Add a player</h2>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <input className="grow" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          <button className="btn btn--go" disabled={busy || !name.trim()}>
            Add
          </button>
        </form>
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
          })
        }
      >
        <p className="small">Only works for players with no results or tickets. Otherwise switch them off instead.</p>
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
