import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../data/store";
import {
  searchAddresses,
  type AddressSuggestion,
} from "../utils/addressSearch";
import { ChevronLeft } from "../components/icons";
import type {
  ConstructionType,
  FenceType,
  FoundationType,
} from "../types";
import { readImageAsDataUrl } from "../utils/image";

const STEPS = ["Address", "Property details", "Rent & tenant"];

export default function AddProperty() {
  const { addProperty, addTenant } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Step 1 — address
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [zip, setZip] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<number>();
  // True right after a suggestion is picked — suppresses the search effect
  // so the dropdown doesn't reopen; cleared on the next keystroke.
  const suggestionAppliedRef = useRef(false);
  const cityRef = useRef<HTMLInputElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  // Step 2 — property details
  const [photo, setPhoto] = useState<string | undefined>();
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [lotSqft, setLotSqft] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [foundation, setFoundation] = useState<FoundationType>("unknown");
  const [construction, setConstruction] = useState<ConstructionType>("unknown");
  const [fence, setFence] = useState<FenceType>("unknown");
  const [valueEstimate, setValueEstimate] = useState("");
  const [taxValue, setTaxValue] = useState("");

  // Step 3 — rent & tenant
  const [hasTenant, setHasTenant] = useState(true);
  const [rent, setRent] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [emName, setEmName] = useState("");
  const [emPhone, setEmPhone] = useState("");
  const [tenantPhoto, setTenantPhoto] = useState<string | undefined>();

  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    if (suggestionAppliedRef.current) {
      // Field values changed because a suggestion was applied, not because
      // the user is typing — don't search, keep the dropdown closed.
      return;
    }
    if (street.trim().length < 4) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setSearching(true);
      const q = [street, city].filter(Boolean).join(", ");
      const results = await searchAddresses(q);
      setSuggestions(results);
      setSearching(false);
    }, 450);
    return () => window.clearTimeout(debounceRef.current);
  }, [street, city]);

  function applySuggestion(s: AddressSuggestion) {
    suggestionAppliedRef.current = true;
    setStreet(s.street);
    setCity(s.city);
    setStateVal(s.state);
    setZip(s.zip);
    setSuggestions([]);
    setSearching(false);
    // Move focus forward: to City if the suggestion lacked one, otherwise
    // to Continue — never back to the street input.
    if (!s.city) cityRef.current?.focus();
    else continueRef.current?.focus();
  }

  function num(v: string): number | undefined {
    const n = parseFloat(v);
    return Number.isNaN(n) ? undefined : n;
  }

  function finish() {
    const property = addProperty({
      street: street.trim(),
      city: city.trim(),
      state: stateVal.trim(),
      zip: zip.trim(),
      photoDataUrl: photo,
      beds: num(beds),
      baths: num(baths),
      sqft: num(sqft),
      lotSqft: num(lotSqft),
      yearBuilt: num(yearBuilt),
      foundation,
      construction,
      fence,
      valueEstimate: num(valueEstimate),
      prevYearTaxValue: num(taxValue),
    });
    if (hasTenant && firstName.trim()) {
      addTenant({
        propertyId: property.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        rentAmount: num(rent) ?? 0,
        phone: tenantPhone.trim() || undefined,
        email: tenantEmail.trim() || undefined,
        emergencyContactName: emName.trim() || undefined,
        emergencyContactPhone: emPhone.trim() || undefined,
        photoDataUrl: tenantPhoto,
      });
    }
    navigate("/");
  }

  const addressValid = street.trim().length > 3 && city.trim().length > 1;
  const tenantValid =
    !hasTenant || (firstName.trim().length > 0 && num(rent) !== undefined);

  return (
    <>
      <Link className="back-link" to={step === 0 ? "/" : "#"} onClick={(e) => {
        if (step > 0) {
          e.preventDefault();
          setStep(step - 1);
        }
      }}>
        <ChevronLeft size={16} /> {step === 0 ? "Home" : STEPS[step - 1]}
      </Link>

      <h2 style={{ marginBottom: 4 }}>{STEPS[step]}</h2>
      <p style={{ color: "var(--ink-soft)", fontSize: 15, marginBottom: 16 }}>
        Step {step + 1} of {STEPS.length}
      </p>
      <div className="wizard-steps">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`step-dot ${i < step ? "done" : i === step ? "current" : ""}`}
          />
        ))}
      </div>

      {step === 0 && (
        <div className="card">
          <div className="field suggest-wrap">
            <label>Street address</label>
            <input
              autoFocus
              placeholder="Start typing… e.g. 412 Maple Ave"
              value={street}
              onChange={(e) => {
                suggestionAppliedRef.current = false;
                setStreet(e.target.value);
              }}
              autoComplete="street-address"
            />
            {suggestions.length > 0 && (
              <div className="suggest-list">
                {suggestions.map((s, i) => (
                  <button key={i} type="button" onClick={() => applySuggestion(s)}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
            {searching && <p className="hint">Searching addresses…</p>}
          </div>
          <div className="field">
            <label>City</label>
            <input
              ref={cityRef}
              placeholder="City"
              value={city}
              onChange={(e) => {
                suggestionAppliedRef.current = false;
                setCity(e.target.value);
              }}
              autoComplete="address-level2"
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label>State</label>
              <input
                placeholder="TX"
                value={stateVal}
                onChange={(e) => setStateVal(e.target.value)}
                autoComplete="address-level1"
              />
            </div>
            <div className="field">
              <label>ZIP</label>
              <input
                placeholder="75001"
                inputMode="numeric"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                autoComplete="postal-code"
              />
            </div>
          </div>
          <button
            ref={continueRef}
            className="btn btn-primary btn-block"
            disabled={!addressValid}
            onClick={() => setStep(1)}
          >
            Continue
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="card">
          <p className="banner">
            Tip: enter what you know — you can always fill in the rest later
            from the property page. Public-record auto-fill is coming soon.
          </p>
          <PhotoField label="Photo of house" value={photo} onChange={setPhoto} />
          <div className="field-row">
            <div className="field">
              <label>Beds</label>
              <input inputMode="numeric" placeholder="3" value={beds} onChange={(e) => setBeds(e.target.value)} />
            </div>
            <div className="field">
              <label>Baths</label>
              <input inputMode="decimal" placeholder="2" value={baths} onChange={(e) => setBaths(e.target.value)} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>House sq ft</label>
              <input inputMode="numeric" placeholder="1450" value={sqft} onChange={(e) => setSqft(e.target.value)} />
            </div>
            <div className="field">
              <label>Lot sq ft</label>
              <input inputMode="numeric" placeholder="7800" value={lotSqft} onChange={(e) => setLotSqft(e.target.value)} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Year built</label>
              <input inputMode="numeric" placeholder="1986" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} />
            </div>
            <div className="field">
              <label>Foundation</label>
              <select value={foundation} onChange={(e) => setFoundation(e.target.value as FoundationType)}>
                <option value="unknown">Not Sure</option>
                <option value="slab">Slab</option>
                <option value="crawlspace">Crawlspace</option>
                <option value="basement">Basement</option>
                <option value="pier-and-beam">Pier & Beam</option>
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Construction</label>
              <select value={construction} onChange={(e) => setConstruction(e.target.value as ConstructionType)}>
                <option value="unknown">Not Sure</option>
                <option value="brick">Brick</option>
                <option value="wood-frame">Wood Frame</option>
                <option value="vinyl-siding">Vinyl Siding</option>
                <option value="stucco">Stucco</option>
                <option value="stone">Stone</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div className="field">
              <label>Fence</label>
              <select value={fence} onChange={(e) => setFence(e.target.value as FenceType)}>
                <option value="unknown">Not Sure</option>
                <option value="none">No Fence</option>
                <option value="chainlink">Chainlink</option>
                <option value="wood">Wood</option>
                <option value="vinyl">Vinyl</option>
                <option value="wrought-iron">Wrought Iron</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Value estimate ($)</label>
              <input inputMode="numeric" placeholder="245000" value={valueEstimate} onChange={(e) => setValueEstimate(e.target.value)} />
            </div>
            <div className="field">
              <label>Last year tax value ($)</label>
              <input inputMode="numeric" placeholder="231000" value={taxValue} onChange={(e) => setTaxValue(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary btn-block" onClick={() => setStep(2)}>
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <div className="tag-chip-row">
            <button
              className={`tag-chip${hasTenant ? " on" : ""}`}
              onClick={() => setHasTenant(true)}
            >
              Occupied — Add Tenant
            </button>
            <button
              className={`tag-chip${!hasTenant ? " on" : ""}`}
              onClick={() => setHasTenant(false)}
            >
              Vacant for Now
            </button>
          </div>

          {hasTenant && (
            <>
              <div className="field-row">
                <div className="field">
                  <label>First name</label>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Maria" />
                </div>
                <div className="field">
                  <label>Last name</label>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Lopez" />
                </div>
              </div>
              <div className="field">
                <label>Rent per month ($)</label>
                <input inputMode="decimal" value={rent} onChange={(e) => setRent(e.target.value)} placeholder="1350" />
              </div>
              <div className="field">
                <label>Tenant phone</label>
                <input inputMode="tel" autoComplete="tel" value={tenantPhone} onChange={(e) => setTenantPhone(e.target.value)} placeholder="(555) 201-7733" />
              </div>
              <div className="field">
                <label>Email</label>
                <input inputMode="email" autoComplete="email" value={tenantEmail} onChange={(e) => setTenantEmail(e.target.value)} placeholder="maria@email.com" />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Emergency contact</label>
                  <input value={emName} onChange={(e) => setEmName(e.target.value)} placeholder="Name" />
                </div>
                <div className="field">
                  <label>Emergency phone</label>
                  <input inputMode="tel" value={emPhone} onChange={(e) => setEmPhone(e.target.value)} placeholder="(555) …" />
                </div>
              </div>
              <PhotoField label="Tenant photo (optional)" value={tenantPhoto} onChange={setTenantPhoto} />
            </>
          )}

          <button
            className="btn btn-green btn-block btn-lg"
            disabled={!tenantValid}
            onClick={finish}
          >
            Save Property{hasTenant && firstName ? " & Tenant" : ""}
          </button>
        </div>
      )}
    </>
  );
}

export function PhotoField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        type="file"
        accept="image/*"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) onChange(await readImageAsDataUrl(file, 900));
        }}
      />
      {value && <img className="photo-input-preview" src={value} alt="Preview" />}
    </div>
  );
}
