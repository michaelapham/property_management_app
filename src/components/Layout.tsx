import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BuildingIcon,
  GearIcon,
  HomeIcon,
  MenuIcon,
  PeopleIcon,
  ScanIcon,
  WrenchIcon,
} from "./icons";

const TABS = [
  { to: "/", label: "Today", icon: HomeIcon, end: true },
  { to: "/tenants", label: "Tenants", icon: PeopleIcon },
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
};

const SUGGESTIONS_KEY = "landlordhq-suggestions";

type DrawerView = "menu" | "account" | "suggestions" | "about";

export default function Layout() {
  const { pathname } = useLocation();
  const head = TITLES[pathname];

  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerView, setDrawerView] = useState<DrawerView>("menu");
  const [suggestionText, setSuggestionText] = useState("");
  const [suggestionSent, setSuggestionSent] = useState(false);

  function openDrawer() {
    setDrawerView("menu");
    setSuggestionSent(false);
    setShowDrawer(true);
  }

  function closeDrawer() {
    setShowDrawer(false);
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
        <NavLink
          to="/settings"
          className={({ isActive }) => `nav-settings-link${isActive ? " active" : ""}`}
          aria-label="Settings"
        >
          <GearIcon />
          Settings
        </NavLink>
      </nav>
      <div className="app-content">
        <header className="top-bar">
          <div className="top-bar-inner">
            <div>
              <h1>
                <img className="logo" src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
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
          <Outlet />
        </main>
      </div>

      {showDrawer && (
        <div className="drawer-overlay" onClick={closeDrawer}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              {drawerView !== "menu" && (
                <button className="drawer-back" onClick={() => setDrawerView("menu")}>
                  ← Back
                </button>
              )}
              <button className="drawer-close" onClick={closeDrawer}>✕</button>
            </div>

            {drawerView === "menu" && (
              <>
                <button className="drawer-item" onClick={() => setDrawerView("account")}>
                  Account
                </button>
                <button className="drawer-item" onClick={() => setDrawerView("suggestions")}>
                  Suggestion Box
                </button>
                <button className="drawer-item" onClick={() => setDrawerView("about")}>
                  About
                </button>
                <div className="drawer-version">v0.1.0</div>
              </>
            )}

            {drawerView === "account" && (
              <div className="drawer-content">
                <h3>Account</h3>
                <p style={{ color: "var(--ink-soft)", fontSize: 15, marginTop: 8 }}>
                  Account management is coming soon. Your data is stored locally on this device.
                </p>
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
        </div>
      )}
    </div>
  );
}
