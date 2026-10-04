export interface AvatarLike {
  name: string;
  emoji?: string | null;
  color?: string | null;
  photo_url?: string | null;
}

/** Photo, else emoji, else the first initial, on the player's color. */
export function Avatar({ player, className = '' }: { player: AvatarLike; className?: string }) {
  return (
    <span className={`avatar ${className}`} style={{ background: player.color ?? '#a66bff' }} aria-hidden>
      {player.photo_url ? (
        <img src={player.photo_url} alt="" className="avatar__img" />
      ) : (
        (player.emoji ?? player.name.charAt(0).toUpperCase())
      )}
    </span>
  );
}
