import { useState } from 'react';
import { isConfigured, supabase } from '../data/supabase';
import { sendMagicLink, useAuth, verifyCode } from '../data/useAuth';
import { ToastProvider, useAction } from '../ui/Toast';
import { store } from '../ui/device';
import { ControlMain } from './ControlMain';
import './control.css';

export function ControlApp() {
  return (
    <ToastProvider>
      <div className="control">
        <Gate />
      </div>
    </ToastProvider>
  );
}

function Gate() {
  const auth = useAuth();
  const { busy, run } = useAction();

  if (!isConfigured) return <NotConfigured />;
  if (auth.loading) return <div className="center muted">Loading…</div>;
  if (!auth.session) return <SignIn />;
  if (!auth.owner) {
    return (
      <div className="center stack">
        <h1 className="c-title">Almost there</h1>
        {auth.claimable ? (
          <>
            <p>You're the first one here. Claim this app so only your account can keep score.</p>
            <button
              className="btn btn--xl btn--go"
              disabled={busy}
              onClick={() => run(async () => {
                const { error } = await supabase.rpc('claim_ownership');
                if (error) throw error;
                await auth.recheck();
              })}
            >
              Claim as owner
            </button>
          </>
        ) : (
          <p>{auth.session.user.email} isn't the owner of this app.</p>
        )}
        <button className="btn btn--ghost" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </div>
    );
  }
  return <ControlMain email={auth.session.user.email ?? ''} />;
}

function SignIn() {
  const [email, setEmail] = useState(() => store('owner-email') ?? '');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const { busy, run } = useAction();

  return (
    <form
      className="center stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (!sent) {
          store('owner-email', email);
          void run(() => sendMagicLink(email).then(() => setSent(true)));
        } else {
          void run(() => verifyCode(email, code.trim()));
        }
      }}
    >
      <h1 className="c-title">Control sign-in</h1>
      <label className="field">
        <span>Your email</span>
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={sent} />
      </label>
      {sent && (
        <>
          <p className="muted">
            Check your email and tap <b>Sign in</b>. Open the link in Safari on this phone (use Control in Safari, not as a
            home-screen app). If your email shows a code, you can type it here instead.
          </p>
          <label className="field">
            <span>Code from the email</span>
            <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
        </>
      )}
      <button className="btn btn--xl btn--go" disabled={busy}>
        {sent ? 'Sign in with code' : 'Email me a sign-in link'}
      </button>
      {sent && (
        <button type="button" className="btn btn--ghost" onClick={() => setSent(false)}>
          Use a different email
        </button>
      )}
    </form>
  );
}

function NotConfigured() {
  return (
    <div className="center stack">
      <h1 className="c-title">One more step</h1>
      <p>
        The Supabase key isn't set yet. Add your project's <b>anon public</b> key to <code>supabase.config.json</code> and redeploy.
      </p>
      <a className="btn btn--ghost" href="#/display">
        Preview the TV with sample data
      </a>
    </div>
  );
}
