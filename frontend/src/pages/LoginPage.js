import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, demoLogin, setToken, setStoredUser } from '../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const pending = useRef(false);

  const signIn = async (authenticate) => {
    if (pending.current) return;
    pending.current = true;
    setError(null);
    setLoading(true);
    try {
      const { token, user } = await authenticate();
      if (!token || !user?.id) throw new Error('Sign-in returned an incomplete session. Please try again.');
      setToken(token);
      setStoredUser(user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };
  const handleSubmit = (event) => { event.preventDefault(); return signIn(() => login(email, password)); };

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-brand">RANGER OPS</h1>
        <p className="login-sub">Wildlife Anti-Poaching Command</p>

        <button
          type="button"
          className="btn"
          onClick={() => signIn(demoLogin)}
          disabled={loading}
          aria-label="Log In as Demo"
          style={{ width: '100%', marginBottom: 16, padding: '12px 16px', background: '#0f766e', color: '#fff', border: '1px solid #2dd4bf', fontSize: 14 }}
        >
          Log In as Demo
        </button>
        <p className="login-hint" style={{ margin: '0 0 16px' }}>Or sign in with your account</p>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {error && <div className="ai-error" role="alert" style={{ marginBottom: 12 }}>{error}</div>}

        <button className="btn" type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? <><span className="spinner" />Authenticating...</> : 'Sign In'}
        </button>

        <p className="login-hint">
          Log In as Demo opens the configured local demo workspace.
        </p>
      </form>
    </div>
  );
}
