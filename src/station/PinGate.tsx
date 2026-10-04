import { useState } from 'react';

export function PinGate({ title, error, onPin }: { title: string; error: string | null; onPin: (p: string) => void }) {
  const [pin, setPin] = useState('');
  return (
    <form
      className="center stack"
      onSubmit={(e) => {
        e.preventDefault();
        onPin(pin);
        setPin('');
      }}
    >
      <h1 className="c-title">{title}</h1>
      <label className="field">
        <span>Station PIN</span>
        <input className="pin-input" inputMode="numeric" autoComplete="off" pattern="[0-9]{4,8}" value={pin} onChange={(e) => setPin(e.target.value)} autoFocus />
      </label>
      {error && <div className="error-text">{error}</div>}
      <button className="btn btn--xl btn--go" disabled={!/^[0-9]{4,8}$/.test(pin)}>
        Unlock
      </button>
    </form>
  );
}
