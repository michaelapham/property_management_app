import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../data/store";
import { money } from "../utils/format";
import { ChevronRight, PlusIcon } from "../components/icons";

export default function Properties() {
  const { data } = useStore();
  const navigate = useNavigate();

  return (
    <>
      {data.properties.length === 0 ? (
        <div className="empty-state">
          <div className="big">🏠</div>
          <h3>No properties yet</h3>
          <p>Add your first rental — address, house details, rent and tenant info.</p>
          <button className="btn btn-primary" onClick={() => navigate("/properties/new")}>
            <PlusIcon size={18} /> Add property
          </button>
        </div>
      ) : (
        <>
          {data.properties.map((p) => {
            const tenants = data.tenants.filter((t) => t.propertyId === p.id);
            return (
              <Link key={p.id} to={`/properties/${p.id}`} className="list-row">
                {p.photoDataUrl ? (
                  <img
                    src={p.photoDataUrl}
                    alt=""
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 10,
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div className="avatar" style={{ borderRadius: 10 }}>🏠</div>
                )}
                <div className="row-body">
                  <div className="row-title">{p.street}</div>
                  <div className="row-sub">
                    {p.city}, {p.state} ·{" "}
                    {tenants.length > 0
                      ? `${tenants.map((t) => t.firstName).join(", ")} · ${money(
                          tenants.reduce((s, t) => s + t.rentAmount, 0)
                        )}/mo`
                      : "Vacant"}
                  </div>
                </div>
                <span className="chevron">
                  <ChevronRight />
                </span>
              </Link>
            );
          })}
          <button className="fab" aria-label="Add property" onClick={() => navigate("/properties/new")}>
            <PlusIcon size={26} />
          </button>
        </>
      )}
    </>
  );
}
