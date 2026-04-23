import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ThemeToggle from '../components/ui/ThemeToggle';
import Modal from '../components/ui/Modal';
import { forgotPasswordApi } from '../services/api';

export default function AuthPage() {
  const { login, register } = useAuth();
  const { showToast } = useToast();

  const [selectedRole, setSelectedRole] = useState('student');
  const [activeTab, setActiveTab] = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Student Signup fields
  const [suName, setSuName] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suDept, setSuDept] = useState('');
  const [suPass, setSuPass] = useState('');
  const [suConfirm, setSuConfirm] = useState('');

  // Forgot Password fields
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setError('');
    // Only students can sign up; others go to login
    if (role !== 'student') setActiveTab('login');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!loginEmail.trim() || !loginPass) {
      setError('Please provide Email and password');
      return;
    }
    setLoading(true);
    try {
      await login(loginEmail.trim().toLowerCase(), loginPass, selectedRole);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (!suName || !suEmail || !suPass || !suConfirm) {
      setError('Please fill in all required fields (Name, Email, and Password).');
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
      await register({ 
        name: suName, 
        email: suEmail, 
        dept: suDept, 
        password: suPass
      });
      showToast('Account created successfully!');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    if (!forgotEmail) {
      setForgotError('Please provide your Email.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await forgotPasswordApi({ email: forgotEmail });
      setForgotSuccess(res.data.message);
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Request failed. Please verify your details.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <>
      <ThemeToggle className="login-theme-btn" />

      <div className="auth-page" id="auth-root">
        {/* Left Visual Panel */}
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

        {/* Right Form Panel */}
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

            {/* Tabs — Sign Up only for students */}
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

            {/* SIGN IN */}
            {activeTab === 'login' && (
              <div>
                <h1 className="auth-title">Welcome Back 👋</h1>
                <p className="auth-hint">Sign in with your campus credentials</p>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleLogin} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '.95rem' }}>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <div className="input-icon-wrap">
                      <span className="input-icon">📧</span>
                      <input className="form-input" type="email" placeholder="Enter your email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <div className="input-icon-wrap">
                      <span className="input-icon">🔒</span>
                      <input className="form-input" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} />
                      <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>👁️</button>
                    </div>
                    <div style={{ textAlign: 'right', marginTop: '.3rem' }}>
                      <button 
                        type="button" 
                        className="btn-link" 
                        style={{ fontSize: '.82rem', color: 'var(--clr-blue)', fontWeight: 600, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                        onClick={() => { setIsForgotOpen(true); setForgotError(''); setForgotSuccess(''); }}
                      >
                        Forgot Password?
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
                    <button onClick={() => { setActiveTab('signup'); setError(''); }}>Create an account →</button>
                  </p>
                )}

                {selectedRole === 'collector' && (
                  <p className="auth-switch-text" style={{ opacity: 0.7, fontSize: '.82rem' }}>
                    Collector accounts are created by admin. Contact your administrator.
                  </p>
                )}
              </div>
            )}

            {/* STUDENT SIGN UP */}
            {activeTab === 'signup' && selectedRole === 'student' && (
              <div>
                <h1 className="auth-title">Join SustainX 🌱</h1>
                <p className="auth-hint">Create your student account — it's free</p>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleStudentSignup} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
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

      <Modal 
        id="forgot-modal" 
        isOpen={isForgotOpen} 
        onClose={() => setIsForgotOpen(false)} 
        title="Reset Password"
      >
        <div style={{ padding: '1.5rem' }}>
          {forgotSuccess ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
              <h3 style={{ color: 'var(--clr-green)', marginBottom: '.5rem' }}>Request Sent!</h3>
              <p className="text-muted" style={{ fontSize: '.9rem', lineHeight: '1.5' }}>{forgotSuccess}</p>
              <button className="btn btn-primary btn-full" style={{ marginTop: '1.5rem' }} onClick={() => setIsForgotOpen(false)}>Close</button>
            </div>
          ) : (
            <form onSubmit={handleForgotSubmit}>
              <p className="text-muted" style={{ fontSize: '.85rem', marginBottom: '1.2rem' }}>
                Enter your registered email address. We'll send instructions to reset your password.
              </p>
              
              {forgotError && <div className="auth-error" style={{ marginBottom: '1rem' }}>{forgotError}</div>}
              
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Email Address</label>
                <input 
                  className="form-input" 
                  type="email" 
                  placeholder="yourname@campus.edu" 
                  value={forgotEmail} 
                  onChange={(e) => setForgotEmail(e.target.value)} 
                />
              </div>
              
              <button type="submit" className="btn btn-primary btn-full" disabled={forgotLoading}>
                {forgotLoading ? '⏳ Requesting...' : 'Send Reset Instructions'}
              </button>
            </form>
          )}
        </div>
      </Modal>
    </>
  );
}
