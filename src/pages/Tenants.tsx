import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../data/store";
import { currentMonthKey, rentStatusOf } from "../types";
import { fullAddress, money } from "../utils/format";
import Avatar from "../components/Avatar";
import { ChevronRight, PlusIcon } from "../components/icons";

export default function Tenants() {
  const { data } = useStore();
  const navigate = useNavigate();
  const month = currentMonthKey();

  if (data.tenants.length === 0) {
    return (
      <div className="empty-state">
        <div className="big">👋</div>
        <h3>No tenants yet</h3>
        <p>Add a property with a tenant and they'll show up here with live rent status.</p>
        <button className="btn btn-primary" onClick={() => navigate("/properties/new")}>
          <PlusIcon size={18} /> Add Property & Tenant
        </button>
      </div>
    );
  }

  return (
    <>
      {data.tenants.map((t) => {
        const property = data.properties.find((p) => p.id === t.propertyId);
        const record = data.rentRecords.find(
          (r) => r.tenantId === t.id && r.month === month
        );
        const status = record ? rentStatusOf(record) : "unpaid";
        return (
          <Link key={t.id} to={`/tenants/${t.id}`} className="list-row">
            <Avatar first={t.firstName} last={t.lastName} photo={t.photoDataUrl} />
            <div className="row-body">
              <div className="row-title">
                {t.firstName} {t.lastName}
              </div>
              <div className="row-sub">
                {property ? fullAddress(property) : "No property"} ·{" "}
                {money(t.rentAmount)}/mo
              </div>
            </div>
            <span className={`pill pill-${status}`}>
              {status === "paid" ? "Paid" : status === "partial" ? "Partial" : "Unpaid"}
            </span>
            <span className="chevron">
              <ChevronRight />
            </span>
          </Link>
        );
      })}
    </>
  );
}
