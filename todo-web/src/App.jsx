import { useState, useEffect, useRef } from "react";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api`;

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500;600&display=swap');`;

const globalStyles = `
  ${FONTS}
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; }

  .app-root {
    min-height: 100vh;
    transition: background 0.6s ease, color 0.6s ease;
  }

  .app-root.light {
    --bg: #f5f0e8; --bg2: #ede7d9; --card: #fff8ee;
    --card-border: rgba(180,150,100,0.25); --text: #2a1f0e; --text2: #7a6040;
    --accent: #c9813a; --accent2: #e8a84d; --glow: rgba(201,129,58,0.35);
    --lamp-body: #b5832e; --lamp-shade: #d4a544; --lamp-glow: rgba(255,200,80,0.7);
    --input-bg: rgba(255,255,255,0.8); --input-border: rgba(180,150,100,0.4);
    --shadow: rgba(80,50,10,0.12); --delete: #c0392b; --edit: #2980b9; --done: #27ae60;
    --error: #c0392b; --error-bg: rgba(192,57,43,0.08);
    --success: #27ae60; --success-bg: rgba(39,174,96,0.08);
    background: var(--bg); color: var(--text);
  }

  .app-root.dark {
    --bg: #0f0d0a; --bg2: #1a1610; --card: #1e1a14;
    --card-border: rgba(201,129,58,0.2); --text: #f0e4c8; --text2: #a08050;
    --accent: #e8a84d; --accent2: #f0c070; --glow: rgba(232,168,77,0.4);
    --lamp-body: #c9813a; --lamp-shade: #e8a84d; --lamp-glow: rgba(255,210,100,0.8);
    --input-bg: rgba(30,24,16,0.9); --input-border: rgba(201,129,58,0.3);
    --shadow: rgba(0,0,0,0.5); --delete: #e74c3c; --edit: #3498db; --done: #2ecc71;
    --error: #e74c3c; --error-bg: rgba(231,76,60,0.1);
    --success: #2ecc71; --success-bg: rgba(46,204,113,0.1);
    background: var(--bg); color: var(--text);
  }

  .app-root::before {
    content: ''; position: fixed; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
    pointer-events: none; z-index: 0; opacity: 0.4;
  }

  .login-page {
    min-height: 100vh; display: flex; align-items: center;
    justify-content: center; position: relative; overflow: hidden;
  }

  .login-scene {
    display: flex; flex-direction: column; align-items: center;
    gap: 0; position: relative; z-index: 1;
  }

  .lamp-wrapper {
    display: flex; flex-direction: column; align-items: center;
    cursor: pointer; position: relative; margin-bottom: -10px; z-index: 2;
  }

  .lamp-mount {
    width: 16px; height: 6px; border-radius: 3px 3px 0 0;
    background: linear-gradient(to bottom, var(--lamp-body), var(--text2));
  }

  .lamp-cord {
    width: 3px; height: 42px;
    background: linear-gradient(to bottom, var(--text2), var(--lamp-body));
    border-radius: 2px; transition: all 0.4s;
  }

  .lamp-svg { display: block; overflow: visible; }

  .lamp-shade-path {
    fill: url(#shadeGrad); stroke: var(--lamp-body); stroke-width: 1.5;
    stroke-linejoin: round; transition: filter 0.5s ease;
  }

  .lamp-wrapper.on .lamp-shade-path {
    filter: drop-shadow(0 4px 14px var(--lamp-glow));
  }

  .lamp-rim-top { fill: var(--lamp-body); opacity: 0.85; }
  .lamp-rim-bottom { fill: #000; opacity: 0.3; }

  .lamp-bulb-group { transition: filter 0.5s ease; }

  .lamp-wrapper.on .lamp-bulb-group {
    filter: drop-shadow(0 0 6px var(--lamp-glow)) drop-shadow(0 0 16px var(--lamp-glow));
  }

  .lamp-bulb-glass { fill: url(#bulbGrad); transition: fill 0.4s ease; }

  .lamp-glow-ellipse {
    opacity: 0; transition: opacity 0.6s ease;
  }

  .lamp-wrapper.on .lamp-glow-ellipse {
    opacity: 1; animation: beamPulse 3s ease-in-out infinite;
  }

  @keyframes beamPulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }

  .lamp-click-hint {
    font-size: 11px; color: var(--text2); letter-spacing: 0.12em;
    text-transform: uppercase; margin-top: 6px; opacity: 0.7;
    font-family: 'DM Sans', sans-serif; transition: opacity 0.4s;
  }

  .login-card {
    background: var(--card); border: 1px solid var(--card-border);
    border-radius: 20px; padding: 48px 40px 40px; width: 400px; max-width: 95vw;
    box-shadow: 0 20px 60px var(--shadow), 0 0 0 1px var(--card-border);
    position: relative; overflow: hidden; transform-origin: top center;
    transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease, box-shadow 0.5s ease;
  }

  .login-card.hidden { transform: scaleY(0) translateY(-20px); opacity: 0; pointer-events: none; }
  .login-card.visible { transform: scaleY(1) translateY(0); opacity: 1; }
  .login-card.lit { box-shadow: 0 20px 60px var(--shadow), 0 0 40px var(--glow), 0 0 0 1px var(--card-border); }

  .login-card-inner-glow {
    position: absolute; top: -60px; left: 50%; transform: translateX(-50%);
    width: 200px; height: 120px;
    background: radial-gradient(ellipse, var(--lamp-glow) 0%, transparent 70%);
    pointer-events: none; transition: opacity 0.5s; opacity: 0;
  }

  .login-card-inner-glow.on { opacity: 1; }

  .login-title {
    font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 700;
    margin-bottom: 6px; color: var(--text); text-align: center;
  }

  .login-subtitle {
    font-size: 13px; color: var(--text2); text-align: center;
    margin-bottom: 28px; letter-spacing: 0.04em;
  }

  .field-group { display: flex; flex-direction: column; gap: 14px; margin-bottom: 22px; }

  .field-label {
    display: block; font-size: 11px; font-weight: 600; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--text2); margin-bottom: 6px;
  }

  .field-input {
    width: 100%; padding: 12px 16px; background: var(--input-bg);
    border: 1px solid var(--input-border); border-radius: 10px;
    font-family: 'DM Sans', sans-serif; font-size: 15px; color: var(--text);
    outline: none; transition: border-color 0.3s, box-shadow 0.3s;
  }

  .field-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--glow); }
  .field-input::placeholder { color: var(--text2); opacity: 0.5; }

  .password-field-wrapper { position: relative; }
  .password-field-wrapper .field-input { padding-right: 44px; }

  .password-toggle-btn {
    position: absolute; right: 4px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    padding: 8px 10px; color: var(--text2); opacity: 0.7;
    transition: opacity 0.2s, color 0.2s;
  }

  .password-toggle-btn:hover { opacity: 1; }

  .login-btn {
    width: 100%; padding: 14px;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    border: none; border-radius: 12px; font-family: 'DM Sans', sans-serif;
    font-size: 15px; font-weight: 600; color: #fff; cursor: pointer;
    letter-spacing: 0.05em; transition: transform 0.2s, box-shadow 0.3s, opacity 0.2s;
    box-shadow: 0 4px 20px var(--glow);
  }

  .login-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 30px var(--glow); }
  .login-btn:active { transform: translateY(0); }
  .login-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

  .signup-divider {
    display: flex; align-items: center; gap: 12px; margin: 16px 0;
  }

  .signup-divider::before, .signup-divider::after {
    content: ''; flex: 1; height: 1px; background: var(--card-border);
  }

  .signup-divider span {
    font-size: 11px; color: var(--text2); letter-spacing: 0.08em; text-transform: uppercase;
  }

  .signup-text-btn {
    background: none; border: none; color: var(--accent);
    font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500;
    cursor: pointer; text-decoration: underline; text-decoration-color: transparent;
    transition: text-decoration-color 0.2s, color 0.2s; padding: 0;
    display: block; width: 100%; text-align: center; margin-top: 4px;
  }

  .signup-text-btn:hover { text-decoration-color: var(--accent); color: var(--accent2); }

  .forgot-link {
    background: none; border: none; color: var(--text2);
    font-family: 'DM Sans', sans-serif; font-size: 12px; cursor: pointer;
    text-decoration: underline; text-decoration-color: transparent;
    transition: text-decoration-color 0.2s, color 0.2s; padding: 0;
    display: block; margin: -10px 0 18px auto;
  }

  .forgot-link:hover { color: var(--accent); text-decoration-color: var(--accent); }

  .alert-box {
    padding: 10px 14px; border-radius: 8px; font-size: 13px;
    margin-bottom: 16px; display: flex; align-items: center; gap: 8px;
  }

  .alert-box.error { background: var(--error-bg); color: var(--error); border: 1px solid var(--error); }
  .alert-box.success { background: var(--success-bg); color: var(--success); border: 1px solid var(--success); }

  /* ── TODO PAGE ── */
  .todo-page {
    min-height: 100vh; max-width: 680px; margin: 0 auto;
    padding: 0 20px 60px; position: relative; z-index: 1;
  }

  .todo-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 24px 0 20px; border-bottom: 1px solid var(--card-border); margin-bottom: 40px;
  }

  .todo-brand {
    font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700;
    color: var(--accent); letter-spacing: 0.04em;
  }

  .header-right { display: flex; align-items: center; gap: 12px; }

  .mode-toggle {
    background: var(--card); border: 1px solid var(--card-border); border-radius: 50px;
    padding: 6px 14px; font-size: 13px; color: var(--text2); cursor: pointer;
    font-family: 'DM Sans', sans-serif; transition: all 0.2s;
  }

  .mode-toggle:hover { color: var(--text); border-color: var(--accent); }

  .logout-btn {
    background: none; border: 1px solid var(--card-border); border-radius: 50px;
    padding: 6px 16px; font-size: 13px; color: var(--text2); cursor: pointer;
    font-family: 'DM Sans', sans-serif; transition: all 0.2s;
  }

  .logout-btn:hover { color: var(--delete); border-color: var(--delete); }

  .todo-hero {
    margin-bottom: 28px; display: flex; align-items: flex-end;
    justify-content: space-between; gap: 20px; flex-wrap: wrap;
  }

  .todo-greeting {
    font-family: 'Playfair Display', serif; font-size: 36px; font-weight: 700;
    line-height: 1.2; margin-bottom: 6px;
  }

  .todo-date { font-size: 14px; color: var(--text2); letter-spacing: 0.04em; }

  .clock-box {
    background: var(--card); border: 1px solid var(--card-border);
    border-radius: 14px; padding: 10px 20px; text-align: center;
    box-shadow: 0 4px 16px var(--shadow); flex-shrink: 0;
  }

  .clock-time {
    font-family: 'DM Sans', sans-serif; font-variant-numeric: tabular-nums;
    font-size: 26px; font-weight: 600; letter-spacing: 0.02em; color: var(--accent);
  }

  .clock-label {
    font-size: 10px; color: var(--text2); letter-spacing: 0.14em;
    text-transform: uppercase; margin-top: 2px;
  }

  .stats-bar {
    max-width: 640px; margin: 0 auto 20px; display: flex; gap: 16px;
    font-size: 12px; color: var(--text2); letter-spacing: 0.06em; text-transform: uppercase;
  }

  .stat-pill {
    background: var(--card); border: 1px solid var(--card-border);
    border-radius: 50px; padding: 5px 12px; font-size: 11px; font-weight: 500;
  }

  .todo-input-area { display: flex; gap: 12px; margin-bottom: 28px; }

  .todo-input {
    flex: 1; padding: 14px 18px; background: var(--card);
    border: 1px solid var(--card-border); border-radius: 12px;
    font-family: 'DM Sans', sans-serif; font-size: 15px; color: var(--text);
    outline: none; transition: border-color 0.3s, box-shadow 0.3s;
  }

  .todo-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--glow); }
  .todo-input::placeholder { color: var(--text2); opacity: 0.5; }

  .add-btn {
    width: 50px; height: 50px;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    border: none; border-radius: 12px; font-size: 24px; color: #fff;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: transform 0.2s, box-shadow 0.3s; box-shadow: 0 4px 16px var(--glow); flex-shrink: 0;
  }

  .add-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 24px var(--glow); }

  .todo-list { display: flex; flex-direction: column; gap: 10px; }

  .todo-item {
    background: var(--card); border: 1px solid var(--card-border);
    border-radius: 14px; padding: 16px 18px; display: flex; align-items: center;
    gap: 14px; transition: border-color 0.3s, transform 0.2s;
  }

  .todo-item:hover { transform: translateX(3px); border-color: var(--accent); }

  .todo-check {
    width: 22px; height: 22px; border: 2px solid var(--card-border);
    border-radius: 6px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; flex-shrink: 0; font-size: 13px; color: #fff; transition: all 0.25s;
  }

  .todo-check.checked { background: var(--done); border-color: var(--done); }
  .todo-check:hover { border-color: var(--done); }

  .todo-text { flex: 1; font-size: 15px; line-height: 1.5; transition: color 0.3s; }
  .todo-text.done { text-decoration: line-through; color: var(--text2); opacity: 0.6; }

  .todo-edit-input {
    flex: 1; background: var(--input-bg); border: 1px solid var(--accent);
    border-radius: 8px; padding: 6px 12px; font-family: 'DM Sans', sans-serif;
    font-size: 15px; color: var(--text); outline: none; box-shadow: 0 0 0 3px var(--glow);
  }

  .todo-actions { display: flex; gap: 6px; }

  .icon-btn {
    width: 32px; height: 32px; border: none; border-radius: 8px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; transition: all 0.2s; background: transparent;
  }

  .btn-edit:hover { background: rgba(41,128,185,0.12); }
  .btn-delete:hover { background: rgba(231,76,60,0.12); }
  .btn-save { color: var(--done); }
  .btn-save:hover { background: rgba(39,174,96,0.12); }

  .empty-state { text-align: center; padding: 60px 20px; }
  .empty-icon { font-size: 40px; margin-bottom: 16px; }
  .empty-text { color: var(--text2); font-size: 15px; }

  .page-enter { animation: pageIn 0.6s cubic-bezier(0.34, 1.3, 0.64, 1) forwards; }

  @keyframes pageIn {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .spinner {
    width: 18px; height: 18px; border: 2px solid var(--card-border);
    border-top-color: var(--accent); border-radius: 50%;
    animation: spin 0.7s linear infinite; display: inline-block;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .user-badge {
    font-size: 11px; color: var(--text2); background: var(--card);
    border: 1px solid var(--card-border); border-radius: 50px;
    padding: 4px 10px; letter-spacing: 0.04em;
  }
`;

// ── API Helper ──────────────────────────────────────────────────
async function apiFetch(path, options = {}, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function StyleTag() {
  return <style dangerouslySetInnerHTML={{ __html: globalStyles }} />;
}

function Lamp({ isOn, onToggle }) {
  return (
    <div className={`lamp-wrapper ${isOn ? "on" : ""}`} onClick={onToggle} title="Click to toggle lamp">
      <div className="lamp-mount" />
      <div className="lamp-cord" />
      <svg className="lamp-svg" width="110" height="120" viewBox="0 0 110 120">
        <defs>
          <linearGradient id="shadeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--lamp-shade)" stopOpacity="0.55" />
            <stop offset="45%" stopColor="var(--lamp-shade)" />
            <stop offset="100%" stopColor="var(--lamp-body)" />
          </linearGradient>
          <radialGradient id="bulbGrad" cx="45%" cy="35%" r="65%">
            <stop offset="0%" stopColor={isOn ? "#fffbe6" : "#d8d8d8"} />
            <stop offset="55%" stopColor={isOn ? "#ffe27a" : "#a3a3a3"} />
            <stop offset="100%" stopColor={isOn ? "#f2ab2e" : "#7a7a7a"} />
          </radialGradient>
          <radialGradient id="glowGrad" cx="50%" cy="0%" r="75%">
            <stop offset="0%" stopColor="var(--lamp-glow)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--lamp-glow)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse className="lamp-glow-ellipse" cx="55" cy="88" rx="52" ry="30" fill="url(#glowGrad)" />

        <path d="M48 0 L48 8 M62 0 L62 8" stroke="var(--lamp-body)" strokeWidth="2" strokeLinecap="round" />

        <path className="lamp-shade-path" d="M43 8 L67 8 L90 50 L20 50 Z" />
        <ellipse className="lamp-rim-top" cx="55" cy="8" rx="12" ry="2.5" />
        <ellipse className="lamp-rim-bottom" cx="55" cy="50" rx="35" ry="5.5" />

        <g className="lamp-bulb-group">
          <line x1="55" y1="50" x2="55" y2="58" stroke="var(--lamp-body)" strokeWidth="2" />
          <circle className="lamp-bulb-glass" cx="55" cy="66" r="9" />
          <circle cx="52" cy="63" r="2.2" fill="#fff" opacity={isOn ? 0.85 : 0.25} />
        </g>
      </svg>
      <div className="lamp-click-hint">{isOn ? "Turn off" : "Turn on"}</div>
    </div>
  );
}

function EyeIcon({ open }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {open ? (
        <>
          <path d="M2 12C2 12 6 5 12 5C18 5 22 12 22 12C22 12 18 19 12 19C6 19 2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          <path d="M7 6.5L5.5 3.5" />
          <path d="M12 5L12 2" />
          <path d="M17 6.5L18.5 3.5" />
        </>
      ) : (
        <>
          <path d="M2 12Q12 18 22 12" />
          <path d="M6.5 14.5L5 17.5" />
          <path d="M12 16L12 19" />
          <path d="M17.5 14.5L19 17.5" />
        </>
      )}
    </svg>
  );
}

function PasswordField({ label, value, onChange, onKeyDown, placeholder, autoFocus, visible: controlledVisible, onToggleVisible }) {
  const [internalVisible, setInternalVisible] = useState(false);
  const isControlled = controlledVisible !== undefined;
  const visible = isControlled ? controlledVisible : internalVisible;
  const toggleVisible = isControlled ? onToggleVisible : () => setInternalVisible((v) => !v);

  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="password-field-wrapper">
        <input
          className="field-input"
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
        />
        <button
          type="button"
          className="password-toggle-btn"
          tabIndex={-1}
          onClick={toggleVisible}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          <EyeIcon open={visible} />
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// LOGIN PAGE
// ══════════════════════════════════════════
function LoginPage({ onLogin, darkMode, setDarkMode }) {
  const [resetToken] = useState(() => new URLSearchParams(window.location.search).get("resetToken"));
  const [lampOn, setLampOn] = useState(() => Boolean(resetToken));
  const [mode, setMode] = useState(() => (new URLSearchParams(window.location.search).get("resetToken") ? "reset" : "login"));

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const [forgotEmail, setForgotEmail] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetPwVisible, setResetPwVisible] = useState(false);

  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const showAlert = (type, msg) => {
    setAlert({ type, msg });
    if (type === "success") setTimeout(() => setAlert(null), 3000);
  };

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim())
      return showAlert("error", "Please fill in all fields.");
    setLoading(true);
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });
      localStorage.setItem("lumio_token", data.token);
      onLogin(data.user, data.token);
    } catch (err) {
      showAlert("error", err.message);
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    if (!signupName.trim() || !signupEmail.trim() || !signupPassword.trim())
      return showAlert("error", "Please fill in all fields.");
    setLoading(true);
    try {
      await apiFetch("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name: signupName.trim(), email: signupEmail.trim(), password: signupPassword }),
      });
      showAlert("success", "Account created! You can now log in.");
      setMode("login");
      setLoginEmail(signupEmail.trim());
      setLoginPassword("");
      setSignupName(""); setSignupEmail(""); setSignupPassword("");
    } catch (err) {
      showAlert("error", err.message);
    }
    setLoading(false);
  };

  const handleForgot = async () => {
    if (!forgotEmail.trim()) return showAlert("error", "Please enter your email.");
    setLoading(true);
    try {
      const data = await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      showAlert("success", data.message);
    } catch (err) {
      showAlert("error", err.message);
    }
    setLoading(false);
  };

  const handleReset = async () => {
    if (!newPassword.trim() || !confirmPassword.trim())
      return showAlert("error", "Please fill in all fields.");
    if (newPassword !== confirmPassword)
      return showAlert("error", "Passwords do not match.");
    setLoading(true);
    try {
      const data = await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: resetToken, password: newPassword }),
      });
      showAlert("success", data.message);
      setNewPassword("");
      setConfirmPassword("");
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => switchMode("login"), 1500);
    } catch (err) {
      showAlert("error", err.message);
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key !== "Enter") return;
    if (mode === "login") handleLogin();
    else if (mode === "signup") handleSignup();
    else if (mode === "forgot") handleForgot();
    else if (mode === "reset") handleReset();
  };

  const switchMode = (m) => { setMode(m); setAlert(null); };

  return (
    <div className="login-page">
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 10 }}>
        <button className="mode-toggle" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? "☀️ Light" : "🌙 Dark"}
        </button>
      </div>

      <div className="login-scene">
        <Lamp isOn={lampOn} onToggle={() => setLampOn(!lampOn)} />

        <div className={`login-card ${lampOn ? "visible lit" : "hidden"}`}>
          <div className={`login-card-inner-glow ${lampOn ? "on" : ""}`} />

          <div className="login-title">
            {mode === "login" && "Welcome Back"}
            {mode === "signup" && "Create Account"}
            {mode === "forgot" && "Reset Password"}
            {mode === "reset" && "Set New Password"}
          </div>
          <div className="login-subtitle">
            {mode === "forgot" && "Enter your email and we'll send you a reset link."}
            {mode === "reset" && "Choose a new password for your account."}
            {(mode === "login" || mode === "signup") && today}
          </div>

          {alert && (
            <div className={`alert-box ${alert.type}`}>
              {alert.type === "error" ? "⚠️" : "✅"} {alert.msg}
            </div>
          )}

          {mode === "login" && (
            <>
              <div className="field-group">
                <div>
                  <label className="field-label">Email Address</label>
                  <input className="field-input" type="email" placeholder="you@example.com"
                    value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                    onKeyDown={handleKey} autoFocus={lampOn} />
                </div>
                <PasswordField label="Password" placeholder="Your password"
                  value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                  onKeyDown={handleKey} />
              </div>
              <button type="button" className="forgot-link" onClick={() => switchMode("forgot")}>
                Forgot password?
              </button>
              <button className="login-btn" onClick={handleLogin} disabled={loading}>
                {loading ? "Checking..." : "Enter My Space →"}
              </button>
              <div className="signup-divider"><span>New here?</span></div>
              <button className="signup-text-btn" onClick={() => switchMode("signup")}>Sign Up</button>
            </>
          )}

          {mode === "signup" && (
            <>
              <div className="field-group">
                <div>
                  <label className="field-label">Your Name</label>
                  <input className="field-input" type="text" placeholder="e.g. Michael"
                    value={signupName} onChange={(e) => setSignupName(e.target.value)}
                    onKeyDown={handleKey} autoFocus={lampOn} />
                </div>
                <div>
                  <label className="field-label">Email Address</label>
                  <input className="field-input" type="email" placeholder="you@example.com"
                    value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)}
                    onKeyDown={handleKey} />
                </div>
                <PasswordField label="Password" placeholder="Min. 6 characters"
                  value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)}
                  onKeyDown={handleKey} />
              </div>
              <button className="login-btn" onClick={handleSignup} disabled={loading}>
                {loading ? "Creating account..." : "Create My Account →"}
              </button>
              <div className="signup-divider"><span>Already have an account?</span></div>
              <button className="signup-text-btn" onClick={() => switchMode("login")}>Log In</button>
            </>
          )}

          {mode === "forgot" && (
            <>
              <div className="field-group">
                <div>
                  <label className="field-label">Email Address</label>
                  <input className="field-input" type="email" placeholder="you@example.com"
                    value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                    onKeyDown={handleKey} autoFocus={lampOn} />
                </div>
              </div>
              <button className="login-btn" onClick={handleForgot} disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link →"}
              </button>
              <div className="signup-divider"><span>Remembered it?</span></div>
              <button className="signup-text-btn" onClick={() => switchMode("login")}>Back to Log In</button>
            </>
          )}

          {mode === "reset" && (
            <>
              <div className="field-group">
                <PasswordField label="New Password" placeholder="Min. 6 characters"
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  onKeyDown={handleKey} autoFocus={lampOn}
                  visible={resetPwVisible} onToggleVisible={() => setResetPwVisible((v) => !v)} />
                <PasswordField label="Confirm Password" placeholder="Re-enter password"
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={handleKey}
                  visible={resetPwVisible} onToggleVisible={() => setResetPwVisible((v) => !v)} />
              </div>
              <button className="login-btn" onClick={handleReset} disabled={loading}>
                {loading ? "Updating..." : "Update Password →"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// TODO ITEM
// ══════════════════════════════════════════
function TodoItem({ todo, onToggle, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.text);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const saveEdit = () => {
    if (draft.trim()) onEdit(todo.id, draft.trim());
    setEditing(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") saveEdit();
    if (e.key === "Escape") { setEditing(false); setDraft(todo.text); }
  };

  return (
    <div className="todo-item">
      <div className={`todo-check ${todo.done ? "checked" : ""}`} onClick={() => onToggle(todo.id)}>
        {todo.done && "✓"}
      </div>

      {editing ? (
        <input ref={inputRef} className="todo-edit-input" value={draft}
          onChange={(e) => setDraft(e.target.value)} onKeyDown={handleKey} />
      ) : (
        <span className={`todo-text ${todo.done ? "done" : ""}`}>{todo.text}</span>
      )}

      <div className="todo-actions">
        {editing ? (
          <button className="icon-btn btn-save" onClick={saveEdit} title="Save">✓</button>
        ) : (
          <button className="icon-btn btn-edit"
            onClick={() => { setEditing(true); setDraft(todo.text); }} title="Edit">✏️</button>
        )}
        <button className="icon-btn btn-delete" onClick={() => onDelete(todo.id)} title="Delete">🗑</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// TODO PAGE
// ══════════════════════════════════════════
function DigitalClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
  });

  return (
    <div className="clock-box">
      <div className="clock-time">{time}</div>
      <div className="clock-label">Local Time</div>
    </div>
  );
}

function TodoPage({ user, token, onLogout, darkMode, setDarkMode }) {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState("");
  const [loadingTasks, setLoadingTasks] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingTasks(true);
      try {
        const tasks = await apiFetch("/tasks", {}, token);
        setTodos(tasks);
      } catch (err) {
        console.error("Failed to load tasks:", err);
      }
      setLoadingTasks(false);
    })();
  }, [token]);

  const addTodo = async () => {
    if (!input.trim()) return;
    try {
      const task = await apiFetch("/tasks", { method: "POST", body: JSON.stringify({ text: input.trim() }) }, token);
      setTodos((prev) => [task, ...prev]);
      setInput("");
    } catch (err) { console.error(err); }
  };

  const toggleTodo = async (id) => {
    const todo = todos.find((t) => t.id === id);
    try {
      const updated = await apiFetch(`/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify({ done: !todo.done }),
      }, token);
      setTodos((prev) => prev.map((t) => t.id === id ? updated : t));
    } catch (err) { console.error(err); }
  };

  const deleteTodo = async (id) => {
    try {
      await apiFetch(`/tasks/${id}`, { method: "DELETE" }, token);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) { console.error(err); }
  };

  const editTodo = async (id, text) => {
    try {
      const updated = await apiFetch(`/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify({ text }),
      }, token);
      setTodos((prev) => prev.map((t) => t.id === id ? updated : t));
    } catch (err) { console.error(err); }
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const done = todos.filter((t) => t.done).length;
  const pending = todos.filter((t) => !t.done).length;

  return (
    <div className="todo-page page-enter">
      <div className="todo-header">
        <div className="todo-brand">✦ Lumio</div>
        <div className="header-right">
          <span className="user-badge">{user.email}</span>
          <button className="mode-toggle" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
          <button className="logout-btn" onClick={onLogout}>Sign out</button>
        </div>
      </div>

      <div className="todo-hero">
        <div>
          <div className="todo-greeting">Hello, {user.name} ✦</div>
          <div className="todo-date">{today}</div>
        </div>
        <DigitalClock />
      </div>

      <div className="stats-bar">
        <span className="stat-pill">📋 {todos.length} total</span>
        <span className="stat-pill">⏳ {pending} pending</span>
        <span className="stat-pill">✅ {done} done</span>
      </div>

      <div className="todo-input-area">
        <input className="todo-input" placeholder="Add a new task..."
          value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTodo()} />
        <button className="add-btn" onClick={addTodo}>+</button>
      </div>

      <div className="todo-list">
        {loadingTasks ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text2)" }}>
            <span className="spinner" /> &nbsp;Loading your tasks…
          </div>
        ) : todos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🌿</div>
            <div className="empty-text">Nothing here yet — add your first task!</div>
          </div>
        ) : (
          todos.map((todo) => (
            <TodoItem key={todo.id} todo={todo}
              onToggle={toggleTodo} onDelete={deleteTodo} onEdit={editTodo} />
          ))
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [darkMode, setDarkMode] = useState(true);

  // Auto-login if token exists in localStorage
  useEffect(() => {
    const saved = localStorage.getItem("lumio_token");
    if (saved) {
      try {
        const payload = JSON.parse(atob(saved.split(".")[1]));
        if (payload.exp * 1000 > Date.now()) {
          setUser({ id: payload.id, name: payload.name, email: payload.email });
          setToken(saved);
        } else {
          localStorage.removeItem("lumio_token");
        }
      } catch { localStorage.removeItem("lumio_token"); }
    }
  }, []);

  const handleLogin = (userData, tok) => {
    setUser(userData);
    setToken(tok);
  };

  const handleLogout = () => {
    localStorage.removeItem("lumio_token");
    setUser(null);
    setToken(null);
  };

  return (
    <div className={`app-root ${darkMode ? "dark" : "light"}`}>
      <StyleTag />
      {!user ? (
        <LoginPage onLogin={handleLogin} darkMode={darkMode} setDarkMode={setDarkMode} />
      ) : (
        <TodoPage user={user} token={token} onLogout={handleLogout}
          darkMode={darkMode} setDarkMode={setDarkMode} />
      )}
    </div>
  );
}
