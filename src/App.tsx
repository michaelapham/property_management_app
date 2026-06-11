import { BrowserRouter, Route, Routes } from "react-router-dom";
import { StoreProvider } from "./data/store";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Tenants from "./pages/Tenants";
import TenantDetail from "./pages/TenantDetail";
import LedgerView from "./pages/LedgerView";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import AddProperty from "./pages/AddProperty";
import Contractors from "./pages/Contractors";
import CallPrep from "./pages/CallPrep";
import Scanner from "./pages/Scanner";
import Settings from "./pages/Settings";
import Tasks from "./pages/Tasks";

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tenants" element={<Tenants />} />
            <Route path="/tenants/:id" element={<TenantDetail />} />
            <Route path="/tenants/:id/ledger" element={<LedgerView />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/properties/new" element={<AddProperty />} />
            <Route path="/properties/:id" element={<PropertyDetail />} />
            <Route path="/contractors" element={<Contractors />} />
            <Route path="/contractors/prepare" element={<CallPrep />} />
            <Route path="/scanner" element={<Scanner />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/tasks" element={<Tasks />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}
