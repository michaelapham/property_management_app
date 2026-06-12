import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../data/store";
import { SwipeProvider } from "../contexts/SwipeContext";
import SpeedDial from "./SpeedDial";
import Overlay from "./Overlay";
import PageTransition from "./PageTransition";
import {
  BuildingIcon,
  HomeIcon,
  MenuIcon,
  ScanIcon,
  WrenchIcon,
} from "./icons";

const TABS = [
  { to: "/", label: "Today", icon: HomeIcon, end: true },
  { to: "/properties", label: "Properties", icon: BuildingIcon },
  { to: "/contractors", label: "Contractors", icon: WrenchIcon },
  { to: "/scanner", label: "Scanner", icon: ScanIcon },
];

const TITLES: Record<string, { title: string; sub?: string }> = {
  "/": { title: "Today", sub: "Rent & tasks at a glance" },
  "/tenants": { title: "Tenants" },
  "/properties": { title: "Properties" },
  "/contractors": { title: "Contractors" },
  "/scanner": { title: "Receipt Scanner", sub: "Scan & keep records for taxes" },
  "/settings": { title: "Settings" },
  "/tasks": { title: "Tasks", sub: "Property to-do list" },
};

const SUGGESTIONS_KEY = "landlordhq-suggestions";
const ACCOUNT_KEY = "landlordhq-account";
const SIGNED_IN_KEY = "landlordhq-signed-in";

interface Account {
  name: string;
  email: string;
  password: string;
}

function loadAccount(): Account | null {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNT_KEY) ?? "null");
  } catch {
    return null;
  }
}

type DrawerView =
  | "menu"
  | "account"
  | "suggestions"
  | "about"
  | "create"
  | "signin";

export default function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { updateSettings } = useStore();
  const head = TITLES[pathname];

  // Frosted-glass header drop-shadow once the page is scrolled.
  const topBarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const onScroll = () => {
      const el = topBarRef.current;
      if (!el) return;
      el.classList.toggle("top-bar--scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerView, setDrawerView] = useState<DrawerView>("menu");
  const [suggestionText, setSuggestionText] = useState("");
  const [suggestionSent, setSuggestionSent] = useState(false);

  // Local account — stored on device only
  const [account, setAccount] = useState<Account | null>(loadAccount);
  const [signedIn, setSignedIn] = useState(
    () => localStorage.getItem(SIGNED_IN_KEY) === "1"
  );
  const [acctName, setAcctName] = useState("");
  const [acctEmail, setAcctEmail] = useState("");
  const [acctPassword, setAcctPassword] = useState("");
  const [authError, setAuthError] = useState("");

  function openDrawer() {
    setDrawerView("menu");
    setSuggestionSent(false);
    setShowDrawer(true);
  }

  function closeDrawer() {
    setShowDrawer(false);
  }

  function goTo(view: DrawerView) {
    setAcctName("");
    setAcctEmail("");
    setAcctPassword("");
    setAuthError("");
    setDrawerView(view);
  }

  function submitSuggestion() {
    if (!suggestionText.trim()) return;
    const stored = JSON.parse(
      localStorage.getItem(SUGGESTIONS_KEY) ?? "[]"
    ) as string[];
    stored.push(suggestionText.trim());
    localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(stored));
    setSuggestionText("");
    setSuggestionSent(true);
  }

  function createAccount() {
    const acct: Account = {
      name: acctName.trim(),
      email: acctEmail.trim().toLowerCase(),
      password: acctPassword,
    };
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(acct));
    localStorage.setItem(SIGNED_IN_KEY, "1");
    setAccount(acct);
    setSignedIn(true);
    // The account's real name appears as the landlord name on ledger exports
    updateSettings({ landlordName: acct.name });
    goTo("account");
  }

  function signIn() {
    if (
      account &&
      acctEmail.trim().toLowerCase() === account.email &&
      acctPassword === account.password
    ) {
      localStorage.setItem(SIGNED_IN_KEY, "1");
      setSignedIn(true);
      if (account.name) updateSettings({ landlordName: account.name });
      goTo("account");
    } else {
      setAuthError(
        account
          ? "Email or password doesn't match."
          : "No account found on this device — create one first."
      );
    }
  }

  function logOut() {
    localStorage.removeItem(SIGNED_IN_KEY);
    setSignedIn(false);
    setDrawerView("menu");
  }

  const createValid =
    acctName.trim().length > 1 &&
    acctEmail.trim().includes("@") &&
    acctPassword.length >= 4;

  return (
    <div className="app-shell">
      <nav className="tab-nav" aria-label="Main navigation">
        <div className="nav-brand">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
          LandlordHQ
        </div>
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="app-content">
        <header className="top-bar" ref={topBarRef}>
          <div className="top-bar-inner">
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1>
                <button
                  className="top-bar-logo-btn"
                  aria-label="Go to Today"
                  onClick={() => navigate("/")}
                >
                  <img className="logo" src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
                </button>
                {head?.title ?? "LandlordHQ"}
              </h1>
              {head?.sub && <div className="subtitle">{head.sub}</div>}
            </div>
            <button
              className="top-bar-menu-btn"
              aria-label="Menu"
              onClick={openDrawer}
            >
              <MenuIcon size={21} />
            </button>
          </div>
        </header>
        <main className="app-main">
          <SwipeProvider>
            <PageTransition>
              <Outlet />
            </PageTransition>
          </SwipeProvider>
        </main>
        <SpeedDial />
        {pathname === "/tasks" && (
          <button
            className="task-add-bar"
            onClick={() => window.dispatchEvent(new CustomEvent("landlord:open-task-modal"))}
          >
            + Add Task
          </button>
        )}
      </div>

      {showDrawer && (
        <Overlay className="drawer-overlay" onBackdropClick={closeDrawer}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              {drawerView !== "menu" && (
                <button className="drawer-back" onClick={() => goTo("menu")}>
                  ← Back
                </button>
              )}
              <button className="drawer-close" onClick={closeDrawer}>✕</button>
            </div>

            {drawerView === "menu" && (
              <>
                {signedIn && (
                  <button className="drawer-item" onClick={() => goTo("account")}>
                    Account
                  </button>
                )}
                <button
                  className="drawer-item"
                  onClick={() => {
                    closeDrawer();
                    navigate("/tenants");
                  }}
                >
                  Tenants
                </button>
                <button
                  className="drawer-item"
                  onClick={() => {
                    closeDrawer();
                    navigate("/settings");
                  }}
                >
                  Settings
                </button>
                <button className="drawer-item" onClick={() => goTo("suggestions")}>
                  Suggestion Box
                </button>
                <button className="drawer-item" onClick={() => goTo("about")}>
                  About
                </button>
                {signedIn ? (
                  <button className="drawer-item drawer-item-danger" onClick={logOut}>
                    Log Out
                  </button>
                ) : (
                  <>
                    <button className="drawer-item" onClick={() => goTo("create")}>
                      Create Account
                    </button>
                    <button className="drawer-item" onClick={() => goTo("signin")}>
                      Sign In
                    </button>
                  </>
                )}
                <div className="drawer-version">v0.1.0</div>
              </>
            )}

            {drawerView === "account" && (
              <div className="drawer-content">
                <h3>Account</h3>
                {signedIn && account ? (
                  <>
                    <p style={{ fontSize: 16, fontWeight: 650, marginTop: 12 }}>
                      {account.name}
                    </p>
                    <p style={{ color: "var(--ink-soft)", fontSize: 15, marginTop: 4 }}>
                      {account.email}
                    </p>
                    <p style={{ color: "var(--ink-faint)", fontSize: 14, marginTop: 14 }}>
                      Your name appears as the landlord on rent ledger exports.
                      Your data is stored locally on this device.
                    </p>
                  </>
                ) : (
                  <p style={{ color: "var(--ink-soft)", fontSize: 15, marginTop: 8 }}>
                    You're not signed in. Create an account or sign in from the menu.
                  </p>
                )}
              </div>
            )}

            {drawerView === "create" && (
              <div className="drawer-content">
                <h3>Create Account</h3>
                <p style={{ color: "var(--ink-soft)", fontSize: 15, marginTop: 8, marginBottom: 16 }}>
                  Use your real name — it appears as the landlord name on rent
                  ledger exports.
                </p>
                <div className="field">
                  <label>Full Legal Name</label>
                  <input
                    autoFocus
                    placeholder="e.g. John Smith or JS Properties, LLC."
                    value={acctName}
                    onChange={(e) => setAcctName(e.target.value)}
                    autoComplete="name"
                  />
                  <p className="hint">Shown on ledgers & official records</p>
                </div>
                <div className="field">
                  <label>Email</label>
                  <input
                    inputMode="email"
                    placeholder="you@email.com"
                    value={acctEmail}
                    onChange={(e) => setAcctEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="field">
                  <label>Password</label>
                  <input
                    type="password"
                    placeholder="At least 4 characters"
                    value={acctPassword}
                    onChange={(e) => setAcctPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <button
                  className="btn btn-primary btn-block"
                  disabled={!createValid}
                  onClick={createAccount}
                >
                  Create Account
                </button>
              </div>
            )}

            {drawerView === "signin" && (
              <div className="drawer-content">
                <h3>Sign In</h3>
                <p style={{ color: "var(--ink-soft)", fontSize: 15, marginTop: 8, marginBottom: 16 }}>
                  Sign in to the account on this device.
                </p>
                <div className="field">
                  <label>Email</label>
                  <input
                    autoFocus
                    inputMode="email"
                    placeholder="you@email.com"
                    value={acctEmail}
                    onChange={(e) => setAcctEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="field">
                  <label>Password</label>
                  <input
                    type="password"
                    value={acctPassword}
                    onChange={(e) => setAcctPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                {authError && (
                  <p style={{ color: "var(--red)", fontSize: 14, marginBottom: 12 }}>
                    {authError}
                  </p>
                )}
                <button
                  className="btn btn-primary btn-block"
                  disabled={!acctEmail.trim() || !acctPassword}
                  onClick={signIn}
                >
                  Sign In
                </button>
              </div>
            )}

            {drawerView === "suggestions" && (
              <div className="drawer-content">
                <h3>Suggestion Box</h3>
                <p style={{ color: "var(--ink-soft)", fontSize: 15, marginTop: 8, marginBottom: 14 }}>
                  What would make LandlordHQ better for you?
                </p>
                {suggestionSent ? (
                  <p style={{ color: "var(--green)", fontSize: 15 }}>
                    Thanks! Your suggestion was saved.
                  </p>
                ) : (
                  <>
                    <textarea
                      className="drawer-textarea"
                      rows={5}
                      placeholder="I'd love it if…"
                      value={suggestionText}
                      onChange={(e) => setSuggestionText(e.target.value)}
                    />
                    <button
                      className="btn btn-primary btn-block"
                      style={{ marginTop: 12 }}
                      disabled={!suggestionText.trim()}
                      onClick={submitSuggestion}
                    >
                      Submit
                    </button>
                  </>
                )}
              </div>
            )}

            {drawerView === "about" && (
              <div className="drawer-content">
                <h3>LandlordHQ</h3>
                <p style={{ color: "var(--ink-soft)", fontSize: 15, marginTop: 8 }}>
                  Built for small landlords managing 1–20 units. Track rent, tenants, contractors, and documents — all offline-ready.
                </p>
                <p style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 12 }}>
                  Version 0.1.0 · Data stays on your device
                </p>
              </div>
            )}
          </div>
        </Overlay>
      )}
    </div>
  );
}
