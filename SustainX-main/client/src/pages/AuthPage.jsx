import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ThemeToggle from '../components/ui/ThemeToggle';

export default function AuthPage() {
  const { login, register } = useAuth();
  const { showToast } = useToast();

  const [selectedRole, setSelectedRole] = useState('student');
  const [activeTab, setActiveTab] = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Login fields
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Signup fields
  const [suName, setSuName] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suDept, setSuDept] = useState('');
  const [suPass, setSuPass] = useState('');
  const [suConfirm, setSuConfirm] = useState('');

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setError('');
    if (role !== 'student') setActiveTab('login');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!loginId.trim() || !loginPass) {
      setError('Please provide User ID and password');
      return;
    }
    setLoading(true);
    try {
      await login(loginId.trim().toUpperCase(), loginPass, selectedRole);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (!suName || !suEmail || !suDept || !suPass || !suConfirm) {
      setError('Please fill in all fields.');
      return;
    }
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(suEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (suPass.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (suPass !== suConfirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await register({ name: suName, email: suEmail, dept: suDept, password: suPass });
      showToast('Account created successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ThemeToggle className="login-theme-btn" />

      <div className="auth-page" id="auth-root">
        {/* ══ Left Visual Panel ══ */}
        <div className="auth-visual">
          <div className="auth-bubbles" aria-hidden="true">
            <span className="auth-bubble"></span>
            <span className="auth-bubble"></span>
            <span className="auth-bubble"></span>
            <span className="auth-bubble"></span>
            <span className="auth-bubble"></span>
          </div>

          <div className="auth-visual-brand">
            <div className="brand-icon">♻️</div>
            <div className="brand-name">SustainX</div>
            <div className="brand-sub">Campus Clean Initiative</div>
          </div>

          <div className="auth-tagline">
            Keep Campus<br /><span>Clean &amp; Green</span>
          </div>

          <p className="auth-sub">
            Report waste, track complaints, and earn rewards for a cleaner campus environment.
          </p>

          <div className="auth-badges">
            <span className="auth-badge">🌱 SDG 11</span>
            <span className="auth-badge">🌍 SDG 13</span>
            <span className="auth-badge">🏆 Reward System</span>
          </div>
        </div>

        {/* ══ Right Form Panel ══ */}
        <div className="auth-form-panel">
          <div className="auth-form-box">
            {/* Role Selector */}
            <div className="role-selector" role="group" aria-label="Select your role">
              {['student', 'collector', 'admin'].map((role) => (
                <button
                  key={role}
                  className={`role-btn ${selectedRole === role ? 'active' : ''}`}
                  onClick={() => handleRoleSelect(role)}
                >
                  {role === 'student' ? '🎓 Student' : role === 'collector' ? '🚛 Collector' : '⚙️ Admin'}
                </button>
              ))}
            </div>

            {/* Tabs */}
            <div className="auth-tabs" role="tablist">
              <button
                className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => { setActiveTab('login'); setError(''); }}
              >
                Sign In
              </button>
              {selectedRole === 'student' && (
                <button
                  className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('signup'); setError(''); }}
                >
                  Sign Up
                </button>
              )}
            </div>

            {/* ════ SIGN IN ════ */}
            {activeTab === 'login' && (
              <div>
                <h1 className="auth-title">Welcome Back 👋</h1>
                <p className="auth-hint">Sign in with your campus credentials</p>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleLogin} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '.95rem' }}>
                  <div className="form-group">
                    <label className="form-label">User ID</label>
                    <div className="input-icon-wrap">
                      <span className="input-icon">👤</span>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="Enter your User ID"
                        value={loginId}
                        onChange={(e) => setLoginId(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <div className="input-icon-wrap">
                      <span className="input-icon">🔒</span>
                      <input
                        className="form-input"
                        type={showPass ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginPass}
                        onChange={(e) => setLoginPass(e.target.value)}
                      />
                      <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                        👁️
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
                    {loading ? '⏳' : 'Sign In →'}
                  </button>
                </form>

                {selectedRole === 'student' && (
                  <p className="auth-switch-text">
                    New to SustainX?{' '}
                    <button onClick={() => { setActiveTab('signup'); setError(''); }}>
                      Create an account →
                    </button>
                  </p>
                )}
              </div>
            )}

            {/* ════ SIGN UP ════ */}
            {activeTab === 'signup' && selectedRole === 'student' && (
              <div>
                <h1 className="auth-title">Join SustainX 🌱</h1>
                <p className="auth-hint">Create your student account — it's free</p>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSignup} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <div className="input-icon-wrap">
                      <span className="input-icon">✏️</span>
                      <input className="form-input" type="text" placeholder="Your full name" value={suName} onChange={(e) => setSuName(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <div className="input-icon-wrap">
                      <span className="input-icon">📧</span>
                      <input className="form-input" type="email" placeholder="you@campus.edu" value={suEmail} onChange={(e) => setSuEmail(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <div className="input-icon-wrap">
                      <span className="input-icon">📚</span>
                      <input className="form-input" type="text" placeholder="e.g. Computer Science" value={suDept} onChange={(e) => setSuDept(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <div className="input-icon-wrap">
                      <span className="input-icon">🔒</span>
                      <input className="form-input" type="password" placeholder="Min. 6 characters" value={suPass} onChange={(e) => setSuPass(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm Password</label>
                    <div className="input-icon-wrap">
                      <span className="input-icon">🔒</span>
                      <input className="form-input" type="password" placeholder="Repeat password" value={suConfirm} onChange={(e) => setSuConfirm(e.target.value)} />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
                    {loading ? '⏳' : 'Create Account →'}
                  </button>
                </form>

                <p className="auth-switch-text">
                  Already have an account?{' '}
                  <button onClick={() => { setActiveTab('login'); setError(''); }}>Sign in →</button>
                </p>
              </div>
            )}

            <p className="auth-footer-bar">SustainX v1.0 &nbsp;·&nbsp; Campus Clean Initiative</p>
          </div>
        </div>
      </div>
    </>
  );
}
