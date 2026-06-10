import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BuildingIcon,
  GearIcon,
  HomeIcon,
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

export default function Layout() {
  const { pathname } = useLocation();
  const head = TITLES[pathname];

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
            <NavLink
              to="/settings"
              aria-label="Settings"
              className="top-bar-settings"
              style={({ isActive }) => ({ color: isActive ? "var(--brand)" : "var(--ink-soft)" })}
            >
              <GearIcon size={21} />
            </NavLink>
          </div>
        </header>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
