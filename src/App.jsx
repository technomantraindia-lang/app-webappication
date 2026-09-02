import { useEffect, useMemo, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { createWorker } from "tesseract.js";
import * as XLSX from "xlsx";
import {
  callerOutcomes,
  clients,
  formatMoney,
  getClient,
  getVehicle,
  initialAppData,
  initialNotifications,
  liability,
  permissionRows,
  reportGroups,
  users
} from "./kuberFinanceCore";

// ─── Login is verified against the backend database (/api/login) ─────────────
// No hardcoded demo credentials. Admin creates customer accounts in-app.
function getApiBase() {
  const envBase = import.meta.env.VITE_API_BASE_URL;
  if (envBase) return envBase.replace(/\/$/, "");
  return "https://erp.aakashfinance.com";
}

const API_BASE = getApiBase();

const LOGIN_KEY = "kuber-admin-session";

function loadSession() {
  try {
    const raw = sessionStorage.getItem(LOGIN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(user) {
  sessionStorage.setItem(LOGIN_KEY, JSON.stringify(user));
}

function clearSession() {
  sessionStorage.removeItem(LOGIN_KEY);
}

// ─── Login Page (role selection: Admin or Customer) ──────────────────────────
function LoginPage({ onLogin }) {
  const [role, setRole] = useState("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isAdmin = role === "admin";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: username.trim(), password })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Invalid email or password.");
      }
      const kind = String(data.role).toLowerCase() === "admin" ? "admin" : "customer";
      if ((kind === "admin") !== isAdmin) {
        throw new Error(data.role === "Admin"
          ? "This account is an admin account. Switch to the Admin tab."
          : "This account is a customer account. Switch to the Customer tab."
        );
      }
      onLogin({ ...data, kind });
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <aside className="login-hero">
        <div className="login-hero-glow" aria-hidden="true" />
        <div className="login-hero-brand">
          <span className="login-logo">K</span>
          <div>
            <strong>Kuber Finance</strong>
            <small>Fleet Finance CRM</small>
          </div>
        </div>

        <div className="login-hero-body">
          <h1 className="login-hero-title">
            Drive your fleet
            <br />
            finance <em>forward.</em>
          </h1>
          <p className="login-hero-sub">
            Track renewals, follow up on dues and resell vehicles — all from one
            clean dashboard.
          </p>

          <div className="login-hero-visual" aria-hidden="true">
            <div className="login-visual-card">
              <div className="login-visual-head">
                <span className="login-visual-dots"><i /><i /><i /></span>
                <span>Fleet Overview</span>
                <span className="login-visual-live"><i /> Live</span>
              </div>
              <div className="login-visual-stats">
                <div className="login-visual-stat">
                  <small>Active vehicles</small>
                  <strong>128</strong>
                  <span className="login-visual-bar" style={{ "--w": "82%" }} />
                </div>
                <div className="login-visual-stat">
                  <small>Renewals due</small>
                  <strong>14</strong>
                  <span className="login-visual-bar" style={{ "--w": "38%" }} />
                </div>
                <div className="login-visual-stat">
                  <small>Collected this month</small>
                  <strong>₹4.2L</strong>
                  <span className="login-visual-bar" style={{ "--w": "64%" }} />
                </div>
              </div>
            </div>
            <div className="login-visual-chip login-visual-chip-a">✓ Renewal paid</div>
            <div className="login-visual-chip login-visual-chip-b">🚚 3 new listings</div>
          </div>

          <ul className="login-hero-features">
            <li>
              <span className="login-hero-feature-icon" aria-hidden="true">⚡</span>
              <span>
                <strong>Smart renewal alerts</strong>
                <small>Never miss a policy or loan renewal.</small>
              </span>
            </li>
            <li>
              <span className="login-hero-feature-icon" aria-hidden="true">🚚</span>
              <span>
                <strong>Fleet &amp; dues at a glance</strong>
                <small>Every vehicle, every payment, one view.</small>
              </span>
            </li>
            <li>
              <span className="login-hero-feature-icon" aria-hidden="true">🏷️</span>
              <span>
                <strong>Resale marketplace</strong>
                <small>List and discover vehicles instantly.</small>
              </span>
            </li>
          </ul>
        </div>

        <div className="login-hero-footer">
          <span>© 2026 Kuber Finance · All rights reserved</span>
        </div>
      </aside>

      <main className="login-panel">
        <div className="login-card">
          <div className="login-card-accent" aria-hidden="true" />
          <div className="login-card-head">
            <span className="login-card-eyebrow">Welcome back</span>
            <h1 className="login-title">Sign in to continue</h1>
            <p className="login-subtitle">
              {isAdmin
                ? "Enter your admin credentials to access the console."
                : "Sign in with your customer account to view your fleet and dues."}
            </p>
          </div>

          <div className="login-role" role="radiogroup" aria-label="Login role">
            <button
              type="button"
              className={role === "admin" ? "active" : ""}
              onClick={() => { setRole("admin"); setError(""); }}
              aria-pressed={role === "admin"}
            >
              <span className="login-role-check" aria-hidden="true">✓</span>
              <span className="login-role-icon">A</span>
              <span className="login-role-text">
                <strong>Admin</strong>
                <small>Full control console</small>
              </span>
            </button>
            <button
              type="button"
              className={role === "customer" ? "active" : ""}
              onClick={() => { setRole("customer"); setError(""); }}
              aria-pressed={role === "customer"}
            >
              <span className="login-role-check" aria-hidden="true">✓</span>
              <span className="login-role-icon">C</span>
              <span className="login-role-text">
                <strong>Customer</strong>
                <small>Fleet, dues & marketplace</small>
              </span>
            </button>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <label>
              Email
              <input
                type="email"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isAdmin ? "admin@kuber.local" : "owner@company.com"}
                required
                aria-label="Email"
              />
            </label>
            <label>
              Password
              <div className="login-password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  aria-label="Password"
                />
                <button
                  type="button"
                  className="login-toggle-pw"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="login-hint">
            Accounts are created by the admin. Contact your administrator for credentials.
          </p>
        </div>
      </main>
    </div>
  );
}

const navItems = [
  ["dashboard", "Dashboard", "home"],
  ["clients", "Clients", "people"],
  ["dues", "Smart Alert", "calendar"],
  ["caller", "Caller", "phone"],
  ["marketplace", "Marketplace", "store"],
  ["reports", "Reports", "chart"],
  ["settings", "Settings", "settings"]
];

const rolePermissionIndex = { Admin: 1, Owner: 2, Caller: 3, Buyer: 4, Customer: 4 };
const sectionPermissionMap = {
  clients: "View all clients",
  "client-profile": "View all clients",
  fleet: "View own fleet",
  dues: "View own fleet",
  documents: "View own fleet",
  verification: "Verify payment",
  caller: "Call / WhatsApp",
  marketplace: "Create sale listing",
  reports: "Owner chat",
  chats: "Owner chat",
  import: "Import Excel"
};

const adminUser = users.find((user) => user.role === "Admin") ?? users[0];
const BANK_RELEASE_RATE_PERCENT = 9.41003284260348;
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();

function emptyAppData() {
  // Admin-created records only — no demo/sample data
  return {
    ...initialAppData,
    clients: [],
    vehicles: [],
    dueTasks: [],
    listings: [],
    callerActivities: [],
    auditLogs: [],
    notifications: [],
    importRows: [],
    clientImports: [],
    verificationItems: [],
    documents: [],
    marketplaceThreads: [],
    users: [],
    rolePermissions: permissionRows
  };
}

function loadData() {
  return emptyAppData();
}

async function fetchBackendData() {
  const fetchJson = async (path, required = true) => {
    try {
      const response = await fetch(`${API_BASE}/api${path}`);
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        if (required) throw new Error(formatBackendError(result, response.status));
        return [];
      }
      return response.json();
    } catch (error) {
      if (required) throw error;
      return [];
    }
  };

  const [rawClients, rawVehicles, rawDues, rawListings, rawCaller, rawAudit, rawImports, rawClientImports, rawDocuments, rawMarketplaceThreads, rawUsers, rawSettings] = await Promise.all([
    fetchJson("/clients"),
    fetchJson("/vehicles"),
    fetchJson("/dues"),
    fetchJson("/listings"),
    fetchJson("/caller-activities", false),
    fetchJson("/audit-logs", false),
    fetchJson("/imports", false),
    fetchJson("/client-imports", false),
    fetchJson("/documents", false),
    fetchJson("/marketplace-threads", false),
    fetchJson("/users", false),
    fetchJson("/settings", false)
  ]);

  return {
    ...emptyAppData(),
    clients: Array.isArray(rawClients) ? rawClients.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email ?? "",
      city: row.city ?? "",
      phone: row.phone ?? "",
      callerId: row.caller_id ?? row.callerId ?? ""
    })) : [],
    vehicles: Array.isArray(rawVehicles) ? rawVehicles.map((row) => ({
      id: row.id,
      clientId: row.client_id ?? row.clientId ?? "",
      type: row.type ?? "Truck",
      regNo: row.reg_no ?? row.regNo ?? "",
      make: row.make ?? "",
      model: row.model ?? "",
      year: Number(row.year ?? 0),
      km: Number(row.km ?? 0),
      principal: Number(row.principal ?? 0),
      overdue: Number(row.overdue ?? 0),
      penalty: Number(row.penalty ?? 0),
      foreclosure: Number(row.foreclosure ?? 0),
      insuranceExpiry: row.insurance_expiry ?? row.insuranceExpiry ?? "",
      permitExpiry: row.permit_expiry ?? row.permitExpiry ?? "",
      status: row.status ?? "Active"
    })) : [],
    dueTasks: Array.isArray(rawDues) ? rawDues.map((row) => ({
      id: row.id,
      clientId: row.client_id ?? row.clientId ?? "",
      vehicleId: row.vehicle_id ?? row.vehicleId ?? "",
      type: row.type ?? "EMI",
      amount: Number(row.amount ?? 0),
      dueDate: row.due_date ?? row.dueDate ?? "",
      status: row.status ?? "Due",
      callerId: row.caller_id ?? row.callerId ?? "",
      priority: row.priority ?? "Medium"
    })) : [],
    listings: Array.isArray(rawListings) ? rawListings.map((row) => ({
      id: row.id,
      vehicleId: row.vehicle_id ?? row.vehicleId ?? "",
      title: row.title ?? "",
      price: Number(row.price ?? 0),
      location: row.location ?? "",
      status: row.status ?? "Active",
      condition: row.condition_note ?? row.condition ?? "Good",
      photos: Array.isArray(row.photos) ? row.photos : []
    })) : [],
    callerActivities: Array.isArray(rawCaller) ? rawCaller.map((row) => ({
      id: row.id,
      taskId: row.task_id ?? row.taskId ?? "",
      callerId: row.caller_id ?? row.callerId ?? "",
      outcome: row.outcome ?? "",
      notes: row.notes ?? "",
      expectedAmount: row.expected_amount ?? row.expectedAmount ?? "",
      nextFollowUp: row.next_follow_up ?? row.nextFollowUp ?? "",
      channel: row.channel ?? "Call",
      at: row.occurred_at ?? row.at ?? ""
    })) : [],
    auditLogs: Array.isArray(rawAudit) ? rawAudit.map((row) => ({
      id: row.id,
      module: row.module ?? "",
      action: row.action ?? "",
      record: row.record ?? "",
      oldValue: row.old_value ?? row.oldValue ?? "",
      newValue: row.new_value ?? row.newValue ?? "",
      remark: row.remark ?? "",
      at: row.event_at ?? row.at ?? ""
    })) : [],
    importRows: Array.isArray(rawImports) ? rawImports.map((row) => ({
      row: row.row_no ?? row.row ?? "",
      regNo: row.reg_no ?? row.regNo ?? "",
      assetType: row.asset_type ?? row.assetType ?? "",
      clientName: row.client_name ?? row.clientName ?? "",
      loanAccount: row.loan_account ?? row.loanAccount ?? "",
      lender: row.lender ?? "",
      status: row.status ?? "",
      issue: row.issue ?? ""
    })) : [],
    clientImports: Array.isArray(rawClientImports) ? rawClientImports.map((row) => ({
      id: row.id,
      clientId: row.clientId ?? row.client_id ?? "",
      fileName: row.fileName ?? row.file_name ?? "Customer import",
      importedAt: row.importedAt ?? row.imported_at ?? "",
      rows: Array.isArray(row.rows) ? row.rows : []
    })) : [],
    documents: Array.isArray(rawDocuments) ? rawDocuments.map((row) => ({
      id: row.id,
      clientId: row.clientId ?? row.client_id ?? "",
      vehicleId: row.vehicleId ?? row.vehicle_id ?? "",
      taskId: row.taskId ?? row.task_id ?? "",
      type: row.type ?? "Other",
      fileName: row.fileName ?? row.file_name ?? "document",
      mimeType: row.mimeType ?? row.mime_type ?? "application/octet-stream",
      size: Number(row.size ?? row.size_bytes ?? 0),
      dataUrl: row.dataUrl ?? row.data_url ?? "",
      uploadedBy: row.uploadedBy ?? row.uploaded_by ?? "",
      uploadedAt: row.uploadedAt ?? row.uploaded_at ?? "",
      note: row.note ?? ""
    })) : [],
    marketplaceThreads: Array.isArray(rawMarketplaceThreads) ? rawMarketplaceThreads.map((row) => ({
      id: row.id,
      listingId: row.listingId ?? row.listing_id ?? "",
      buyerClientId: row.buyerClientId ?? row.buyer_client_id ?? "",
      sellerClientId: row.sellerClientId ?? row.seller_client_id ?? "",
      status: row.status ?? "Interested",
      messages: Array.isArray(row.messages) ? row.messages : [],
      reported: Boolean(row.reported),
      blocked: Boolean(row.blocked),
      updatedAt: row.updatedAt ?? row.updated_at ?? ""
    })) : [],
    users: Array.isArray(rawUsers) ? rawUsers.map((row) => ({
      id: row.id,
      name: row.name,
      role: row.role,
      email: row.email ?? ""
    })) : [],
    rolePermissions: Array.isArray(rawSettings?.rolePermissions) ? rawSettings.rolePermissions : permissionRows
  };
}

function formatBackendError(result, status) {
  if (result?.error === "Database connection is not available.") {
    const host = result.config?.host || "not set";
    return `Database is not connected. Local backend is using DB_HOST=${host}. Check backend/.env and MySQL network access.`;
  }
  return result?.message || result?.error || `Backend request failed with status ${status}.`;
}

async function syncDataToBackend(data) {
  const response = await fetch(`${API_BASE}/api/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clients: data.clients ?? [],
      vehicles: data.vehicles ?? [],
      dueTasks: data.dueTasks ?? [],
      listings: data.listings ?? [],
      callerActivities: data.callerActivities ?? [],
      auditLogs: data.auditLogs ?? [],
      importRows: data.importRows ?? [],
      clientImports: data.clientImports ?? [],
      documents: data.documents ?? [],
      marketplaceThreads: data.marketplaceThreads ?? []
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(formatBackendError(result, response.status) || "Backend sync failed.");
  }
  return result;
}

export default function App() {
  const [session, setSession] = useState(loadSession);

  if (!session) {
    return <LoginPage onLogin={setSession} />;
  }

  if (session.kind === "customer") {
    return (
      <CustomerPortal session={session} onLogout={() => { clearSession(); setSession(null); }} />
    );
  }

  return <AdminApp session={session} onLogout={() => { clearSession(); setSession(null); }} />;
}

function AdminApp({ session, onLogout }) {
  const [data, setData] = useState(loadData);
  const [section, setSection] = useState("dashboard");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [saveStatus, setSaveStatus] = useState("Ready");
  const [toast, setToast] = useState("");
  const [activeReport, setActiveReport] = useState(reportGroups[0][0]);
  const [selectedClientId, setSelectedClientId] = useState(null);

  const totals = useMemo(() => {
    const totalLiability = data.vehicles.reduce((sum, vehicle) => sum + liability(vehicle), 0);
    const openDues = data.dueTasks.filter((task) => task.status !== "Closed");
    const overdue = data.dueTasks.filter((task) => ["Overdue", "Escalated"].includes(task.status));
    const proofPending = data.dueTasks.filter((task) => task.status === "Proof Pending");
    const pendingListings = data.listings.filter((listing) => listing.status === "Submitted");
    return { totalLiability, openDues, overdue, proofPending, pendingListings };
  }, [data]);

  useEffect(() => {
    setSaveStatus("Loading");
    fetchBackendData()
      .then((backendData) => {
        setData(backendData);
        setSaveStatus("Database");
        setToast("Database data loaded");
      })
      .catch((err) => {
        setSaveStatus("Error");
        setToast(err.message || "Database load failed");
      });
  }, []);

  const persist = (nextData, message = "Saved") => {
    setData(nextData);
    setLastSavedAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
    setSaveStatus("Saving");
    setToast(message);
    syncDataToBackend(nextData)
      .then((result) => {
        if (result?.ok) {
          setSaveStatus("Database");
          setToast("Saved to database");
        }
      })
      .catch((err) => {
      setSaveStatus("Error");
        setToast(err.message || "Database sync failed");
      });
  };

  const withAudit = (current, entry) => ({
    ...current,
    auditLogs: [
      {
        ...entry,
        id: `a-${Date.now()}`,
        at: new Date().toLocaleString("en-IN")
      },
      ...current.auditLogs
    ]
  });

  const notify = (current, title, detail, target) => ({
    ...current,
    notifications: [{ id: `n-${Date.now()}`, title, detail, target, unread: true }, ...current.notifications]
  });

  const addClient = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = form.get("name")?.toString().trim() ?? "";
    const city = form.get("city")?.toString().trim() ?? "";
    const phone = form.get("phone")?.toString().trim() ?? "";
    const email = form.get("email")?.toString().trim() ?? "";

    if (!name || !city || !phone || !email) {
      setToast("Name, city, phone, and email are required");
      return;
    }

    setSaveStatus("Saving");
    setToast("Creating customer account...");
    try {
      const response = await fetch(`${API_BASE}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to create customer account.");
      }

      const nextClient = {
        id: result.clientId,
        name,
        email,
        city,
        phone,
        callerId: ""
      };
      const next = notify({ ...data, clients: [nextClient, ...data.clients] }, "Client added", nextClient.name, "clients");
      persist(withAudit(next, {
        module: "Clients",
        action: "Created",
        record: nextClient.name,
        oldValue: "-",
        newValue: "Active",
        remark: `Customer account created in database (${email})`
      }), `${nextClient.name} added`);
      formElement.reset();
    } catch (err) {
      setSaveStatus("Error");
      setToast(err.message || "Failed to create customer account.");
    }
  };

  const updateTaskStatus = (taskId, status, remark = "Admin web action saved") => {
    const task = data.dueTasks.find((item) => item.id === taskId);
    const updated = {
      ...data,
      dueTasks: data.dueTasks.map((item) => (item.id === taskId ? { ...item, status } : item)),
      verificationItems: ["Closed", "Due"].includes(status)
        ? data.verificationItems.filter((item) => item.taskId !== taskId)
        : data.verificationItems
    };
    const next = notify(updated, `Verification ${status}`, remark, "verification");
    persist(withAudit(next, {
      module: "Verification",
      action: status === "Closed" ? "Approved" : status === "Due" ? "Rejected" : "More Info",
      record: task?.id ?? taskId,
      oldValue: task?.status ?? "-",
      newValue: status,
      remark
    }), `Task ${status}`);
  };

  const saveCallerOutcome = (event, task) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const outcome = form.get("outcome")?.toString() || "No Answer / Busy";
    const notes = form.get("notes")?.toString().trim() || "Follow-up recorded.";
    const expectedAmount = form.get("expectedAmount")?.toString().trim() || "";
    const nextFollowUp = form.get("nextFollowUp")?.toString().trim() || "Next scheduled follow-up";
    const channel = form.get("channel")?.toString() || "Call";
    const nextStatus =
      outcome === "Connected - Will Pay" ? "Promise-to-Pay" :
      outcome === "Already Paid" || outcome === "Insurance Interested" ? "Waiting Documents" :
      outcome === "Wrong Number" || outcome === "Dispute" ? "Escalated" :
      task.status === "Proof Pending" ? "Verification Pending" :
      task.status;
    const activity = {
      id: `ca-${Date.now()}`,
      taskId: task.id,
      callerId: task.callerId,
      outcome,
      notes,
      expectedAmount,
      nextFollowUp: nextStatus === "Verification Pending" ? "Paused" : nextFollowUp,
      channel,
      at: new Date().toLocaleString("en-IN")
    };
    const updated = {
      ...data,
      dueTasks: data.dueTasks.map((item) => (item.id === task.id ? { ...item, status: nextStatus } : item)),
      callerActivities: [activity, ...data.callerActivities]
    };
    const next = notify(updated, `Caller outcome: ${outcome}`, notes, "caller");
    persist(withAudit(next, {
      module: "Caller",
      action: outcome,
      record: task.id,
      oldValue: task.status,
      newValue: nextStatus,
      remark: notes
    }), `Caller outcome saved`);
    event.currentTarget.reset();
  };

  const updateListingStatus = (listingId, status) => {
    const listing = data.listings.find((item) => item.id === listingId);
    const updated = {
      ...data,
      listings: data.listings.map((item) => (item.id === listingId ? { ...item, status } : item))
    };
    const next = notify(updated, `Listing ${status}`, listing?.title ?? listingId, "marketplace");
    persist(withAudit(next, {
      module: "Marketplace",
      action: "Status Updated",
      record: listing?.title ?? listingId,
      oldValue: listing?.status ?? "-",
      newValue: status,
      remark: "Admin marketplace decision saved"
    }), `Listing ${status}`);
  };

  const updateVehicleFinance = (event, vehicleId) => {
    event.preventDefault();
    const vehicle = data.vehicles.find((item) => item.id === vehicleId);
    if (!vehicle) return;
    const form = new FormData(event.currentTarget);
    const numberFrom = (name, fallback) => Number(form.get(name)?.toString().replace(/\D/g, "")) || fallback;
    const nextVehicle = {
      ...vehicle,
      principal: numberFrom("principal", vehicle.principal),
      overdue: numberFrom("overdue", vehicle.overdue),
      penalty: numberFrom("penalty", vehicle.penalty),
      foreclosure: numberFrom("foreclosure", vehicle.foreclosure),
      status: form.get("status")?.toString() || vehicle.status
    };
    const updated = {
      ...data,
      vehicles: data.vehicles.map((item) => (item.id === vehicleId ? nextVehicle : item))
    };
    const next = notify(updated, "Vehicle finance updated", vehicle.regNo, "fleet");
    persist(withAudit(next, {
      module: "Fleet",
      action: "Finance Updated",
      record: vehicle.regNo,
      oldValue: formatMoney(liability(vehicle)),
      newValue: formatMoney(liability(nextVehicle)),
      remark: "Admin edited closing principal fields from web"
    }), `${vehicle.regNo} updated`);
  };

  const createListing = async (event, vehicleId) => {
    event.preventDefault();
    const vehicle = data.vehicles.find((item) => item.id === vehicleId);
    if (!vehicle) return;
    const form = new FormData(event.currentTarget);
    const photos = await readListingPhotos(form.getAll("photos"));
    const price = Number(form.get("price")?.toString().replace(/\D/g, "")) || liability(vehicle);
    const listing = {
      id: `m-${Date.now()}`,
      vehicleId,
      title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      price,
      location: form.get("location")?.toString().trim() || getDataClient(data, vehicle.clientId)?.city || "Owner location",
      status: "Active",
      condition: form.get("condition")?.toString() || "Good",
      photos
    };
    const updated = {
      ...data,
      listings: [listing, ...data.listings],
      vehicles: data.vehicles.map((item) => (item.id === vehicleId ? { ...item, status: "Listed" } : item))
    };
    const next = notify(updated, "Listing created", listing.title, "marketplace");
    persist(withAudit(next, {
      module: "Marketplace",
      action: "Admin Listing Created",
      record: vehicle.regNo,
      oldValue: vehicle.status,
      newValue: "Listed",
      remark: "Admin created resale listing from fleet"
    }), `Listing created for ${vehicle.regNo}`);
    event.currentTarget.reset();
  };

  const importValidRows = () => {
    const validRows = data.importRows.filter((row) => row.status === "Valid" && row.issue !== "Imported and saved");
    if (validRows.length === 0) return;
    const newClient = {
      id: `c-import-${Date.now()}`,
      name: "Patel Freight",
      city: "Ahmedabad",
      phone: "+919900001122",
      callerId: ""
    };
    const newVehicles = validRows.map((row, index) => ({
      id: `v-import-${Date.now()}-${index}`,
      clientId: newClient.id,
      type: row.assetType,
      regNo: row.regNo,
      make: row.assetType === "Truck" ? "Tata" : "DICV",
      model: row.assetType === "Truck" ? "Prima" : "Flatbed",
      year: 2021,
      km: 65000 + index * 12000,
      principal: row.assetType === "Truck" ? 384884 : 981012,
      overdue: 0,
      penalty: 0,
      foreclosure: 15000,
      insuranceExpiry: "2026-09-15",
      permitExpiry: "2026-10-20",
      status: "Active"
    }));
    const updated = {
      ...data,
      clients: data.clients.some((client) => client.name === newClient.name) ? data.clients : [newClient, ...data.clients],
      vehicles: [...newVehicles, ...data.vehicles],
      importRows: data.importRows.map((row) => (row.status === "Valid" ? { ...row, issue: "Imported and saved" } : row))
    };
    const next = notify(updated, "Excel import completed", `${newVehicles.length} assets created.`, "fleet");
    persist(withAudit(next, {
      module: "Excel Import",
      action: "Final Import",
      record: "IMP-2026-08-03-001",
      oldValue: "Staged",
      newValue: `${newVehicles.length} assets created`,
      remark: "Valid rows imported into database data"
    }), `${newVehicles.length} assets imported`);
  };

  const importClientExcel = async (event, clientId) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseClientExcelFile(file);
      if (rows.length === 0) {
        setSaveStatus("Error");
        setToast("No valid rows were found in the Excel file.");
        return;
      }
      const client = getDataClient(data, clientId);
      const imported = {
        id: `ci-${Date.now()}`,
        clientId,
        fileName: file.name,
        importedAt: new Date().toLocaleString("en-IN"),
        rows
      };
      const existingRegs = new Set(data.vehicles.filter((vehicle) => vehicle.clientId === clientId).map((vehicle) => normalizeRegNo(baseRegNo(vehicle.regNo))));
      const importableRows = rows.filter((row) => row.regNo && !isBodyRow(row) && !existingRegs.has(normalizeRegNo(baseRegNo(row.regNo))));
      const importStamp = Date.now();
      const newVehicles = importableRows.map((row, index) => excelRowToVehicle(row, clientId, `v-excel-${importStamp}-${index}`));
      const newDueTasks = importableRows
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => toNumber(row.emiAmount) > 0)
        .map(({ row, index }) => excelRowToDueTask(row, clientId, `v-excel-${importStamp}-${index}`, `d-excel-${importStamp}-${index}`));
      const updated = {
        ...data,
        vehicles: [...newVehicles, ...data.vehicles],
        dueTasks: [...newDueTasks, ...data.dueTasks],
        clientImports: [imported, ...(data.clientImports ?? [])]
      };
      const next = notify(updated, "Client Excel imported", `${rows.length} records, ${newVehicles.length} vehicles saved for ${client?.name ?? "client"}.`, "clients");
      persist(withAudit(next, {
        module: "Client Excel",
        action: "Imported",
        record: client?.name ?? clientId,
        oldValue: "-",
        newValue: `${rows.length} records, ${newVehicles.length} vehicles`,
        remark: file.name
      }), "");
    } catch (error) {
      setSaveStatus("Error");
      setToast(error.message || "Excel import failed");
    } finally {
      event.target.value = "";
    }
  };

  const importClientPdf = async (event, clientId) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setSaveStatus("Reading");
      setToast("PDF OCR reading...");
      const pdfText = await extractPdfTextWithOcr(file);
      const client = getDataClient(data, clientId);
      const importedAssets = (data.clientImports ?? [])
        .filter((item) => item.clientId === clientId)
        .flatMap((item) => item.rows ?? []);
      const pdfRow = parseBankPdfText(pdfText);
      const profileAgreement = findProfileAgreementInText(pdfText, importedAssets);
      if (profileAgreement) pdfRow.loanAccount = profileAgreement;
      if (!isValidAgreementValue(pdfRow.loanAccount)) {
        setSaveStatus("Error");
        setToast("The agreement number could not be read from the PDF.");
        return;
      }

      const matchedRow = importedAssets.find((row) => (
        agreementMatches(row.loanAccount, pdfRow.loanAccount) ||
        (pdfRow.regNo && normalizeRegNo(baseRegNo(row.regNo)) === normalizeRegNo(baseRegNo(pdfRow.regNo)))
      ));
      if (!matchedRow) {
        setSaveStatus("Error");
        setToast("The PDF agreement number does not match this customer profile.");
        return;
      }
      const pdfMergeRow = sanitizePdfRowForMerge(pdfRow);
      const mergedRow = {
        ...matchedRow,
        ...pdfMergeRow,
        regNo: pdfRow.regNo || matchedRow?.regNo || "",
        pdfImportedAt: new Date().toLocaleString("en-IN")
      };

      let rowUpdated = false;
      const updatedClientImports = (data.clientImports ?? []).map((item) => {
        if (item.clientId !== clientId) return item;
        return {
          ...item,
          rows: (item.rows ?? []).map((row) => {
            const isMatch = agreementMatches(row.loanAccount, pdfRow.loanAccount) ||
              (pdfRow.regNo && normalizeRegNo(baseRegNo(row.regNo)) === normalizeRegNo(baseRegNo(pdfRow.regNo)));
            if (!isMatch) return row;
            rowUpdated = true;
            return {
              ...row,
              ...pdfMergeRow,
              regNo: row.regNo || pdfRow.regNo,
              pdfImportedAt: mergedRow.pdfImportedAt
            };
          })
        };
      });
      const updated = {
        ...data,
        clientImports: updatedClientImports
      };
      const next = notify(updated, "Bank PDF imported", `${mergedRow.loanAccount} data saved for ${client?.name ?? "client"}.`, "clients");
      persist(withAudit(next, {
        module: "Bank PDF",
        action: "Imported",
        record: mergedRow.loanAccount,
        oldValue: "-",
        newValue: mergedRow.regNo || "Agreement matched",
        remark: file.name
      }), rowUpdated ? `${mergedRow.loanAccount} row updated` : `${mergedRow.loanAccount} PDF data updated`);
    } catch (error) {
      setSaveStatus("Error");
      setToast(error.message || "PDF import failed");
    } finally {
      event.target.value = "";
    }
  };

  const addManualClientVehicle = (event, clientId) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const row = mapManualVehicleForm(form);
    if (!row.regNo) {
      setSaveStatus("Error");
      setToast("Regt. No. required hai");
      return;
    }
    const calculatedClosingPrincipal = autoClosingPrincipal(row);
    const manualRow = {
      ...row,
      closingPrincipal: calculatedClosingPrincipal > 0 ? String(Math.round(calculatedClosingPrincipal)) : ""
    };
    const client = getDataClient(data, clientId);
    const importStamp = Date.now();
    const vehicle = excelRowToVehicle(manualRow, clientId, `v-manual-${importStamp}`);
    const dueTask = toNumber(manualRow.emiAmount) > 0
      ? excelRowToDueTask(manualRow, clientId, vehicle.id, `d-manual-${importStamp}`)
      : null;
    const imported = {
      id: `ci-manual-${importStamp}`,
      clientId,
      fileName: "Manual Entry",
      importedAt: new Date().toLocaleString("en-IN"),
      rows: [manualRow]
    };
    const updated = {
      ...data,
      vehicles: [vehicle, ...data.vehicles],
      dueTasks: dueTask ? [dueTask, ...data.dueTasks] : data.dueTasks,
      clientImports: [imported, ...(data.clientImports ?? [])]
    };
    const next = notify(updated, "Manual vehicle added", `${manualRow.regNo} saved for ${client?.name ?? "client"}.`, "clients");
    persist(withAudit(next, {
      module: "Client Manual Entry",
      action: "Created",
      record: manualRow.regNo,
      oldValue: "-",
      newValue: client?.name ?? clientId,
      remark: "Manual vehicle finance details added"
    }), "");
    event.currentTarget.reset();
  };

  const deleteClientVehicle = (row, clientId) => {
    const label = row.regNo || row.loanAccount || "this vehicle";
    if (!window.confirm(`Delete ${label}?`)) return;

    const targetReg = normalizeRegNo(baseRegNo(row.regNo));
    const targetLoan = normalizeAgreement(row.loanAccount);
    const deletedVehicleIds = new Set(
      data.vehicles
        .filter((vehicle) => vehicle.clientId === clientId && targetReg && normalizeRegNo(baseRegNo(vehicle.regNo)) === targetReg)
        .map((vehicle) => vehicle.id)
    );
    const updatedVehicles = data.vehicles.filter((vehicle) => {
      const sameClient = vehicle.clientId === clientId;
      const sameReg = targetReg && normalizeRegNo(baseRegNo(vehicle.regNo)) === targetReg;
      return !(sameClient && sameReg);
    });
    const updatedImports = (data.clientImports ?? [])
      .map((item) => {
        if (item.clientId !== clientId) return item;
        return {
          ...item,
          rows: (item.rows ?? []).filter((importRow) => {
            const sameReg = targetReg && normalizeRegNo(baseRegNo(importRow.regNo)) === targetReg;
            const sameLoan = targetLoan && normalizeAgreement(importRow.loanAccount) === targetLoan;
            return !(sameReg || sameLoan);
          })
        };
      })
      .filter((item) => item.clientId !== clientId || (item.rows ?? []).length > 0);
    const updatedDues = data.dueTasks.filter((task) => !deletedVehicleIds.has(task.vehicleId));
    const updated = {
      ...data,
      vehicles: updatedVehicles,
      dueTasks: updatedDues,
      clientImports: updatedImports
    };
    const next = notify(updated, "Vehicle deleted", `${label} removed from profile.`, "clients");
    persist(withAudit(next, {
      module: "Client Vehicles",
      action: "Deleted",
      record: label,
      oldValue: "Active",
      newValue: "Removed",
      remark: "Vehicle row deleted from client profile"
    }), `${label} deleted`);
  };

  const clearNotifications = () => {
    persist({
      ...data,
      notifications: data.notifications.map((item) => ({ ...item, unread: false }))
    }, "Notifications marked read");
  };

  const resetDemoData = () => {
    persist(emptyAppData(), "Workspace data cleared");
  };

  const deleteClientAndAccount = async (client) => {
    if (!window.confirm(`Delete ${client.name} and their account?`)) return;
    const userId = client.id.startsWith("u-") ? client.id : client.id.startsWith("c-u-") ? `u-${client.id.slice(2)}` : null;
    setSaveStatus("Deleting");
    setToast(`Deleting ${client.name}...`);
    try {
      if (userId) {
        const response = await fetch(`${API_BASE}/api/users/${userId}`, { method: "DELETE" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Delete failed");
      }
      const clientVehicles = data.vehicles.filter((v) => v.clientId === client.id);
      const updated = {
        ...data,
        clients: data.clients.filter((item) => item.id !== client.id),
        vehicles: data.vehicles.filter((v) => v.clientId !== client.id),
        dueTasks: data.dueTasks.filter((t) => t.clientId !== client.id),
        listings: data.listings.filter((l) => !clientVehicles.some((v) => v.id === l.vehicleId))
      };
      persist(withAudit(updated, {
        module: "Clients",
        action: "Deleted",
        record: client.name,
        oldValue: "Active",
        newValue: "Removed",
        remark: userId ? "Customer account deleted from database" : "Client removed from workspace"
      }), `${client.name} deleted`);
    } catch (err) {
      setSaveStatus("Error");
      setToast(err.message || "Delete failed");
    }
  };

  const saveCommonPassword = async (event) => {
    event.preventDefault();
    const password = new FormData(event.currentTarget).get("commonPassword")?.toString().trim() ?? "";
    if (!password) {
      setToast("Password required");
      return;
    }
    setSaveStatus("Saving");
    try {
      const response = await fetch(`${API_BASE}/api/common-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to update common password");
      setSaveStatus("Saved");
      setToast("Common customer password updated");
    } catch (err) {
      setSaveStatus("Error");
      setToast(err.message || "Failed to update common password");
    }
  };

  const saveRolePermissions = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const roles = ["Admin", "Owner", "Caller", "Buyer"];
    const currentRows = Array.isArray(data.rolePermissions) ? data.rolePermissions : permissionRows;
    const rolePermissions = currentRows.map((row) => [
      row[0],
      ...roles.map((role) => form.get(`permission-${role}-${row[0]}`)?.toString() || row[roles.indexOf(role) + 1] || "No")
    ]);

    setSaveStatus("Saving");
    try {
      const response = await fetch(`${API_BASE}/api/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rolePermissions })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save permissions");
      setData((current) => ({ ...current, rolePermissions: result.rolePermissions ?? rolePermissions }));
      setSaveStatus("Database");
      setToast("Permissions updated");
    } catch (err) {
      setSaveStatus("Error");
      setToast(err.message || "Failed to save permissions");
    }
  };

  const createCallerAccount = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = form.get("newCallerName")?.toString().trim() ?? "";
    const email = form.get("newCallerEmail")?.toString().trim() ?? "";
    const password = form.get("newCallerPassword")?.toString().trim() ?? "";
    if (!name || !email || !password) {
      setToast("Caller name, email and password are required");
      return;
    }
    setSaveStatus("Saving");
    try {
      const response = await fetch(`${API_BASE}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role: "Caller" })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to create caller");
      const backendData = await fetchBackendData();
      setData(backendData);
      setSaveStatus("Saved");
      setToast(`Caller created: ${result.email}`);
      event.currentTarget.reset();
    } catch (err) {
      setSaveStatus("Error");
      setToast(err.message || "Failed to create caller");
    }
  };

  const runCallerAssignment = async (event) => {
    event.preventDefault();
    const mode = new FormData(event.currentTarget).get("assignmentMode")?.toString() || "permanent-client";
    setSaveStatus("Saving");
    try {
      const response = await fetch(`${API_BASE}/api/caller-assignment/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Caller assignment failed");
      const backendData = await fetchBackendData();
      setData(backendData);
      setSaveStatus("Database");
      setToast(`Assigned ${result.assigned} due task(s), skipped ${result.skipped}`);
    } catch (err) {
      setSaveStatus("Error");
      setToast(err.message || "Caller assignment failed");
    }
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kuber-finance-admin-data.json";
    link.click();
    URL.revokeObjectURL(url);
    setToast("Data export downloaded");
  };

  const openSection = (key) => {
    if (key !== "client-profile") {
      setSelectedClientId(null);
    }
    setSection(key);
  };

  const openClientProfile = (clientId) => {
    setSelectedClientId(clientId);
    setSection("client-profile");
  };

  return (
    <main className="app-shell customer-shell">
      <aside className="sidebar customer-sidebar">
        <div className="brand">
          <span className="brand-mark">K</span>
          <div>
            <strong>Kuber Finance</strong>
            <small>Admin web console</small>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label="Admin modules">
          {navItems.map(([key, label, icon]) => (
            <button className={(section === key || (section === "client-profile" && key === "clients")) ? "active" : ""} key={key} onClick={() => openSection(key)}>
              <Icon name={icon} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-footer-info">
            <strong>{session.name}</strong>
            <span>{session.role}</span>
          </div>
          <button className="logout-button" type="button" onClick={onLogout} title="Sign out">
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>Admin access</p>
            <h1>{titleFor(section)}</h1>
          </div>
          <div className={`save-pill ${saveStatus.toLowerCase()}`}>
            <Icon name="cloud" />
            {saveStatus}{lastSavedAt ? ` at ${lastSavedAt}` : ""}
          </div>
        </header>

        {section === "dashboard" && <Dashboard data={data} totals={totals} setSection={openSection} />}
        {section === "clients" && <Clients data={data} addClient={addClient} openClientProfile={openClientProfile} />}
        {section === "client-profile" && <ClientProfile data={data} clientId={selectedClientId} backToClients={() => openSection("clients")} importClientExcel={importClientExcel} importClientPdf={importClientPdf} addManualClientVehicle={addManualClientVehicle} deleteClientVehicle={deleteClientVehicle} deleteClientAndAccount={deleteClientAndAccount} />}
        {toast && <button className="toast" onClick={() => setToast("")}>{toast}</button>}

        {section === "fleet" && <Fleet data={data} updateVehicleFinance={updateVehicleFinance} createListing={createListing} />}
        {section === "dues" && <Dues data={data} updateTaskStatus={updateTaskStatus} />}
        {section === "verification" && <Verification data={data} updateTaskStatus={updateTaskStatus} />}
        {section === "caller" && <CallerQueue data={data} saveCallerOutcome={saveCallerOutcome} />}
        {section === "marketplace" && <Marketplace data={data} updateListingStatus={updateListingStatus} />}
        {section === "reports" && <Reports data={data} activeReport={activeReport} setActiveReport={setActiveReport} />}
        {section === "import" && <ImportRows data={data} importValidRows={importValidRows} lastSavedAt={lastSavedAt} />}
        {section === "settings" && <Settings data={data} lastSavedAt={lastSavedAt} saveStatus={saveStatus} clearNotifications={clearNotifications} resetDemoData={resetDemoData} exportData={exportData} saveCommonPassword={saveCommonPassword} saveRolePermissions={saveRolePermissions} createCallerAccount={createCallerAccount} runCallerAssignment={runCallerAssignment} setSection={openSection} />}
      </section>
    </main>
  );
}

function Dashboard({ data, totals, setSection }) {
  return (
    <section className="dashboard-page">
      <section className="metrics dashboard-metrics">
        <Metric label="Clients" value={data.clients.length} icon="people" onClick={() => setSection("clients")} />
        <Metric label="Vehicles" value={data.vehicles.length} icon="truck" />
        <Metric label="Smart Alert" value={totals.openDues.length} icon="calendar" />
      </section>
      <section className="quick-strip dashboard-actions">
        {[
          ["Add client", "clients", "people"],
          ["Caller queue", "caller", "phone"],
          ["Marketplace", "marketplace", "store"]
        ].map(([label, target, icon]) => (
          <button key={target} onClick={() => setSection(target)}>
            <Icon name={icon} />
            {label}
          </button>
        ))}
      </section>
      <section className="split dashboard-split">
        <Panel title="Priority Work">
          {totals.overdue.map((task) => <DueCard key={task.id} task={task} data={data} compact />)}
          {totals.overdue.length === 0 && <Empty text="No overdue or escalated work." />}
        </Panel>
        <Panel title="Notifications">
          {data.notifications.map((item) => (
            <article className="notice" key={item.id}>
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </article>
          ))}
        </Panel>
      </section>
    </section>
  );
}

function Clients({ data, addClient, openClientProfile }) {
  return (
    <section className="clients-layout">
      <section className="client-create-card">
        <div className="client-card-head">
          <span className="client-head-icon"><Icon name="plus" /></span>
          <div>
            <h2>Create Client</h2>
            <span>New record</span>
          </div>
        </div>
        <form className="client-form" onSubmit={addClient}>
          <label>Name<input name="name" placeholder="New Client" required /></label>
          <label>City<input name="city" placeholder="Jaipur" required /></label>
          <label>Phone<input name="phone" placeholder="+919812345678" required /></label>
          <label>Email (login)<input name="email" type="email" placeholder="owner@company.com" required /></label>
          <button type="submit"><Icon name="plus" />Add client & create account</button>
        </form>
      </section>

      <section className="clients-table-card">
        <div className="clients-table-head">
          <div>
            <h2>Client Directory</h2>
            <span>{data.clients.length} records</span>
          </div>
          <span className="client-total-pill">{data.clients.length} Clients</span>
        </div>
        <div className="clients-table-scroll">
        <table className="clients-table">
          <thead><tr><th>Client</th><th>City</th><th>Phone</th><th>Vehicles</th><th>Caller</th><th>Profile</th></tr></thead>
          <tbody>
            {data.clients.map((client) => {
              const vehicleCount = data.vehicles.filter((vehicle) => vehicle.clientId === client.id && !isBodyRegNo(vehicle.regNo)).length;
              const callerName = users.find((user) => user.id === client.callerId)?.name;
              return (
                <tr key={client.id}>
                  <td>
                    <div className="client-name-cell">
                      <span className="client-avatar-small">{client.name.slice(0, 1)}</span>
                      <strong>{client.name}</strong>
                    </div>
                  </td>
                  <td><span className="client-city-pill">{client.city}</span></td>
                  <td className="client-phone-cell">{client.phone}</td>
                  <td><span className="client-count-pill">{vehicleCount}</span></td>
                  <td>{callerName}</td>
                  <td><button className="client-profile-button" type="button" onClick={() => openClientProfile(client.id)}><Icon name="people" />Profile</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </section>
    </section>
  );
}

function ManualVehicleForm({ client, onSubmit }) {
  return (
    <form className="manual-entry-form" onSubmit={onSubmit}>
      <section>
        <h3>Registration</h3>
        <label>Sr. No.<input name="srNo" placeholder="1" /></label>
        <label>Regt. No.<input name="regNo" placeholder="GJ 16 AY 7703" required /></label>
        <label>Regt. Owner<input name="owner" defaultValue={client.name.toUpperCase()} /></label>
        <label>Manufacturer<input name="manufacturer" placeholder="AL" /></label>
        <label>Model<input name="model" placeholder="4825" /></label>
        <label>Yr of mfg<input name="yearOfMfg" placeholder="11-2025" /></label>
        <label>Reg. Date<input name="regDate" placeholder="24-02-2026" /></label>
      </section>
      <section>
        <h3>Finance</h3>
        <label>Free/Fin Fin<input name="financeStatus" placeholder="FIN" /></label>
        <label>Financier's Name<input name="financier" placeholder="AXIS" /></label>
        <label>Loan Acc. No<input name="loanAccount" placeholder="CVR001313712427" /></label>
        <label>Loan Am.<input name="loanAmount" placeholder="4300000" /></label>
        <label>EMI Am.<input name="emiAmount" placeholder="109736" /></label>
        <label>Interest Rate (%)<input name="interestRate" placeholder="9.41" /></label>
        <label>Tenure<input name="tenure" placeholder="48" /></label>
        <label>Paid Emi<input name="paidEmi" placeholder="7" /></label>
        <label>EMI Start<input name="emiStart" placeholder="01-05-2026" /></label>
        <label>EMI End<input name="emiEnd" placeholder="05-12-2029" /></label>
        <div className="manual-auto-field">
          <span>Closing Principal</span>
          <strong>Auto calculated</strong>
        </div>
      </section>
      <section>
        <h3>Policy</h3>
        <label>Policy Company<input name="policyCompany" placeholder="ICICI LOMBARD" /></label>
        <label>Policy No.<input name="policyNo" placeholder="3003/427928269/00/000" /></label>
        <label>Policy Start Date<input name="policyStart" placeholder="02-06-2026" /></label>
        <label>Policy End Date<input name="policyEnd" placeholder="05-02-2027" /></label>
        <label>PUC No.<input name="pucNo" placeholder="Newv4" /></label>
        <label>PUC Expired<input name="pucExpired" placeholder="23-02-2027" /></label>
        <label>Fitness Expired<input name="fitnessExpired" placeholder="18-02-2028" /></label>
      </section>
      <section>
        <h3>Permit</h3>
        <label>Permit No.<input name="permitNo" placeholder="GJ2026-GP-6236B" /></label>
        <label>Permit Issue<input name="permitIssue" placeholder="25-02-2026" /></label>
        <label>Permit Expired<input name="permitExpired" placeholder="24-02-2031" /></label>
        <label>Permit Type<input name="permitType" placeholder="Goods Permit [HGV]" /></label>
        <label>National Permit Expired<input name="nationalPermitExpired" placeholder="20-05-2027" /></label>
        <label className="span-2">Remarks<textarea name="remarks" placeholder="Notes" /></label>
      </section>
      <button type="submit"><Icon name="check" />Save Manual Details</button>
    </form>
  );
}

function ClientProfile({ data, clientId, backToClients, importClientExcel, importClientPdf, addManualClientVehicle, deleteClientVehicle, deleteClientAndAccount }) {
  const [entryMode, setEntryMode] = useState("excel");
  const client = getDataClient(data, clientId);

  if (!client) {
    return (
      <section className="stack">
        <button className="ghost-action" type="button" onClick={backToClients}>Back to clients</button>
        <Empty text="Client profile not found." />
      </section>
    );
  }

  const clientVehicles = data.vehicles.filter((vehicle) => vehicle.clientId === client.id);
  const visibleVehicles = clientVehicles.filter((vehicle) => !isBodyRegNo(vehicle.regNo));
  const clientDues = data.dueTasks.filter((task) => task.clientId === client.id);
  const visibleDues = clientDues.filter((task) => !isBodyRegNo(getDataVehicle(data, task.vehicleId)?.regNo ?? task.type));
  const clientImports = (data.clientImports ?? []).filter((item) => item.clientId === client.id);
  const importedAssets = clientImports.flatMap((item) => item.rows.map((row) => ({ ...row, importFile: item.fileName, importedAt: item.importedAt })));
  const caller = users.find((user) => user.id === client.callerId);
  const excelClosingTotal = importedAssets.reduce((sum, row) => sum + autoClosingPrincipal(row), 0);
  const totalClosing = excelClosingTotal > 0
    ? excelClosingTotal
    : clientVehicles.reduce((sum, vehicle) => sum + liability(vehicle), 0);
  const openAmount = visibleDues.filter((task) => task.status !== "Closed").reduce((sum, task) => sum + task.amount, 0);
  const excelLoanTotal = importedAssets.reduce((sum, row) => sum + toNumber(row.loanAmount), 0);
  const recentActivity = data.callerActivities.filter((activity) =>
    clientDues.some((task) => task.id === activity.taskId)
  );
  const saveManualVehicle = (event) => {
    addManualClientVehicle(event, client.id);
    setEntryMode("excel");
  };

  return (
    <section className="client-profile stack">
      <section className="profile-hero">
        <div className="profile-hero-actions">
          <button className="ghost-action" type="button" onClick={backToClients}>Back to clients</button>
          {deleteClientAndAccount && (
            <button className="ghost-action danger" type="button" onClick={() => deleteClientAndAccount(client)}>
              <Icon name="trash" />Delete client
            </button>
          )}
        </div>
        <div className="profile-identity">
          <div className="profile-avatar">{client.name.slice(0, 1)}</div>
          <div className="profile-copy">
            <span>Client profile</span>
            <h2>{client.name}</h2>
            <p>{client.city} | {client.phone}</p>
          </div>
        </div>
        <div className="profile-total">
          <span>Closing total</span>
          <strong>{formatMoney(totalClosing)}</strong>
        </div>
      </section>

      <section className="profile-stats">
        <article>
          <Icon name="truck" />
          <span>Vehicles</span>
          <strong>{visibleVehicles.length}</strong>
          <small>Total vehicles</small>
        </article>
        <article>
          <Icon name="calendar" />
          <span>Open dues</span>
          <strong>{visibleDues.filter((task) => task.status !== "Closed").length}</strong>
          <small>Pending records</small>
        </article>
        <article>
          <Icon name="money" />
          <span>Open amount</span>
          <strong>{formatMoney(openAmount)}</strong>
          <small>Total outstanding</small>
        </article>
        <article>
          <Icon name="phone" />
          <span>Caller</span>
          <strong>{caller?.name ?? "Unassigned"}</strong>
          <small>Assigned caller</small>
        </article>
        <article>
          <Icon name="upload" />
          <span>Excel assets</span>
          <strong>{importedAssets.length}</strong>
          <small>Excel files</small>
        </article>
      </section>

      {clientImports.length > 0 && (
        <section className="import-strip">
          <Icon name="upload" />
          <div>
            <strong>{clientImports[0].fileName}</strong>
            <span>{importedAssets.length} Excel rows imported at {clientImports[0].importedAt}</span>
          </div>
          <Badge label="Imported" />
        </section>
      )}

      <section className="entry-panel">
        <div className="entry-tabs" role="tablist" aria-label="Add client details">
          <button className={entryMode === "excel" ? "active" : ""} type="button" onClick={() => setEntryMode("excel")}>
            <Icon name="upload" />
            Excel Import
          </button>
          <button className={entryMode === "manual" ? "active" : ""} type="button" onClick={() => setEntryMode("manual")}>
            <Icon name="plus" />
            Manual Entry
          </button>
          <button className={entryMode === "pdf" ? "active" : ""} type="button" onClick={() => setEntryMode("pdf")}>
            <Icon name="upload" />
            PDF Upload
          </button>
        </div>
        {entryMode === "excel" ? (
          <div className="excel-import-card">
            <Icon name="upload" />
            <div>
              <strong>Upload vehicle finance Excel</strong>
              <span>Excel columns se registration, finance, policy, PUC, fitness and permit details save honge.</span>
            </div>
            <label className="file-picker">
              <input type="file" accept=".xlsx,.xls" onChange={(event) => importClientExcel(event, client.id)} />
              Choose Excel
            </label>
          </div>
        ) : entryMode === "pdf" ? (
          <div className="excel-import-card pdf-import-card">
            <Icon name="upload" />
            <div>
              <strong>Upload bank PDF</strong>
              <span>Agreement Number se matching vehicle finance data update hoga.</span>
            </div>
            <label className="file-picker">
              <input type="file" accept=".pdf,application/pdf" onChange={(event) => importClientPdf(event, client.id)} />
              Choose PDF
            </label>
          </div>
        ) : (
          <ManualVehicleForm client={client} onSubmit={saveManualVehicle} />
        )}
      </section>

      <section className="profile-main">
        <Panel title="Client Details">
          <div className="detail-grid">
            <Pair label="Client ID" value={client.id} />
            <Pair label="Name" value={client.name} />
            <Pair label="City" value={client.city} />
            <Pair label="Phone" value={client.phone} />
            <Pair label="Assigned caller" value={caller?.name ?? "Unassigned"} />
            <Pair label="Closing total" value={formatMoney(totalClosing)} />
            <Pair label="Excel loan total" value={formatMoney(excelLoanTotal)} />
            <Pair label="Last Excel import" value={clientImports[0]?.importedAt ?? "Not imported"} />
          </div>
        </Panel>

        <Panel title="Dues">
          <div className="profile-dues">
            {visibleDues.map((task) => (
              <DueCard key={task.id} task={task} data={data} compact />
            ))}
            {visibleDues.length === 0 && <Empty text="No dues found for this client." />}
          </div>
        </Panel>
      </section>

      <section className="vehicle-section">
        <div className="section-heading">
          <span>Fleet</span>
          <h2>Client Vehicles</h2>
        </div>
        {visibleVehicles.length > 0 ? (
          <section className="vehicle-browser">
            <VehicleFinanceTable vehicles={visibleVehicles} importedAssets={importedAssets} clientName={client.name} onDeleteVehicle={(row) => deleteClientVehicle(row, client.id)} />
          </section>
        ) : (
          <Empty text="No vehicles found for this client." />
        )}
      </section>

      <Panel title="Recent Caller Activity">
        <div className="profile-timeline">
          {recentActivity.map((activity) => (
            <article key={activity.id}>
              <div />
              <p>
                <strong>{activity.outcome}</strong>
                <span>{activity.notes}</span>
                <small>{activity.channel} | {activity.at}</small>
              </p>
            </article>
          ))}
          {recentActivity.length === 0 && <Empty text="No caller activity recorded yet." />}
        </div>
      </Panel>
    </section>
  );
}

function makeVehicleDetail(vehicle, excelAsset, clientName) {
  return excelAsset ?? {
    srNo: "-",
    regNo: vehicle.regNo,
    owner: clientName,
    manufacturer: vehicle.make,
    model: vehicle.model,
    yearOfMfg: String(vehicle.year),
    regDate: "-",
    financeStatus: "-",
    financier: "-",
    loanAccount: "-",
    loanAmount: String(vehicle.principal),
    emiAmount: "-",
    tenure: "-",
    paidEmi: "-",
    emiStart: "-",
    emiEnd: "-",
    closingPrincipal: String(vehicle.principal),
    policyCompany: "-",
    policyNo: "-",
    policyStart: "-",
    policyEnd: vehicle.insuranceExpiry,
    pucNo: "-",
    pucExpired: "-",
    fitnessExpired: "-",
    permitNo: "-",
    permitIssue: "-",
    permitExpired: vehicle.permitExpiry,
    permitType: "-",
    nationalPermitExpired: "-",
    remarks: "-"
  };
}

function Fleet({ data, updateVehicleFinance, createListing }) {
  return (
    <section className="grid-list">
      {data.vehicles.map((vehicle) => (
        <article className="asset" key={vehicle.id}>
          <div className="card-head">
            <div>
              <strong>{vehicle.regNo}</strong>
              <span>{vehicle.year} {vehicle.make} {vehicle.model}</span>
            </div>
            <Badge label={vehicle.status} />
          </div>
          <dl>
            <div><dt>Owner</dt><dd>{getDataClient(data, vehicle.clientId)?.name}</dd></div>
            <div><dt>Type</dt><dd>{vehicle.type}</dd></div>
            <div><dt>KM</dt><dd>{vehicle.km.toLocaleString("en-IN")}</dd></div>
            <div><dt>Closing</dt><dd>{formatMoney(liability(vehicle))}</dd></div>
            <div><dt>Insurance</dt><dd>{formatDisplayDate(vehicle.insuranceExpiry)}</dd></div>
            <div><dt>Permit</dt><dd>{formatDisplayDate(vehicle.permitExpiry)}</dd></div>
          </dl>
          <details>
            <summary>Edit finance</summary>
            <form className="form-grid compact-form" onSubmit={(event) => updateVehicleFinance(event, vehicle.id)}>
              <label>Principal<input name="principal" defaultValue={vehicle.principal} /></label>
              <label>Overdue<input name="overdue" defaultValue={vehicle.overdue} /></label>
              <label>Penalty<input name="penalty" defaultValue={vehicle.penalty} /></label>
              <label>Foreclosure<input name="foreclosure" defaultValue={vehicle.foreclosure} /></label>
              <label>Status<select name="status" defaultValue={vehicle.status}><option>Active</option><option>Listed</option><option>Sold</option></select></label>
              <button type="submit"><Icon name="check" />Save finance</button>
            </form>
          </details>
          <details>
            <summary>Create sale listing</summary>
            <form className="form-grid compact-form" onSubmit={(event) => createListing(event, vehicle.id)}>
              <label>Price<input name="price" placeholder={formatMoney(liability(vehicle))} /></label>
              <label>Location<input name="location" placeholder={getDataClient(data, vehicle.clientId)?.city ?? "City"} /></label>
              <label>Condition<select name="condition" defaultValue="Good"><option>Excellent</option><option>Good</option><option>Average</option></select></label>
              <label className="span-2">Photos<input name="photos" type="file" accept="image/*" multiple /></label>
              <button type="submit"><Icon name="store" />Create listing</button>
            </form>
          </details>
        </article>
      ))}
    </section>
  );
}

function Dues({ data, updateTaskStatus }) {
  const smartAlerts = buildSmartAlerts(data);
  const openTasks = data.dueTasks.filter((task) => task.status !== "Closed");
  const expiredAlerts = smartAlerts.filter((alert) => alert.status === "Expired");
  const soonAlerts = smartAlerts.filter((alert) => ["Today", "Soon"].includes(alert.status));
  const totalDue = openTasks.reduce((sum, task) => sum + task.amount, 0);

  return (
    <section className="dues-board">
      <div className="dues-summary">
        <article>
          <span>Vehicle Alerts</span>
          <strong>{smartAlerts.length}</strong>
        </article>
        <article>
          <span>Expired</span>
          <strong>{expiredAlerts.length}</strong>
        </article>
        <article>
          <span>Next 10 days</span>
          <strong>{soonAlerts.length}</strong>
        </article>
        <article>
          <span>Payment</span>
          <strong>{formatMoney(totalDue)}</strong>
        </article>
      </div>
      <section className="smart-alert-panel">
        <div className="smart-alert-head">
          <h2>Vehicle Expiry Details</h2>
          <span>{smartAlerts.length} alerts</span>
        </div>
        <div className="smart-alert-list">
          {smartAlerts.map((alert) => (
            <article className="smart-alert-card" key={alert.id}>
              <div className="smart-alert-icon"><Icon name="calendar" /></div>
              <div className="smart-alert-copy">
                <strong>{alert.vehicle}</strong>
                <span>{alert.client}</span>
              </div>
              <div className="smart-alert-type">{alert.type}</div>
              <div className="smart-alert-date">
                <strong>{formatDisplayDate(alert.date)}</strong>
                <span>{alert.detail}</span>
              </div>
              <Badge label={alert.status} />
            </article>
          ))}
          {smartAlerts.length === 0 && <Empty text="No vehicle expiry alerts found." />}
        </div>
      </section>
      <section className="smart-alert-panel">
        <div className="smart-alert-head">
          <h2>Payment Alerts</h2>
          <span>{openTasks.length} open</span>
        </div>
        <div className="dues-list">
          {data.dueTasks.map((task) => (
            <DueCard key={task.id} task={task} data={data} updateTaskStatus={updateTaskStatus} />
          ))}
        </div>
      </section>
    </section>
  );
}

function DueCard({ task, data, updateTaskStatus, compact = false }) {
  const client = getDataClient(data, task.clientId);
  const vehicle = getDataVehicle(data, task.vehicleId);
  return (
    <article className={compact ? "due compact" : "due"}>
      {compact && (
        <div className="due-icon">
          <Icon name="calendar" />
        </div>
      )}
      <div className="due-copy">
        <strong>{task.type} - {vehicle?.regNo}</strong>
        <span>{client?.name} | Due {formatDisplayDate(task.dueDate)}</span>
      </div>
      <div className="due-status"><Badge label={task.status} /></div>
      <b className="due-amount">{formatMoney(task.amount)}</b>
      {!compact && (
        <div className="actions">
          <button onClick={() => updateTaskStatus(task.id, "Promise-to-Pay", "Promise to pay marked by Admin")}>Promise</button>
          <button onClick={() => updateTaskStatus(task.id, "Verification Pending", "Documents requested from owner")}>More info</button>
          <button onClick={() => updateTaskStatus(task.id, "Closed", "Closed by Admin")}>Close</button>
        </div>
      )}
    </article>
  );
}

function VehicleFinanceTable({ vehicles, importedAssets, clientName, onDeleteVehicle }) {
  const [selectedRow, setSelectedRow] = useState(null);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const searchTerm = vehicleSearch.trim().toLowerCase();
  const tableRows = vehicles.flatMap((vehicle, index) => {
    const matchingAssets = importedAssets.filter((asset) => !isBodyRow(asset) && normalizeRegNo(baseRegNo(asset.regNo)) === normalizeRegNo(baseRegNo(vehicle.regNo)));
    const excelAsset = matchingAssets.find((asset) => asset.pdfImportedAt || asset.bankClosingPrincipal) ?? matchingAssets[0];
    const bodyAsset = importedAssets.find((asset) => isBodyRow(asset) && normalizeRegNo(baseRegNo(asset.regNo)) === normalizeRegNo(baseRegNo(vehicle.regNo)));
    const searchableText = [
      vehicle.regNo,
      vehicle.make,
      vehicle.model,
      clientName,
      excelAsset?.owner,
      excelAsset?.regNo,
      excelAsset?.loanAccount,
      bodyAsset?.loanAccount
    ].filter(Boolean).join(" ").toLowerCase();
    if (searchTerm && !searchableText.includes(searchTerm)) return [];
    const bodyDetail = bodyAsset ? {
      ...bodyAsset,
      displaySrNo: "",
      isBodyDetail: true
    } : null;
    const mainAsset = {
      ...makeVehicleDetail(vehicle, excelAsset, clientName),
      displaySrNo: String(index + 1),
      isBodyDetail: false,
      bodyDetail
    };
    if (bodyDetail) bodyDetail.parentDetail = mainAsset;
    return [mainAsset, bodyDetail].filter(Boolean);
  });
  const firstRow = tableRows[0];

  return (
    <article className="vehicle-detail-card">
      <div className="card-head">
        <div>
          <strong>{tableRows.filter((row) => !row.isBodyDetail).length} Vehicles</strong>
          <span>{firstRow?.owner || clientName}</span>
        </div>
        <Badge label="All" />
      </div>
      <div className="vehicle-table-toolbar">
        <label className="vehicle-search-box">
          <Icon name="search" />
          <input
            type="search"
            value={vehicleSearch}
            onChange={(event) => setVehicleSearch(event.target.value)}
            placeholder="Search vehicle number or name"
            aria-label="Search vehicles by number or name"
          />
        </label>
      </div>
      <div className="excel-record-table">
        <table>
          <thead>
            <tr>
              <th>View</th>
              <th>Delete</th>
              <th>Regt. No.</th>
              <th>EMI Am.</th>
              <th>Tenure</th>
              <th>Paid Emi</th>
              <th>Closing Principal</th>
              <th>Policy Company</th>
              <th>Policy No.</th>
              <th>Policy End Date</th>
              <th>PUC Expired</th>
              <th>Fitness Expired</th>
              <th>Permit Expired</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr className={row.isBodyDetail ? "body-row" : ""} key={`${row.regNo || "vehicle"}-${row.loanAccount || row.displaySrNo}`}>
                <td>
                  {!row.isBodyDetail && (
                    <button className="icon-button view-button" type="button" title="View details" aria-label={`View details for ${row.regNo || row.loanAccount || "vehicle"}`} onClick={() => setSelectedRow(row)}>
                      <Icon name="eye" />
                    </button>
                  )}
                </td>
                <td>
                  {!row.isBodyDetail && (
                    <button className="icon-button delete-row-button" type="button" title="Delete vehicle" aria-label={`Delete ${row.regNo || row.loanAccount || "vehicle"}`} onClick={() => onDeleteVehicle?.(row)}>
                      <Icon name="trash" />
                    </button>
                  )}
                </td>
                <td>
                  {row.isBodyDetail ? (
                    <span className="body-reg"><span className="body-connector" />BODY</span>
                  ) : row.regNo || "-"}
                </td>
                <td>{formatPlainMoney(row.emiAmount)}</td>
                <td>{row.tenure || "-"}</td>
                <td>{row.paidEmi || "-"}</td>
                <td>{formatAutoClosingPrincipal(row)}</td>
                <td>{row.policyCompany || "-"}</td>
                <td>{row.policyNo || "-"}</td>
                <td>{formatDisplayDate(row.policyEnd)}</td>
                <td>{formatDisplayDate(row.pucExpired)}</td>
                <td>{formatDisplayDate(row.fitnessExpired)}</td>
                <td>{formatDisplayDate(row.permitExpired)}</td>
              </tr>
            ))}
            {tableRows.length === 0 && (
              <tr>
                <td className="table-empty-cell" colSpan="13">No vehicle match found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selectedRow && <VehicleDetailModal row={selectedRow} onClose={() => setSelectedRow(null)} />}
    </article>
  );
}

function VehicleDetailModal({ row, onClose }) {
  return (
    <div className="detail-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="vehicle-detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="detail-modal-head">
          <div>
            <h2 id="vehicle-detail-title">{row.regNo || `Agreement ${row.loanAccount || ""}`}</h2>
            <p>{row.owner || "-"}</p>
          </div>
          <div className="detail-modal-actions">
            <Badge label={row.financeStatus || "Detail"} />
            <button className="icon-button close-button" type="button" title="Close" aria-label="Close details" onClick={onClose}>x</button>
          </div>
        </div>
        <div className="detail-summary-strip">
          <div>
            <span>Vehicle EMI</span>
            <strong>{formatPlainMoney(row.emiAmount)}</strong>
          </div>
          <div>
            <span>Vehicle Closing</span>
            <strong>{formatAutoClosingPrincipal(row)}</strong>
          </div>
          {row.bodyDetail && (
            <div>
              <span>Body Closing</span>
              <strong>{formatAutoClosingPrincipal(row.bodyDetail)}</strong>
            </div>
          )}
        </div>
        <div className="detail-card-grid">
          <DetailSection title="Registration" rows={[
            ["Sr. No.", row.srNo],
            ["Regt. No.", row.regNo],
            ["Regt. Owner", row.owner],
            ["Manufacturer", row.manufacturer],
            ["Model", row.model],
            ["Yr of mfg", row.yearOfMfg],
            ["Reg. Date", formatDisplayDate(row.regDate)]
          ]} />
          <DetailSection title="Finance" rows={[
            ["Free/Fin Fin", row.financeStatus],
            ["Financier's Name", row.financier],
            ["Loan Acc. No", row.loanAccount],
            ["Loan Am.", formatMaybeMoney(row.loanAmount)],
            ["EMI Am.", formatPlainMoney(row.emiAmount)],
            ["Interest Rate", row.interestRate ? `${row.interestRate}%` : "-"],
            ["Tenure", row.tenure],
            ["Paid Emi", row.paidEmi],
            ["EMI Start", formatDisplayDate(row.emiStart)],
            ["EMI End", formatDisplayDate(row.emiEnd)],
            ["Closing Principal", formatAutoClosingPrincipal(row)]
          ]} />
          {row.bodyDetail && (
            <DetailSection title="Body Finance" rows={[
              ["Regt. No.", "BODY"],
              ["Free/Fin Fin", row.bodyDetail.financeStatus],
              ["Financier's Name", row.bodyDetail.financier],
              ["Loan Acc. No", row.bodyDetail.loanAccount],
              ["Loan Am.", formatMaybeMoney(row.bodyDetail.loanAmount)],
              ["EMI Am.", formatPlainMoney(row.bodyDetail.emiAmount)],
              ["Interest Rate", row.bodyDetail.interestRate ? `${row.bodyDetail.interestRate}%` : "-"],
              ["Tenure", row.bodyDetail.tenure],
              ["Paid Emi", row.bodyDetail.paidEmi],
              ["EMI Start", formatDisplayDate(row.bodyDetail.emiStart)],
              ["EMI End", formatDisplayDate(row.bodyDetail.emiEnd)],
              ["Closing Principal", formatAutoClosingPrincipal(row.bodyDetail)]
            ]} />
          )}
          <DetailSection title="Policy" rows={[
            ["Policy Company", row.policyCompany],
            ["Policy No.", row.policyNo],
            ["Policy Start Date", formatDisplayDate(row.policyStart)],
            ["Policy End Date", formatDisplayDate(row.policyEnd)],
            ["PUC No.", row.pucNo],
            ["PUC Expired", formatDisplayDate(row.pucExpired)],
            ["Fitness Expired", formatDisplayDate(row.fitnessExpired)]
          ]} />
          <DetailSection title="Permit" rows={[
            ["Permit No.", row.permitNo],
            ["Permit Issue", formatDisplayDate(row.permitIssue)],
            ["Permit Expired", formatDisplayDate(row.permitExpired)],
            ["Permit Type", row.permitType],
            ["National Permit Expired", formatDisplayDate(row.nationalPermitExpired)],
            ["Remarks", row.remarks]
          ]} />
        </div>
      </section>
    </div>
  );
}

function DetailSection({ title, rows }) {
  return (
    <article className="detail-section-card">
      <h3>{title}</h3>
      <div>
        {rows.map(([label, value]) => (
          <p key={label}>
            <span>{label}</span>
            <b>{value || "-"}</b>
          </p>
        ))}
      </div>
    </article>
  );
}

function Verification({ data, updateTaskStatus }) {
  return (
    <section className="grid-list">
      {data.verificationItems.map((item) => {
        const task = data.dueTasks.find((entry) => entry.id === item.taskId);
        return (
          <article className="asset" key={item.id}>
            <div className="card-head">
              <div>
                <strong>{item.proofType}</strong>
                <span>{item.submittedBy} | {item.submittedAt}</span>
              </div>
              <Badge label={task?.status ?? "Review"} />
            </div>
            {item.details.map(([label, value]) => <Pair key={label} label={label} value={value} />)}
            <div className="audit-box">
              {item.audit.map(([label, value]) => <Pair key={label} label={label} value={value} />)}
            </div>
            <div className="actions">
              <button onClick={() => updateTaskStatus(task.id, "Closed", "Admin approved submitted proof")}>Approve</button>
              <button onClick={() => updateTaskStatus(task.id, "Verification Pending", "Admin requested additional information")}>More info</button>
              <button className="danger" onClick={() => updateTaskStatus(task.id, "Due", "Admin rejected submitted proof")}>Reject</button>
            </div>
          </article>
        );
      })}
      {data.verificationItems.length === 0 && <Empty text="No proof is waiting for verification." />}
    </section>
  );
}

function CallerQueue({ data, saveCallerOutcome }) {
  return (
    <section className="grid-list caller-grid">
      {data.dueTasks.map((task) => {
        const client = getDataClient(data, task.clientId);
        const history = data.callerActivities.filter((item) => item.taskId === task.id);
        return (
          <article className="asset" key={task.id}>
            <div className="card-head">
              <div>
                <strong>{client?.name}</strong>
                <span>{task.type} | {formatDisplayDate(task.dueDate)} | {task.priority}</span>
              </div>
              <b>{formatMoney(task.amount)}</b>
            </div>
            <form className="form-grid compact-form" onSubmit={(event) => saveCallerOutcome(event, task)}>
              <label>Outcome<select name="outcome">{callerOutcomes.map((item) => <option key={item.outcome}>{item.outcome}</option>)}</select></label>
              <label>Channel<select name="channel"><option>Call</option><option>WhatsApp</option><option>Manual</option></select></label>
              <label>Expected amount<input name="expectedAmount" placeholder="INR 54,000" /></label>
              <label>Next follow-up<input name="nextFollowUp" placeholder="2026-08-12" /></label>
              <label className="span-2">Notes<textarea name="notes" placeholder="Customer note" /></label>
              <button type="submit"><Icon name="phone" />Save outcome</button>
            </form>
            <div className="history">
              {history.slice(0, 2).map((item) => (
                <p key={item.id}><strong>{item.outcome}</strong><span>{item.notes}</span></p>
              ))}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function Marketplace({ data, updateListingStatus }) {
  return (
    <section className="grid-list">
      {data.listings.map((listing) => {
        const listingPhoto = listing.photos?.[0];
        return (
          <article className="asset" key={listing.id}>
            {listingPhoto?.dataUrl && <img className="listing-photo" src={listingPhoto.dataUrl} alt={listing.title} />}
            <div className="card-head">
              <div>
                <strong>{listing.title}</strong>
                <span>{listing.location} | {listing.condition}</span>
              </div>
              <Badge label={listing.status} />
            </div>
            <Pair label="Price" value={formatMoney(listing.price)} />
            <Pair label="Vehicle" value={getDataVehicle(data, listing.vehicleId)?.regNo ?? listing.vehicleId} />
            <Pair label="Photos" value={String(listing.photos?.length ?? 0)} />
            <Pair label="Chat threads" value={String((data.marketplaceThreads ?? []).filter((thread) => thread.listingId === listing.id).length)} />
            <div className="actions">
              <button onClick={() => updateListingStatus(listing.id, "Active")}>Approve</button>
              <button onClick={() => updateListingStatus(listing.id, "Changes Required")}>Changes</button>
              <button className="danger" onClick={() => updateListingStatus(listing.id, "Rejected")}>Reject</button>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function Reports({ data, activeReport, setActiveReport }) {
  const rows = getReportRows(activeReport, data);
  return (
    <section className="two-column">
      <section className="grid-list reports">
        {reportGroups.map(([title, detail]) => (
          <article className={`asset ${activeReport === title ? "selected-card" : ""}`} key={title}>
            <strong>{title}</strong>
            <span>{detail}</span>
            <button onClick={() => setActiveReport(title)}><Icon name="chart" />Open report</button>
          </article>
        ))}
      </section>
      <Panel title={`${activeReport} Report`}>
        {activeReport === "Audit" ? (
          <div className="timeline">
            {data.auditLogs.map((log) => (
              <article key={log.id}>
                <strong>{log.module}: {log.action}</strong>
                <span>{log.record} | {log.oldValue} to {log.newValue}</span>
                <small>{log.at} - {log.remark}</small>
              </article>
            ))}
          </div>
        ) : (
          <div className="table-wrap embedded-table">
            <table>
              <thead><tr><th>Name</th><th>Status</th><th>Amount</th><th>Detail</th></tr></thead>
              <tbody>
                {rows.map((row) => <tr key={row.id}><td>{row.name}</td><td><Badge label={row.status} /></td><td>{row.amount}</td><td>{row.detail}</td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </section>
  );
}

function ImportRows({ data, importValidRows, lastSavedAt }) {
  const validRows = data.importRows.filter((row) => row.status === "Valid" && row.issue !== "Imported and saved");
  return (
    <section className="stack">
      <Panel title="Excel Import">
        <div className="import-callout">
          <div>
            <strong>{validRows.length} valid rows ready</strong>
            <span>Creates client, vehicle, loan and schedule records in the workspace.</span>
          </div>
          <button disabled={validRows.length === 0} onClick={importValidRows}><Icon name="upload" />Final import</button>
        </div>
        <small>Last saved: {lastSavedAt ?? "Not saved in this session"}</small>
      </Panel>
      <section className="table-wrap">
        <table>
          <thead><tr><th>Row</th><th>Reg No</th><th>Asset</th><th>Client</th><th>Loan</th><th>Status</th><th>Issue</th></tr></thead>
          <tbody>
            {data.importRows.map((row) => (
              <tr key={row.row}>
                <td>{row.row}</td>
                <td>{row.regNo}</td>
                <td>{row.assetType}</td>
                <td>{row.client}</td>
                <td>{row.loanAccount}</td>
                <td><Badge label={row.status} /></td>
                <td>{row.issue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
}

function Settings({ data, lastSavedAt, saveStatus, clearNotifications, resetDemoData, exportData, saveCommonPassword, saveRolePermissions, createCallerAccount, runCallerAssignment, setSection }) {
  const callers = (data.users ?? users).filter((user) => user.role === "Caller");
  const openDues = data.dueTasks.filter((task) => task.status !== "Closed");
  const unassignedDues = openDues.filter((task) => !task.callerId);
  const assignedDues = openDues.length - unassignedDues.length;
  const editablePermissionRows = Array.isArray(data.rolePermissions) ? data.rolePermissions : permissionRows;
  const accessRows = editablePermissionRows.map(([feature, admin, owner, caller, buyer]) => ({
    feature,
    Admin: admin,
    Owner: owner,
    Caller: caller,
    Buyer: buyer
  }));
  const permissionOptions = ["Yes", "No", "Assigned only", "Own fleet", "Optional", "Reports only"];
  const roleActions = [
    { role: "Admin", section: "clients", icon: "people", label: "Manage clients", allowed: accessRows.filter((row) => row.Admin !== "No").length },
    { role: "Owner", section: "marketplace", icon: "store", label: "Open marketplace", allowed: accessRows.filter((row) => row.Owner !== "No").length },
    { role: "Caller", section: "caller", icon: "phone", label: "Open queue", allowed: accessRows.filter((row) => row.Caller !== "No").length },
    { role: "Buyer", section: "marketplace", icon: "store", label: "View listings", allowed: accessRows.filter((row) => row.Buyer !== "No").length }
  ];

  return (
    <section className="settings-page">
      <section className="settings-hero">
        <div>
          <span>System control</span>
          <h2>Operations settings</h2>
          <p>Customer login, caller workload and access rules are controlled from here.</p>
        </div>
        <div className="settings-hero-actions">
          <button type="button" onClick={exportData}><Icon name="upload" />Export</button>
          <button type="button" onClick={clearNotifications}><Icon name="bell" />Clear alerts</button>
        </div>
      </section>

      <section className="settings-status-grid">
        <article><Icon name="cloud" /><span>Storage</span><strong>{saveStatus}</strong></article>
        <article><Icon name="check" /><span>Last saved</span><strong>{lastSavedAt ?? "Ready"}</strong></article>
        <article><Icon name="phone" /><span>Assigned dues</span><strong>{assignedDues}/{openDues.length}</strong></article>
        <article><Icon name="bell" /><span>Unassigned</span><strong>{unassignedDues.length}</strong></article>
      </section>

      <section className="settings-grid">
        <article className="settings-card">
          <div className="settings-card-head"><Icon name="people" /><div><h3>Customer login password</h3><p>Shared password for all customer accounts until they change it.</p></div></div>
          <form className="settings-form" onSubmit={saveCommonPassword}>
            <label>Common password<input name="commonPassword" type="password" placeholder="Set shared password" minLength={4} required autoComplete="new-password" /></label>
            <button type="submit"><Icon name="check" />Save password</button>
          </form>
        </article>

        <article className="settings-card">
          <div className="settings-card-head"><Icon name="phone" /><div><h3>Caller assignment</h3><p>Create callers and assign unassigned dues with one rule.</p></div></div>
          <form className="settings-form two" onSubmit={createCallerAccount} autoComplete="off">
            <label>Caller name<input name="newCallerName" placeholder="Caller name" autoComplete="off" /></label>
            <label>Caller email<input name="newCallerEmail" type="email" placeholder="caller@kuber.local" autoComplete="off" /></label>
            <label>Caller password<input name="newCallerPassword" type="password" placeholder="Set password" minLength={4} autoComplete="new-password" /></label>
            <button type="submit"><Icon name="phone" />Create caller</button>
          </form>
          <form className="settings-form assignment-form" onSubmit={runCallerAssignment}>
            <label>Assignment rule<select name="assignmentMode" defaultValue="permanent-client"><option value="permanent-client">Permanent client-wise</option><option value="round-robin">Round-robin</option><option value="location-wise">Location-wise</option><option value="category-wise">Category-wise</option></select></label>
            <button type="submit"><Icon name="check" />Assign now</button>
          </form>
        </article>
      </section>

      <section className="settings-workload">
        <div className="settings-section-head">
          <div><h3>Caller workload</h3><p>Live queue split from open due records.</p></div>
          <button type="button" onClick={() => setSection("caller")}><Icon name="phone" />Open queue</button>
        </div>
        <div className="caller-list">
          {callers.map((caller) => {
            const count = openDues.filter((task) => task.callerId === caller.id).length;
            return <article key={caller.id}><strong>{caller.name}</strong><span>{caller.email}</span><b>{count} active</b></article>;
          })}
          {callers.length === 0 && <Empty text="No callers yet. Create a caller above, then run assignment." />}
        </div>
      </section>

      <form className="settings-access" onSubmit={saveRolePermissions}>
        <div className="settings-section-head">
          <div><h3>Role access</h3><p>Set which role can use each feature, then save permissions.</p></div>
          <div className="settings-section-actions">
            <button type="submit"><Icon name="check" />Save permissions</button>
            <button className="danger" type="button" onClick={resetDemoData}><Icon name="settings" />Reset data</button>
          </div>
        </div>
        <div className="role-card-grid">
          {roleActions.map((role) => (
            <article className="role-card" key={role.role}>
              <div className="role-card-top"><Icon name={role.icon} /><strong>{role.role}</strong><span>{role.allowed} allowed</span></div>
              <div className="permission-control-list">
                {accessRows.map((row) => {
                  const value = row[role.role] ?? "No";
                  const allowed = value !== "No";
                  return (
                    <label className={allowed ? "permission-control on" : "permission-control"} key={`${role.role}-${row.feature}`}>
                      <span>{row.feature}</span>
                      <select name={`permission-${role.role}-${row.feature}`} defaultValue={value}>
                        {permissionOptions.map((option) => <option value={option} key={option}>{option}</option>)}
                      </select>
                    </label>
                  );
                })}
              </div>
              <button type="button" onClick={() => setSection(role.section)}><Icon name={role.icon} />{role.label}</button>
            </article>
          ))}
        </div>
      </form>
    </section>
  );
}

// ─── Customer portal (post-login, shown when logging in as Customer) ────────
const customerNavItems = [
  ["dashboard", "Dashboard", "home"],
  ["fleet",     "My Fleet",  "truck"],
  ["dues",      "Dues",      "calendar"],
  ["documents", "Documents", "upload"],
  ["marketplace","Marketplace","store"],
  ["chats", "Chats", "bell"],
];

function CustomerPortal({ session, onLogout }) {
  const [section, setSection] = useState("dashboard");
  const [data, setData] = useState(loadData);
  const [loadError, setLoadError] = useState("");
  const visibleNavItems = useMemo(
    () => customerNavItems.filter(([key]) => canOpenSection(data, session.role, key)),
    [data, session.role]
  );
  const openPortalSection = (key) => {
    if (canOpenSection(data, session.role, key)) {
      setSection(key);
      return;
    }
    setLoadError("Permission denied for this section.");
  };

  useEffect(() => {
    let active = true;
    fetchBackendData()
      .then((backendData) => {
        if (!active) return;
        setData(backendData);
        setLoadError("");
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error.message || "Customer data could not be loaded from the server.");
      });
    return () => {
      active = false;
    };
  }, []);

  const myClient = data.clients.find((c) => c.id === session.clientId)
    ?? data.clients.find((c) => session.email && c.email?.toLowerCase() === session.email.toLowerCase())
    ?? data.clients.find((c) => c.name?.toLowerCase() === session.name?.toLowerCase())
    ?? clients.find((c) => c.id === session.clientId);
  const customerClientId = myClient?.id ?? session.clientId;

  const myVehicles = useMemo(
    () => data.vehicles.filter((v) => v.clientId === customerClientId),
    [data, customerClientId]
  );
  const myDues = useMemo(
    () => data.dueTasks.filter((t) => t.clientId === customerClientId),
    [data, customerClientId]
  );
  const myListings = useMemo(
    () => data.listings.filter((l) => myVehicles.some((v) => v.id === l.vehicleId)),
    [data, myVehicles]
  );
  const marketplaceListings = useMemo(
    () => data.listings.filter((l) => ["Active", "Reserved"].includes(l.status) || myVehicles.some((v) => v.id === l.vehicleId)),
    [data, myVehicles]
  );
  const myImportedAssets = useMemo(
    () => (data.clientImports ?? [])
      .filter((item) => item.clientId === customerClientId)
      .flatMap((item) => (item.rows ?? []).map((row) => ({ ...row, importFile: item.fileName, importedAt: item.importedAt }))),
    [data, customerClientId]
  );

  const totalLiability = useMemo(
    () => myVehicles.reduce((sum, v) => sum + liability(v), 0),
    [myVehicles]
  );

  const openDues = myDues.filter((t) => t.status !== "Closed");
  const sectionAllowed = section === "dashboard" || canOpenSection(data, session.role, section);
  const myDocuments = useMemo(
    () => (data.documents ?? []).filter((document) => myVehicles.some((vehicle) => vehicle.id === document.vehicleId)),
    [data, myVehicles]
  );

  const persistCustomerData = async (nextData, message) => {
    setData(nextData);
    try {
      await syncDataToBackend(nextData);
    } catch (error) {
      setLoadError(error.message || "Customer data could not be saved.");
      return;
    }
    setLoadError(message || "");
  };

  const saveCustomerMarketplaceMessage = async (listingId, messageText) => {
    if (!canUsePermission(data, session.role, "Owner chat")) {
      setLoadError("Permission denied for marketplace chat.");
      return;
    }
    const listing = data.listings.find((item) => item.id === listingId);
    const vehicle = data.vehicles.find((item) => item.id === listing?.vehicleId);
    const sellerClientId = vehicle?.clientId ?? "";
    const text = messageText.trim();
    if (!listing || !text || !customerClientId) return;
    const now = new Date().toLocaleString("en-IN");
    const existingThread = (data.marketplaceThreads ?? []).find((thread) => thread.listingId === listingId && thread.buyerClientId === customerClientId);
    const message = {
      id: `msg-${Date.now()}`,
      senderId: session.id,
      senderName: myClient?.name ?? session.name,
      text,
      sentAt: now,
      read: false
    };
    const nextThread = existingThread ? {
      ...existingThread,
      status: existingThread.status === "Interested" ? "Negotiating" : existingThread.status,
      messages: [...(existingThread.messages ?? []), message],
      updatedAt: now
    } : {
      id: `mt-${Date.now()}`,
      listingId,
      buyerClientId: customerClientId,
      sellerClientId,
      status: "Interested",
      messages: [message],
      reported: false,
      blocked: false,
      updatedAt: now
    };
    const updated = {
      ...data,
      marketplaceThreads: [nextThread, ...(data.marketplaceThreads ?? []).filter((thread) => thread.id !== nextThread.id)],
      notifications: [
        { id: `n-${Date.now()}`, title: "Marketplace chat", detail: `${message.senderName} sent a message on ${listing.title}`, target: "chats", unread: true },
        ...(data.notifications ?? [])
      ],
      auditLogs: [
        {
          id: `a-${Date.now()}`,
          module: "Marketplace Chat",
          action: "Message Sent",
          record: listing.title,
          oldValue: existingThread?.status ?? "No thread",
          newValue: nextThread.status,
          remark: text,
          at: now
        },
        ...(data.auditLogs ?? [])
      ]
    };
    await persistCustomerData(updated, "Message saved");
  };

  const updateCustomerMarketplaceThreadStatus = async (listingId, status) => {
    if (!canUsePermission(data, session.role, "Owner chat")) {
      setLoadError("Permission denied for marketplace chat.");
      return;
    }
    const listing = data.listings.find((item) => item.id === listingId);
    const vehicle = data.vehicles.find((item) => item.id === listing?.vehicleId);
    const sellerClientId = vehicle?.clientId ?? "";
    if (!listing || !customerClientId) return;
    const now = new Date().toLocaleString("en-IN");
    const existingThread = (data.marketplaceThreads ?? []).find((thread) => thread.listingId === listingId && thread.buyerClientId === customerClientId);
    const nextThread = existingThread ? {
      ...existingThread,
      status,
      reported: status === "Reported" ? true : existingThread.reported,
      blocked: status === "Blocked" ? true : existingThread.blocked,
      updatedAt: now
    } : {
      id: `mt-${Date.now()}`,
      listingId,
      buyerClientId: customerClientId,
      sellerClientId,
      status,
      messages: [],
      reported: status === "Reported",
      blocked: status === "Blocked",
      updatedAt: now
    };
    const updated = {
      ...data,
      marketplaceThreads: [nextThread, ...(data.marketplaceThreads ?? []).filter((thread) => thread.id !== nextThread.id)],
      listings: status === "Reserved" ? data.listings.map((item) => item.id === listingId ? { ...item, status: "Reserved" } : item) : data.listings,
      notifications: [
        { id: `n-${Date.now()}`, title: `Chat ${status}`, detail: listing.title, target: "chats", unread: true },
        ...(data.notifications ?? [])
      ]
    };
    await persistCustomerData(updated, `Chat ${status}`);
  };

  const submitCustomerProof = async (task, file) => {
    if (!canUsePermission(data, session.role, "View own fleet")) {
      setLoadError("Permission denied for proof upload.");
      return;
    }
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setLoadError("Please upload a PDF or image smaller than 8 MB.");
      return;
    }
    const vehicle = data.vehicles.find((item) => item.id === task.vehicleId);
    const uploadedAt = new Date().toLocaleString("en-IN");
    const dataUrl = await readFileAsDataUrl(file);
    const document = {
      id: `doc-${Date.now()}`,
      clientId: task.clientId,
      vehicleId: task.vehicleId,
      taskId: task.id,
      type: task.type === "Insurance" ? "Insurance Policy" : task.type === "EMI" ? "Payment Receipt" : "Compliance Document",
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      dataUrl,
      uploadedBy: myClient?.name ?? session.name,
      uploadedAt,
      note: "Submitted from customer web portal"
    };
    const verificationItem = {
      id: `vf-${Date.now()}`,
      taskId: task.id,
      submittedBy: myClient?.name ?? session.name,
      submittedAt: uploadedAt,
      proofType: document.type,
      details: [
        ["Vehicle", vehicle?.regNo ?? "-"],
        ["Due Type", task.type],
        ["Due Amount", formatMoney(task.amount)],
        ["Uploaded File", file.name]
      ],
      audit: [
        ["Previous Status", task.status],
        ["Current Status", "Proof Pending"],
        ["Caller Contact", "Paused until Admin decision"],
        ["Owner Note", "Submitted from customer web portal"]
      ]
    };
    const updated = {
      ...data,
      dueTasks: data.dueTasks.map((item) => item.id === task.id ? { ...item, status: "Proof Pending" } : item),
      verificationItems: [verificationItem, ...(data.verificationItems ?? []).filter((item) => item.taskId !== task.id)],
      documents: [document, ...(data.documents ?? [])],
      notifications: [
        { id: `n-${Date.now()}`, title: `${document.type} submitted`, detail: `${document.uploadedBy} uploaded ${file.name}`, target: "verification", unread: true },
        ...(data.notifications ?? [])
      ],
      auditLogs: [
        {
          id: `a-${Date.now()}`,
          module: "Owner Submission",
          action: document.type,
          record: task.id,
          oldValue: task.status,
          newValue: "Proof Pending",
          remark: file.name,
          at: uploadedAt
        },
        ...(data.auditLogs ?? [])
      ]
    };
    await persistCustomerData(updated, "Proof uploaded and sent for Admin verification.");
  };

  return (
    <main className="app-shell">
      {loadError && <div className="toast error" role="alert">{loadError}</div>}
      <aside className="sidebar">
        <div className="brand">
          <span>K</span>
          <div>
            <strong>Kuber Finance</strong>
            <small>Customer portal</small>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label="Customer sections">
          {visibleNavItems.map((item) => (
            <button
              key={item[0]}
              className={section === item[0] ? "active" : ""}
              onClick={() => openPortalSection(item[0])}
            >
              <Icon name={item[2]} />
              {item[1]}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-footer-info">
            <strong>{myClient?.name ?? session.name}</strong>
            <span>{myClient?.city ?? session.role}</span>
          </div>
          <button className="logout-button" type="button" onClick={onLogout} title="Sign out">
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>Customer portal</p>
            <h1>{customerNavItems.find(([k]) => k === section)?.[1] ?? "Dashboard"}</h1>
          </div>
          <div className="customer-profile-pill">
            <span className="customer-avatar-badge">{(myClient?.name ?? session.name).slice(0, 1)}</span>
            <div>
              <strong>{myClient?.name ?? session.name}</strong>
              <small>{myClient?.city ?? ""}</small>
            </div>
            <span className="customer-profile-caret" aria-hidden="true">v</span>
          </div>
        </header>

        {!sectionAllowed && <AccessDenied role={roleAccessName(session.role)} section={section} />}
        {sectionAllowed && section === "dashboard" && (
          <CustomerDashboard
            client={myClient}
            vehicles={myVehicles}
            dues={myDues}
            openDues={openDues}
            totalLiability={totalLiability}
            setSection={openPortalSection}
          />
        )}
        {sectionAllowed && section === "fleet" && (
          <CustomerFleet vehicles={myVehicles} client={myClient} importedAssets={myImportedAssets} />
        )}
        {sectionAllowed && section === "dues" && (
          <CustomerDues dues={myDues} vehicles={myVehicles} submitCustomerProof={submitCustomerProof} />
        )}
        {sectionAllowed && section === "documents" && (
          <CustomerDocuments documents={myDocuments} vehicles={myVehicles} />
        )}
        {sectionAllowed && section === "marketplace" && (
          <CustomerMarketplace listings={marketplaceListings} vehicles={data.vehicles} myVehicleIds={new Set(myVehicles.map((vehicle) => vehicle.id))} />
        )}
        {sectionAllowed && section === "chats" && (
          <CustomerChats
            listings={marketplaceListings}
            vehicles={data.vehicles}
            clients={data.clients}
            threads={data.marketplaceThreads ?? []}
            customerClientId={customerClientId}
            session={session}
            saveMessage={saveCustomerMarketplaceMessage}
            updateThreadStatus={updateCustomerMarketplaceThreadStatus}
          />
        )}
      </section>
    </main>
  );
}

function CustomerDashboard({ client, vehicles, dues, openDues, totalLiability, setSection }) {
  const overdue = dues.filter((t) => ["Overdue", "Escalated"].includes(t.status));

  return (
    <section className="dashboard-page">
      <div className="customer-hero">
        <div className="customer-hero-glow" aria-hidden="true" />
        <div className="customer-hero-avatar">{(client?.name ?? "K").slice(0, 1)}</div>
        <div className="customer-hero-text">
          <span className="customer-hero-eyebrow">Welcome back 👋</span>
          <h2>{client?.name ?? "Customer"}</h2>
          <p>{client?.city ? `${client.city} · ` : ""}Here's the current state of your fleet and dues.</p>
        </div>
        <ul className="customer-hero-stats">
          <li><span>Vehicles</span><strong>{vehicles.length}</strong><Icon name="truck" /></li>
          <li><span>Open dues</span><strong>{openDues.length}</strong><Icon name="calendar" /></li>
          <li><span>Closing total</span><strong>{formatMoney(totalLiability)}</strong><Icon name="money" /></li>
        </ul>
      </div>

      <section className="metrics dashboard-metrics customer-metrics">
        <CustomerMetric label="Vehicles" value={vehicles.length} helper="Total vehicles" icon="truck" onClick={() => setSection("fleet")} />
        <CustomerMetric label="Open Dues" value={openDues.length} helper="Outstanding dues" icon="calendar" onClick={() => setSection("dues")} />
        <CustomerMetric label="Closing Total" value={formatMoney(totalLiability)} helper="Total outstanding amount" icon="money" accent />
      </section>

      {overdue.length > 0 && (
        <div className="customer-alert-banner" role="alert">
          <Icon name="bell" />
          <span>
            <strong>{overdue.length} overdue/escalated due{overdue.length > 1 ? "s" : ""}</strong> — please contact your relationship manager immediately.
          </span>
        </div>
      )}

      <section className="split dashboard-split">
        <section className="panel customer-summary-panel">
          <div className="customer-panel-head">
            <div><span className="customer-panel-icon"><Icon name="truck" /></span><h2>My Fleet Summary</h2></div>
            <button type="button" aria-label="View fleet" onClick={() => setSection("fleet")}>&gt;</button>
          </div>
          {vehicles.length > 0 && (
            <div className="customer-table-head customer-fleet-table-head">
              <span>Vehicle</span><span>Model</span><span>Status</span><span>Value</span>
            </div>
          )}
          {vehicles.slice(0, 5).map((v) => (
            <article className="customer-vehicle-row" key={v.id}>
              <div className="customer-vehicle-reg"><span><Icon name="truck" /></span>{v.regNo}</div>
              <div className="customer-vehicle-model">{v.year} {v.make} {v.model}</div>
              <div className="customer-vehicle-status">
                <Badge label={v.status} />
              </div>
              <div className="customer-vehicle-amount">{formatMoney(liability(v))}</div>
            </article>
          ))}
          {vehicles.length === 0 && <Empty text="No vehicles found for your account." />}
          {vehicles.length > 0 && <p className="customer-panel-foot">Showing {Math.min(vehicles.length, 5)} of {vehicles.length} vehicles</p>}
        </section>
        <section className="panel customer-summary-panel">
          <div className="customer-panel-head">
            <div><span className="customer-panel-icon"><Icon name="calendar" /></span><h2>Recent Dues</h2></div>
            <button type="button" aria-label="View dues" onClick={() => setSection("dues")}>&gt;</button>
          </div>
          {openDues.length > 0 && (
            <div className="customer-table-head customer-dues-table-head">
              <span>Due type</span><span>Details</span><span>Status</span><span>Amount</span>
            </div>
          )}
          {openDues.slice(0, 5).map((task) => {
            const v = vehicles.find((x) => x.id === task.vehicleId);
            return (
              <article className="customer-due-row" key={task.id}>
                <div>
                  <strong>{task.type}</strong>
                  <span>{v?.regNo ?? "—"} · Due {formatDisplayDate(task.dueDate)}</span>
                </div>
                <div className="customer-due-right">
                  <Badge label={task.status} />
                  <b>{formatMoney(task.amount)}</b>
                </div>
              </article>
            );
          })}
          {openDues.length === 0 && <Empty text="No open dues. All clear!" />}
          {openDues.length > 0 && <p className="customer-panel-foot">Showing {Math.min(openDues.length, 5)} of {openDues.length} dues</p>}
        </section>
      </section>
    </section>
  );
}

function CustomerFleet({ vehicles, client, importedAssets = [] }) {
  const bodyByReg = useMemo(() => {
    const pairs = new Map();
    importedAssets
      .filter((asset) => isBodyRow(asset))
      .forEach((asset) => {
        const key = normalizeRegNo(baseRegNo(asset.regNo));
        if (key && !pairs.has(key)) pairs.set(key, asset);
      });
    return pairs;
  }, [importedAssets]);

  return (
    <section className="customer-fleet-page">
      <div className="customer-fleet-summary">
        <div>
          <span>Fleet linked to</span>
          <strong>{client?.name ?? "Customer"}</strong>
        </div>
        <div>
          <span>Total vehicles</span>
          <strong>{vehicles.length}</strong>
        </div>
        <div>
          <span>Body records</span>
          <strong>{[...bodyByReg.keys()].length}</strong>
        </div>
      </div>
      <div className="customer-fleet-grid">
        {vehicles.map((v) => (
          <article className="customer-fleet-card" key={v.id}>
            <div className="customer-fleet-card-head">
              <div>
                <strong>{v.regNo}</strong>
                <span>{v.year} {v.make} {v.model}</span>
              </div>
              <Badge label={v.status} />
            </div>
            <dl className="customer-fleet-details">
              <div><dt>Type</dt><dd>{v.type}</dd></div>
              <div><dt>KM</dt><dd>{v.km.toLocaleString("en-IN")}</dd></div>
              <div><dt>Closing</dt><dd>{formatMoney(liability(v))}</dd></div>
              <div><dt>Insurance</dt><dd>{formatDisplayDate(v.insuranceExpiry)}</dd></div>
              <div><dt>Permit</dt><dd>{formatDisplayDate(v.permitExpiry)}</dd></div>
            </dl>
            {bodyByReg.get(normalizeRegNo(baseRegNo(v.regNo))) ? (
              <BodyFinanceBlock asset={bodyByReg.get(normalizeRegNo(baseRegNo(v.regNo)))} />
            ) : (
              <div className="customer-body-empty">No body finance record linked</div>
            )}
          </article>
        ))}
        {vehicles.length === 0 && (
          <Empty text="No vehicles found for your account." />
        )}
      </div>
    </section>
  );
}

function BodyFinanceBlock({ asset }) {
  return (
    <div className="customer-body-block">
      <div className="customer-body-block-head">
        <span>Body finance</span>
        <strong>{formatAutoClosingPrincipal(asset)}</strong>
      </div>
      <div className="customer-body-grid">
        <div><span>Loan No.</span><strong>{asset.loanAccount || "-"}</strong></div>
        <div><span>Financier</span><strong>{asset.financier || "-"}</strong></div>
        <div><span>EMI</span><strong>{formatPlainMoney(asset.emiAmount)}</strong></div>
        <div><span>Paid EMI</span><strong>{asset.paidEmi || "-"}</strong></div>
      </div>
    </div>
  );
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("File could not be read."));
    reader.readAsDataURL(file);
  });
}

async function readListingPhotos(files) {
  const validFiles = Array.from(files || [])
    .filter((file) => file && typeof file.type === "string" && file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024)
    .slice(0, 6);

  return Promise.all(validFiles.map(async (file, index) => ({
    id: `lp-${Date.now()}-${index}`,
    fileName: file.name || "vehicle-photo.jpg",
    mimeType: file.type || "image/jpeg",
    size: file.size || 0,
    dataUrl: await readFileAsDataUrl(file),
    uploadedAt: new Date().toLocaleString("en-IN")
  })));
}

function CustomerDues({ dues, vehicles, submitCustomerProof }) {
  const open = dues.filter((t) => t.status !== "Closed");
  const closed = dues.filter((t) => t.status === "Closed");
  const totalOpen = open.reduce((s, t) => s + t.amount, 0);

  return (
    <section className="dues-board">
      <div className="dues-summary">
        <article>
          <span>Open dues</span>
          <strong>{open.length}</strong>
        </article>
        <article>
          <span>Closed</span>
          <strong>{closed.length}</strong>
        </article>
        <article>
          <span>Total outstanding</span>
          <strong>{formatMoney(totalOpen)}</strong>
        </article>
      </div>
      <section className="smart-alert-panel">
        <div className="smart-alert-head">
          <h2>All Dues</h2>
          <span>{dues.length} records</span>
        </div>
        <div className="dues-list" style={{ padding: "14px" }}>
          {open.map((task) => {
            const v = vehicles.find((x) => x.id === task.vehicleId);
            return (
              <article className="due" key={task.id}>
                <div className="due-copy">
                  <strong>{task.type} — {v?.regNo ?? "—"}</strong>
                  <span>Due {formatDisplayDate(task.dueDate)} · {task.priority} priority</span>
                </div>
                <div className="due-status"><Badge label={task.status} /></div>
                <b className="due-amount">{formatMoney(task.amount)}</b>
                {task.status !== "Proof Pending" && (
                  <label className="upload-button">
                    <Icon name="upload" />
                    Upload proof
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={(event) => {
                        submitCustomerProof(task, event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </label>
                )}
              </article>
            );
          })}
          {dues.length === 0 && <Empty text="No dues found for your account." />}
        </div>
      </section>
    </section>
  );
}

function CustomerDocuments({ documents, vehicles }) {
  return (
    <section className="stack">
      <div className="customer-section-header">
        <h2>Uploaded Documents</h2>
        <span>{documents.length} document{documents.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="grid-list">
        {documents.map((document) => {
          const vehicle = vehicles.find((item) => item.id === document.vehicleId);
          return (
            <article className="asset" key={document.id}>
              <div className="card-head">
                <div>
                  <strong>{document.fileName}</strong>
                  <span>{document.type} | {vehicle?.regNo ?? "-"}</span>
                </div>
                <Badge label={`${Math.max(1, Math.round((document.size || 0) / 1024))} KB`} />
              </div>
              <Pair label="Uploaded by" value={document.uploadedBy || "-"} />
              <Pair label="Uploaded at" value={document.uploadedAt || "-"} />
              <Pair label="Note" value={document.note || "-"} />
              {document.dataUrl && (
                <a className="button-link" href={document.dataUrl} target="_blank" rel="noreferrer">
                  <Icon name="upload" />
                  Open file
                </a>
              )}
            </article>
          );
        })}
        {documents.length === 0 && <Empty text="No uploaded documents yet." />}
      </div>
    </section>
  );
}

function CustomerMarketplace({ listings, vehicles, myVehicleIds }) {
  return (
    <section className="stack">
      <div className="customer-section-header">
        <h2>Marketplace</h2>
        <span>{listings.length} listing{listings.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="grid-list">
        {listings.map((l) => {
          const v = vehicles.find((x) => x.id === l.vehicleId);
          const listingPhoto = l.photos?.[0];
          const mine = myVehicleIds?.has(l.vehicleId);
          return (
            <article className="asset" key={l.id}>
              {listingPhoto?.dataUrl && <img className="listing-photo" src={listingPhoto.dataUrl} alt={l.title} />}
              <div className="card-head">
                <div>
                  <strong>{l.title}</strong>
                  <span>{l.location} · {l.condition}</span>
                </div>
                <Badge label={mine ? "My listing" : l.status} />
              </div>
              <dl>
                <div><dt>Price</dt><dd>{formatMoney(l.price)}</dd></div>
                <div><dt>Vehicle</dt><dd>{v?.regNo ?? l.vehicleId}</dd></div>
                <div><dt>Photos</dt><dd>{l.photos?.length ?? 0}</dd></div>
              </dl>
            </article>
          );
        })}
        {listings.length === 0 && (
          <Empty text="No active marketplace listings yet." />
        )}
      </div>
    </section>
  );
}

function CustomerChats({ listings, vehicles, clients, threads, customerClientId, session, saveMessage, updateThreadStatus }) {
  const [drafts, setDrafts] = useState({});
  const visibleListings = listings.filter((listing) => ["Active", "Reserved"].includes(listing.status) || threads.some((thread) => thread.listingId === listing.id));
  const threadCount = threads.filter((thread) => thread.buyerClientId === customerClientId || thread.sellerClientId === customerClientId).length;

  return (
    <section className="stack">
      <div className="customer-section-header">
        <h2>Marketplace Chats</h2>
        <span>{threadCount} thread{threadCount !== 1 ? "s" : ""}</span>
      </div>
      <div className="grid-list">
        {visibleListings.map((listing) => {
          const vehicle = vehicles.find((item) => item.id === listing.vehicleId);
          const seller = clients.find((item) => item.id === vehicle?.clientId);
          const thread = threads.find((item) => item.listingId === listing.id && (item.buyerClientId === customerClientId || item.sellerClientId === customerClientId))
            ?? threads.find((item) => item.listingId === listing.id);
          const draft = drafts[listing.id] ?? "";
          return (
            <article className="asset chat-card" key={listing.id}>
              <div className="card-head">
                <div>
                  <strong>{listing.title}</strong>
                  <span>{vehicle?.regNo ?? listing.vehicleId} | {seller?.name ?? "Vehicle Owner"}</span>
                </div>
                <Badge label={thread?.status ?? "Interested"} />
              </div>
              <div className="chat-history">
                {(thread?.messages ?? []).slice(-5).map((message) => (
                  <div className={`chat-bubble ${message.senderId === session.id ? "mine" : ""}`} key={message.id}>
                    <strong>{message.senderName}</strong>
                    <span>{message.text}</span>
                    <small>{message.sentAt}</small>
                  </div>
                ))}
                {!thread?.messages?.length && <Empty text="No messages yet." />}
              </div>
              <textarea
                rows={2}
                value={draft}
                placeholder="Type your message"
                onChange={(event) => setDrafts((current) => ({ ...current, [listing.id]: event.target.value }))}
              />
              <div className="actions">
                <button type="button" onClick={() => {
                  saveMessage(listing.id, draft);
                  setDrafts((current) => ({ ...current, [listing.id]: "" }));
                }}><Icon name="check" />Send</button>
                <button type="button" onClick={() => updateThreadStatus(listing.id, "Reserved")}>Reserve</button>
                <button type="button" onClick={() => updateThreadStatus(listing.id, "Reported")}>Report</button>
                <button className="danger" type="button" onClick={() => updateThreadStatus(listing.id, "Blocked")}>Block</button>
              </div>
            </article>
          );
        })}
        {visibleListings.length === 0 && <Empty text="No active chat-ready listings yet." />}
      </div>
    </section>
  );
}

function Metric({ label, value, icon, onClick }) {
  const content = (
    <>
      <span className="metric-icon"><Icon name={icon} /></span>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      <span className="metric-line" />
    </>
  );

  if (onClick) {
    return (
      <button className="metric metric-action" type="button" onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <article className="metric">
      {content}
    </article>
  );
}

function CustomerMetric({ label, value, helper, icon, onClick, accent = false }) {
  const content = (
    <>
      <span className="customer-metric-icon"><Icon name={icon} /></span>
      <span className="customer-metric-label">{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </>
  );

  if (onClick) {
    return <button className="customer-metric" type="button" onClick={onClick}>{content}</button>;
  }

  return <article className={`customer-metric${accent ? " accent" : ""}`}>{content}</article>;
}

function Panel({ title, children }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Pair({ label, value }) {
  return <p className="pair"><span>{label}</span><b>{value}</b></p>;
}

function Empty({ text }) {
  return <p className="empty">{text}</p>;
}

function AccessDenied({ role, section }) {
  return (
    <section className="access-denied">
      <Icon name="settings" />
      <div>
        <h2>Access blocked</h2>
        <p>{role} does not have permission for {titleFor(section)}.</p>
      </div>
    </section>
  );
}

function Badge({ label }) {
  const tone = String(label).toLowerCase().replace(/\s+/g, "-");
  return <span className={`badge ${tone}`}>{label}</span>;
}

function Icon({ name }) {
  return <span className={`icon icon-${name}`} aria-hidden="true" />;
}

function titleFor(section) {
  if (section === "client-profile") return "Client Profile";
  return navItems.find(([key]) => key === section)?.[1] ?? customerNavItems.find(([key]) => key === section)?.[1] ?? "Overview";
}

function roleAccessName(role) {
  return role === "Customer" ? "Buyer" : (role || "Buyer");
}

function permissionValueFor(data, role, feature) {
  const rows = Array.isArray(data.rolePermissions) ? data.rolePermissions : permissionRows;
  const row = rows.find((item) => item[0] === feature);
  const index = rolePermissionIndex[roleAccessName(role)] ?? rolePermissionIndex.Buyer;
  return row?.[index] ?? "No";
}

function canUsePermission(data, role, feature) {
  if (!feature) return true;
  if (role === "Admin") return true;
  return permissionValueFor(data, role, feature) !== "No";
}

function canOpenSection(data, role, section) {
  return canUsePermission(data, role, sectionPermissionMap[section]);
}

function getDataClient(data, clientId) {
  return data.clients.find((client) => client.id === clientId) ?? getClient(clientId);
}

function getDataVehicle(data, vehicleId) {
  return data.vehicles.find((vehicle) => vehicle.id === vehicleId) ?? getVehicle(vehicleId);
}

function toNumber(value) {
  const number = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function formatMaybeMoney(value) {
  const number = toNumber(value);
  return number > 0 ? formatMoney(number) : value || "-";
}

function formatPlainMoney(value) {
  const number = toNumber(value);
  return number > 0 ? new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(number) : value || "-";
}

function formatDisplayDate(value) {
  const text = String(value ?? "").trim();
  if (!text || text === "-") return "-";
  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;
  }
  const localMatch = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (localMatch) {
    const [, day, month, year] = localMatch;
    return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year.length === 2 ? `20${year}` : year}`;
  }
  const namedMonthMatch = text.match(/^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{2,4})$/);
  if (namedMonthMatch) {
    const [, day, monthName, year] = namedMonthMatch;
    const monthIndex = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(monthName.slice(0, 3).toLowerCase());
    if (monthIndex >= 0) return `${day.padStart(2, "0")}-${String(monthIndex + 1).padStart(2, "0")}-${year.length === 2 ? `20${year}` : year}`;
  }
  return text;
}

function parseDisplayDate(value) {
  const text = String(value ?? "").trim();
  if (!text || text === "-") return null;
  const formatted = formatDisplayDate(text);
  const match = formatted.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function smartAlertStatus(daysLeft) {
  if (daysLeft < 0) return "Expired";
  if (daysLeft === 0) return "Today";
  if (daysLeft <= 10) return "Soon";
  return "Upcoming";
}

function smartAlertDetail(daysLeft) {
  if (daysLeft < 0) return `${Math.abs(daysLeft)} days overdue`;
  if (daysLeft === 0) return "Expires today";
  return `${daysLeft} days left`;
}

function buildSmartAlerts(data) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const alerts = [];
  const seen = new Set();
  const pushAlert = ({ clientId, clientName, vehicle, type, date }) => {
    const parsedDate = parseDisplayDate(date);
    if (!parsedDate) return;
    parsedDate.setHours(0, 0, 0, 0);
    const daysLeft = Math.round((parsedDate - today) / 86400000);
    const normalizedVehicle = baseRegNo(vehicle);
    const id = `${normalizeRegNo(normalizedVehicle)}-${type}-${formatDisplayDate(date)}`;
    if (seen.has(id)) return;
    seen.add(id);
    alerts.push({
      id,
      client: clientName || getDataClient(data, clientId)?.name || "-",
      vehicle: normalizedVehicle || "-",
      type,
      date,
      daysLeft,
      detail: smartAlertDetail(daysLeft),
      status: smartAlertStatus(daysLeft)
    });
  };

  data.vehicles.forEach((vehicle) => {
    const clientName = getDataClient(data, vehicle.clientId)?.name;
    pushAlert({ clientId: vehicle.clientId, clientName, vehicle: vehicle.regNo, type: "Policy", date: vehicle.insuranceExpiry || vehicle.policyEnd });
    pushAlert({ clientId: vehicle.clientId, clientName, vehicle: vehicle.regNo, type: "Permit", date: vehicle.permitExpiry || vehicle.permitExpired });
    pushAlert({ clientId: vehicle.clientId, clientName, vehicle: vehicle.regNo, type: "PUC", date: vehicle.pucExpired });
    pushAlert({ clientId: vehicle.clientId, clientName, vehicle: vehicle.regNo, type: "Fitness", date: vehicle.fitnessExpired });
  });

  (data.clientImports ?? []).forEach((importItem) => {
    const clientName = getDataClient(data, importItem.clientId)?.name;
    (importItem.rows ?? []).filter((row) => row.regNo && !isBodyRow(row)).forEach((row) => {
      pushAlert({ clientId: importItem.clientId, clientName, vehicle: row.regNo, type: "Policy", date: row.policyEnd });
      pushAlert({ clientId: importItem.clientId, clientName, vehicle: row.regNo, type: "PUC", date: row.pucExpired });
      pushAlert({ clientId: importItem.clientId, clientName, vehicle: row.regNo, type: "Fitness", date: row.fitnessExpired });
      pushAlert({ clientId: importItem.clientId, clientName, vehicle: row.regNo, type: "Permit", date: row.permitExpired || row.nationalPermitExpired });
    });
  });

  return alerts
    .filter((alert) => alert.daysLeft <= 10)
    .sort((first, second) => first.daysLeft - second.daysLeft || first.vehicle.localeCompare(second.vehicle));
}

function autoClosingPrincipal(row) {
  const bankClosing = toNumber(row.bankClosingPrincipal);
  if (bankClosing > 0) return bankClosing;
  const loanAmount = toNumber(row.loanAmount);
  const emiAmount = toNumber(row.emiAmount);
  const tenure = toNumber(row.tenure);
  const paidEmi = toNumber(row.paidEmi);
  const savedClosing = toNumber(row.closingPrincipal);
  const enteredRate = String(row.interestRate ?? "").trim();
  const interestRate = enteredRate ? toNumber(enteredRate) : BANK_RELEASE_RATE_PERCENT;
  if (loanAmount <= 0 || emiAmount <= 0 || tenure <= 0) return savedClosing;
  const paidCount = Math.min(Math.max(paidEmi, 0), tenure);
  let closingPrincipal = loanAmount;
  for (let count = 0; count < paidCount; count += 1) {
    const monthlyInterest = (closingPrincipal * interestRate) / 1200;
    const principalPaid = emiAmount - monthlyInterest;
    closingPrincipal -= principalPaid;
  }
  return Math.max(closingPrincipal, 0);
}

function formatAutoClosingPrincipal(row) {
  const explicitBankClosing = String(row.bankClosingPrincipal ?? "").trim();
  if (explicitBankClosing !== "") {
    const bankValue = toNumber(explicitBankClosing);
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(bankValue);
  }
  const closing = autoClosingPrincipal(row);
  return closing > 0 ? new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(closing) : "-";
}

function normalizeRegNo(value) {
  return String(value ?? "").replace(/\s+/g, "").toUpperCase();
}

function normalizeAgreement(value) {
  return String(value ?? "").replace(/[^a-z0-9]/gi, "").toUpperCase();
}

function normalizeAgreementLoose(value) {
  return normalizeAgreement(value)
    .replace(/O/g, "0")
    .replace(/I/g, "1")
    .replace(/L/g, "1");
}

function agreementMatches(first, second) {
  const left = normalizeAgreement(first);
  const right = normalizeAgreement(second);
  const looseLeft = normalizeAgreementLoose(first);
  const looseRight = normalizeAgreementLoose(second);
  if (!left || !right) return false;
  if (left === right) return true;
  if (looseLeft === looseRight) return true;
  if (left.length >= 8 && right.length >= 8 && (left.includes(right) || right.includes(left))) return true;
  if (looseLeft.length >= 8 && looseRight.length >= 8 && (looseLeft.includes(looseRight) || looseRight.includes(looseLeft))) return true;
  const leftTail = left.slice(-8);
  const rightTail = right.slice(-8);
  const looseLeftTail = looseLeft.slice(-8);
  const looseRightTail = looseRight.slice(-8);
  return (leftTail.length >= 6 && leftTail === rightTail) ||
    (looseLeftTail.length >= 6 && looseLeftTail === looseRightTail);
}

function isValidAgreementValue(value) {
  const normalized = normalizeAgreement(value);
  return normalized.length >= 6 && /\d/.test(normalized);
}

function sanitizePdfRowForMerge(row) {
  const scheduleParsed = row.scheduleParsed === "yes";
  const blockedWithoutSchedule = new Set(["loanAmount", "emiAmount", "tenure", "paidEmi", "interestRate", "emiStart", "emiEnd", "bankClosingPrincipal"]);
  return Object.fromEntries(Object.entries(row).filter(([key, value]) => {
    if (!value) return false;
    if (blockedWithoutSchedule.has(key) && !scheduleParsed) return false;
    return true;
  }));
}

function formText(form, name) {
  return form.get(name)?.toString().trim() ?? "";
}

function mapManualVehicleForm(form) {
  return {
    srNo: formText(form, "srNo"),
    regNo: formText(form, "regNo"),
    owner: formText(form, "owner"),
    manufacturer: formText(form, "manufacturer"),
    model: formText(form, "model"),
    yearOfMfg: formText(form, "yearOfMfg"),
    regDate: formText(form, "regDate"),
    financeStatus: formText(form, "financeStatus"),
    financier: formText(form, "financier"),
    loanAccount: formText(form, "loanAccount"),
    loanAmount: formText(form, "loanAmount"),
    emiAmount: formText(form, "emiAmount"),
    interestRate: formText(form, "interestRate"),
    tenure: formText(form, "tenure"),
    paidEmi: formText(form, "paidEmi"),
    emiStart: formText(form, "emiStart"),
    emiEnd: formText(form, "emiEnd"),
    closingPrincipal: formText(form, "closingPrincipal"),
    policyCompany: formText(form, "policyCompany"),
    policyNo: formText(form, "policyNo"),
    policyStart: formText(form, "policyStart"),
    policyEnd: formText(form, "policyEnd"),
    pucNo: formText(form, "pucNo"),
    pucExpired: formText(form, "pucExpired"),
    fitnessExpired: formText(form, "fitnessExpired"),
    permitNo: formText(form, "permitNo"),
    permitIssue: formText(form, "permitIssue"),
    permitExpired: formText(form, "permitExpired"),
    permitType: formText(form, "permitType"),
    nationalPermitExpired: formText(form, "nationalPermitExpired"),
    remarks: formText(form, "remarks")
  };
}

function isBodyRegNo(value) {
  return /\bbody\b/i.test(String(value ?? ""));
}

function isBodyRow(row) {
  return isBodyRegNo(row?.regNo);
}

function baseRegNo(value) {
  return String(value ?? "").replace(/\s+body\b/i, "").trim();
}

function excelRowToVehicle(row, clientId, id) {
  return {
    id,
    clientId,
    type: "Truck",
    regNo: baseRegNo(row.regNo),
    make: row.manufacturer || "Imported",
    model: row.model || "Vehicle",
    year: Number(String(row.yearOfMfg || "").match(/\d{4}/)?.[0]) || new Date().getFullYear(),
    km: 0,
    principal: autoClosingPrincipal(row) || toNumber(row.loanAmount),
    overdue: 0,
    penalty: 0,
    foreclosure: 0,
    insuranceExpiry: row.policyEnd || "-",
    permitExpiry: row.permitExpired || row.nationalPermitExpired || "-",
    status: "Active"
  };
}

function excelRowToDueTask(row, clientId, vehicleId, id) {
  return {
    id,
    clientId,
    vehicleId,
    type: "EMI",
    amount: toNumber(row.emiAmount),
    dueDate: row.emiStart || new Date().toISOString().slice(0, 10),
    status: "Due",
    callerId: "",
    priority: "Medium"
  };
}

async function parseClientExcelFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const table = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
  const [headers, ...bodyRows] = table.map((row) => Array.isArray(row) ? row : []);
  if (!headers?.some((header) => String(header).toLowerCase().includes("regt"))) {
    throw new Error("Excel format did not match. Please upload a vehicle sheet with a Regt. No. column.");
  }
  return bodyRows
    .map((row) => mapClientExcelRow(row))
    .filter((row) => row.regNo || row.loanAccount || row.policyNo);
}

function mapClientExcelRow(row) {
  const dateColumns = new Set([6, 14, 15, 19, 20, 22, 23, 25, 26, 28]);
  const value = (index) => {
    const raw = row[index] ?? "";
    if (dateColumns.has(index)) return formatExcelDate(raw);
    return String(raw).trim();
  };
  return {
    srNo: value(0),
    regNo: value(1),
    owner: value(2),
    manufacturer: value(3),
    model: value(4),
    yearOfMfg: value(5),
    regDate: value(6),
    financeStatus: value(7),
    financier: value(8),
    loanAccount: value(9),
    loanAmount: value(10),
    emiAmount: value(11),
    tenure: value(12),
    paidEmi: value(13),
    emiStart: value(14),
    emiEnd: value(15),
    closingPrincipal: value(16),
    policyCompany: value(17),
    policyNo: value(18),
    policyStart: value(19),
    policyEnd: value(20),
    pucNo: value(21),
    pucExpired: value(22),
    fitnessExpired: value(23),
    permitNo: value(24),
    permitIssue: value(25),
    permitExpired: value(26),
    permitType: value(27),
    nationalPermitExpired: value(28),
    remarks: value(29)
  };
}

function formatExcelDate(value) {
  const text = String(value ?? "").trim();
  const serial = Number(text);
  if (!text) return "";
  if (!Number.isFinite(serial) || serial < 25000) return formatDisplayDate(text);
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return formatDisplayDate(date.toISOString().slice(0, 10));
}

async function extractPdfTextWithOcr(file) {
  const text = normalizePdfText(`${await extractPdfJsLayoutText(file)}\n${await extractPdfText(file)}`);
  const parsed = parseBankPdfText(text);
  if (parsed.loanAccount && hasPdfFinanceValues(parsed)) return text;
  try {
    const ocrText = await ocrPdfPages(file);
    return normalizePdfText(`${ocrText}\n${text}`);
  } catch {
    return text;
  }
}

function hasPdfFinanceValues(row) {
  return toNumber(row.emiAmount) > 0 &&
    toNumber(row.tenure) > 0 &&
    String(row.paidEmi ?? "").trim() !== "" &&
    toNumber(row.bankClosingPrincipal) > 0;
}

async function extractPdfText(file) {
  const buffer = await file.arrayBuffer();
  const raw = new TextDecoder("latin1").decode(buffer);
  const compressedText = await extractCompressedPdfText(raw);
  const literalText = extractPdfOperatorText(`${compressedText} ${raw}`);
  const hexText = [...`${compressedText} ${raw}`.matchAll(/<([0-9a-fA-F\s]{6,})>/g)]
    .map((match) => decodePdfHex(match[1]))
    .join(" ");
  const extractedText = normalizePdfText(`${compressedText} ${literalText} ${hexText}`);
  return extractedText || normalizePdfText(raw);
}

async function extractPdfJsLayoutText(file) {
  try {
    const buffer = await file.arrayBuffer();
    const pdfDocument = await pdfjsLib.getDocument({ data: buffer }).promise;
    const lines = [];
    const pageCount = pdfDocument.numPages;
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items
        .map((item) => ({
          text: String(item.str ?? "").trim(),
          x: item.transform?.[4] ?? 0,
          y: item.transform?.[5] ?? 0
        }))
        .filter((item) => item.text);
      const rows = [];
      items.sort((a, b) => b.y - a.y || a.x - b.x).forEach((item) => {
        const row = rows.find((entry) => Math.abs(entry.y - item.y) < 4);
        if (row) {
          row.items.push(item);
          row.y = (row.y + item.y) / 2;
        } else {
          rows.push({ y: item.y, items: [item] });
        }
      });
      rows.forEach((row) => {
        lines.push(row.items.sort((a, b) => a.x - b.x).map((item) => item.text).join(" "));
      });
    }
    return lines.join("\n");
  } catch {
    return "";
  }
}

async function ocrPdfPages(file) {
  const buffer = await file.arrayBuffer();
  const pdfDocument = await pdfjsLib.getDocument({ data: buffer }).promise;
  const worker = await createWorker("eng");
  await worker.setParameters({
    preserve_interword_spaces: "1",
    tessedit_pageseg_mode: "6"
  });
  const pageCount = pdfDocument.numPages;
  const texts = [];
  try {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 4.5 });
      const canvas = window.document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: context, viewport }).promise;
      const cleanCanvas = cloneCanvas(canvas);
      sharpenCanvasForOcr(canvas);
      await worker.setParameters({ tessedit_pageseg_mode: "6" });
      const { data } = await worker.recognize(canvas);
      await worker.setParameters({ tessedit_pageseg_mode: "11" });
      const { data: sparseData } = await worker.recognize(cleanCanvas);
      texts.push(data.text, sparseData.text);
    }
  } finally {
    await worker.terminate();
  }
  return normalizePdfText(texts.join("\n"));
}

function cloneCanvas(canvas) {
  const clone = window.document.createElement("canvas");
  clone.width = canvas.width;
  clone.height = canvas.height;
  clone.getContext("2d", { willReadFrequently: true }).drawImage(canvas, 0, 0);
  return clone;
}

function sharpenCanvasForOcr(canvas) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < image.data.length; index += 4) {
    const gray = image.data[index] * 0.299 + image.data[index + 1] * 0.587 + image.data[index + 2] * 0.114;
    const value = gray > 185 ? 255 : 0;
    image.data[index] = value;
    image.data[index + 1] = value;
    image.data[index + 2] = value;
  }
  context.putImageData(image, 0, 0);
}

async function extractCompressedPdfText(raw) {
  if (typeof DecompressionStream === "undefined") return "";
  const streams = [...raw.matchAll(/\/FlateDecode[\s\S]{0,900}?stream\r?\n?([\s\S]*?)\r?\n?endstream/g)];
  const decoded = await Promise.all(streams.map(async (match) => {
    try {
      const bytes = Uint8Array.from(match[1], (char) => char.charCodeAt(0) & 255);
      const inflated = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"))).arrayBuffer();
      return new TextDecoder("latin1").decode(inflated);
    } catch {
      return "";
    }
  }));
  return decoded.join(" ");
}

function extractPdfOperatorText(raw) {
  return [...raw.matchAll(/\((?:\\.|[^\\)])*\)/g)]
    .map((match) => decodePdfLiteral(match[0].slice(1, -1)))
    .join(" ");
}

function decodePdfLiteral(value) {
  return value
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\\([()\\])/g, "$1")
    .replace(/\\\d{1,3}/g, " ");
}

function decodePdfHex(value) {
  const clean = value.replace(/\s+/g, "");
  const bytes = clean.match(/.{1,2}/g)?.map((part) => parseInt(part, 16)).filter((byte) => Number.isFinite(byte)) ?? [];
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return String.fromCharCode(...bytes.slice(2).reduce((chars, byte, index, source) => {
      if (index % 2 === 0) chars.push((byte << 8) + (source[index + 1] ?? 0));
      return chars;
    }, []));
  }
  return String.fromCharCode(...bytes);
}

function normalizePdfText(value) {
  return String(value ?? "")
    .replace(/[ \t]+/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseBankPdfText(text) {
  const agreement = findPdfAgreement(text) || findAgreementFallback(text);
  const regNo = findPdfRegistration(text);
  const scheduleValues = findScheduleTableValues(text);
  const ashokLeylandSummaryValues = Object.keys(scheduleValues).length > 0 ? {} : findAshokLeylandSummaryValues(text);
  const tableValues = Object.keys(scheduleValues).length > 0 ? scheduleValues :
    Object.keys(ashokLeylandSummaryValues).length > 0 ? ashokLeylandSummaryValues :
      findFinanceTableValues(text);
  const exactLoanAmount = findPdfExactAmount(text, ["Loan Amount", "Financed Amount", "Total Loan Sanctioned", "Total Loan Disbursed", "Amount Financed"]);
  const indostarEmiAmount = isIndostarScheduleFormat(text) ? findIndostarEmiAmount(text) : "";
  const preferScheduleAmounts = isInstlOutstandingScheduleFormat(text) && scheduleValues.scheduleParsed === "yes";
  return {
    owner: findPdfValue(text, ["Customer Name", "Borrower Name", "Applicant Name", "Client Name", "Customer", "Client", "Name"]),
    financeStatus: agreement ? "FIN" : "",
    loanAccount: agreement,
    regNo,
    financier: findPdfFinancier(text),
    manufacturer: findPdfValue(text, ["Manufacturer", "Make", "Asset Make", "Vehicle Make"]),
    model: findPdfValue(text, ["Asset Model", "Vehicle Model", "Model"]),
    loanAmount: preferScheduleAmounts ? tableValues.loanAmount : exactLoanAmount || tableValues.loanAmount || findPdfAmount(text, ["Loan Amount", "Finance Amount", "Financed Amount", "Sanctioned Amount", "Total Loan Sanctioned", "Total Loan Disbursed", "Amount Financed", "Amount Financed Rs", "Disbursal Amount", "Principal Amount"], { positive: true, min: 1000 }),
    emiAmount: tableValues.emiAmount || indostarEmiAmount || findPdfAmount(text, ["EMI Amount", "Installment Amount", "Instalment Amount", "Monthly Installment", "Monthly Instalment", "Repayment Amount", "EMI"], { positive: true, min: 100 }),
    tenure: tableValues.tenure || findPdfValue(text, ["Tenure(In Months)", "Tenure In Months", "Tenure", "Period in Months", "Total Installment", "No of Installments", "No. of Installments", "No of Instalments", "No. of Instalments", "Number of EMIs"]),
    paidEmi: tableValues.paidEmi || findPdfValue(text, ["Paid EMI", "EMI Paid", "Installments Paid", "Instalments Paid", "No of EMI Paid", "No. of EMI Paid"]),
    interestRate: tableValues.interestRate || findPdfRate(text),
    emiStart: tableValues.emiStart || findPdfDate(text, ["EMI Start Date", "Installment Start Date", "Instalment Start Date", "First EMI Date", "First Instalment date", "First Installment date"]),
    emiEnd: tableValues.emiEnd || findPdfDate(text, ["EMI End Date", "Maturity Date", "Last EMI Date", "Last Instalment date", "Last Installment date"]),
    bankClosingPrincipal: preferScheduleAmounts ? tableValues.bankClosingPrincipal : tableValues.bankClosingPrincipal || findPdfAmount(text, ["Closing Principal", "Principal Outstanding", "Outstanding Principal", "Current POS", "POS", "Foreclosure Amount", "Foreclosure Value", "Closure Amount", "Amount to be paid", "Payable Amount"], { positive: true, min: 1000 }),
    scheduleParsed: scheduleValues.scheduleParsed ? "yes" : "",
    remarks: "Imported from bank PDF"
  };
}

function findPdfRegistration(text) {
  const labelledReg = String(text ?? "").match(/\b(?:Registration\s*Number|Registration\s*No|Regn\s*Number|Regn\s*No|Vehicle\s*Number|Vehicle\s*No|Vehicle\s*Reg\s*No)\s*[:\-]?\s*([A-Z]{2}\s*\d{1,2}\s*[A-Z]{1,3}\s*[- ]?\s*\d{3,4})/i);
  if (labelledReg) return labelledReg[1].replace(/\s*-\s*/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
  const looseReg = String(text ?? "").match(/\b([A-Z]{2}\s*\d{1,2}\s*[A-Z]{1,3}\s*[- ]?\s*\d{3,4})\b/i);
  return looseReg ? looseReg[1].replace(/\s*-\s*/g, " ").replace(/\s+/g, " ").trim().toUpperCase() : "";
}

function findPdfAgreement(text) {
  return findPdfValue(text, ["Agreement Number", "AgreementNumber", "Agreement No", "AgreementNo", "Contract Number", "Contract No", "ContractNo", "Contract", "Repayment Schedule For", "Account Number", "Account No", "AccountNo", "Loan Account Number", "LoanAccountNumber", "LAN", "Loan No", "LoanNo"], { requireDigit: true, minLength: 6 });
}

function findPdfFinancier(text) {
  const upperText = String(text ?? "").toUpperCase();
  const financierAliases = [
    { pattern: /\bASHOK\s+LEYLAND\b/i, name: "ASHOK LEYLAND" },
    { pattern: /\b(?:INDUS\s*IND|INDUSIND|INDU[S5]IND|INDU\s*HAND|INUHAND|INDUHAND)\b/i, name: "INDUSIND BANK" }
  ];
  const aliasMatch = financierAliases.find((item) => item.pattern.test(upperText));
  if (aliasMatch) return aliasMatch.name;

  const knownFinanciers = [
    "BAJAJ FINANCE",
    "MAHINDRA AND MAHINDRA FINANCIAL SERVICES LIMITED",
    "MAHINDRA FINANCE",
    "POONAWALLA FINCORP LTD",
    "POONAWALLA FINCORP LIMITED",
    "POONAWALLA FINCORP",
    "KOTYARK INDUSTRIES LIMITED",
    "SUNDARAM FINANCE",
    "BANK OF BARODA",
    "BANDHAN BANK",
    "TATA MOTORS FINANCE SOLUTIONS LTD",
    "TATA MOTORS FINANCE SOLUTIONS",
    "TATA MOTORS FINANCE",
    "TATA CAPITAL",
    "AXIS BANK",
    "AXIS FINANCE",
    "HDFC BANK",
    "HDB FINANCIAL",
    "ICICI BANK",
    "ICICI LOMBARD",
    "KOTAK MAHINDRA",
    "CHOLAMANDALAM",
    "MAHINDRA FINANCE",
    "INDUSIND BANK",
    "YES BANK",
    "AU SMALL FINANCE",
    "SHRIRAM FINANCE"
  ];
  const knownMatch = knownFinanciers.find((name) => upperText.includes(name));
  if (knownMatch) return knownMatch;

  const headerCompanyMatch = String(text ?? "").match(/^\s*([A-Z][A-Za-z .&-]{4,80}(?:Limited|Ltd|Finance|Fincorp|Bank))\s*(?:\n|Note\b|!)/im);
  if (headerCompanyMatch) return headerCompanyMatch[1].replace(/\s+/g, " ").trim().toUpperCase();

  const bankLineMatch = String(text ?? "").match(/\bBank\s*:\s*\d{1,8}\s+([A-Za-z][A-Za-z .&-]{2,60}?)(?=\s{2,}|\n|Branch\b|$)/i);
  if (bankLineMatch) return bankLineMatch[1].replace(/\s+/g, " ").trim().toUpperCase();

  const labelled = findPdfValue(text, [
    "Financier's Name",
    "Financier Name",
    "Lender Name",
    "Financier",
    "Name of Financier",
    "Finance Company",
    "NBFC Name"
  ], { minLength: 3 });
  if (labelled && !/^(bank|name|n\/?a|na)$/i.test(labelled)) return labelled;
  return "";
}

function findProfileAgreementInText(text, rows) {
  const normalizedText = normalizeAgreement(text);
  const looseText = normalizeAgreementLoose(text);
  return (rows ?? [])
    .map((row) => row.loanAccount)
    .filter(Boolean)
    .find((loanAccount) => {
      const exact = normalizeAgreement(loanAccount);
      const loose = normalizeAgreementLoose(loanAccount);
      if (!exact || exact.length < 6) return false;
      return normalizedText.includes(exact) ||
        looseText.includes(loose) ||
        (exact.length >= 8 && normalizedText.includes(exact.slice(-8))) ||
        (loose.length >= 8 && looseText.includes(loose.slice(-8)));
    }) ?? "";
}

function findFinanceTableValues(text) {
  if (isIndostarScheduleFormat(text)) return {};
  const lines = String(text ?? "")
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  for (let index = 0; index < lines.length; index += 1) {
    const header = lines[index];
    const normalizedHeader = header.toLowerCase();
    const hasEmi = /\bemi\b/.test(normalizedHeader);
    const hasTenure = /tenure/.test(normalizedHeader);
    const hasPaid = /paid\s*emi|emi\s*paid|paid/.test(normalizedHeader);
    const hasClosing = /closing|principal|outstanding|foreclosure|pos/.test(normalizedHeader);
    if (!(hasEmi && hasTenure && hasPaid && hasClosing)) continue;

    const scan = [
      header,
      lines[index + 1],
      lines[index + 2],
      `${header} ${lines[index + 1] ?? ""}`
    ].filter(Boolean);
    for (const line of scan) {
      const values = extractMoneyLikeNumbers(line).filter((value) => toNumber(value) > 0);
      if (values.length >= 4) {
        return {
          emiAmount: values[0],
          tenure: values[1],
          paidEmi: values[2],
          bankClosingPrincipal: values[3]
        };
      }
    }
    const nearby = extractMoneyLikeNumbers([lines[index + 1], lines[index + 2], lines[index + 3]].filter(Boolean).join(" ")).filter((value) => toNumber(value) > 0);
    if (nearby.length >= 4) {
      return {
        emiAmount: nearby[0],
        tenure: nearby[1],
        paidEmi: nearby[2],
        bankClosingPrincipal: nearby[3]
      };
    }
  }
  return {};
}

function findScheduleTableValues(text) {
  const bajajRows = parseBajajScheduleRows(text);
  if (bajajRows.length > 0) return summarizeScheduleRows(bajajRows, text);
  const mahindraRows = parseMahindraScheduleRows(text);
  if (mahindraRows.length > 0) return summarizeScheduleRows(mahindraRows, text);
  const openingBalanceRows = parseOpeningBalanceScheduleRows(text);
  if (openingBalanceRows.length > 0) return summarizeScheduleRows(openingBalanceRows, text);
  const sundaramRows = parseSundaramScheduleRows(text);
  if (sundaramRows.length > 0) return summarizeScheduleRows(sundaramRows, text);
  const ashokLeylandRows = parseAshokLeylandScheduleRows(text);
  if (ashokLeylandRows.length > 0) return summarizeScheduleRows(ashokLeylandRows, text);
  const instlOutstandingRows = parseInstlOutstandingScheduleRows(text);
  if (instlOutstandingRows.length > 0) return summarizeScheduleRows(instlOutstandingRows, text);
  const bankNameRows = parseBankNameScheduleRows(text);
  if (bankNameRows.length > 0) return summarizeScheduleRows(bankNameRows, text);
  if (isIndostarScheduleFormat(text)) return {};
  const accountRows = parseAccountStatementScheduleRows(text);
  if (accountRows.length > 0) return summarizeScheduleRows(accountRows, text);
  const lineRows = String(text ?? "")
    .split(/\n+/)
    .map(parseScheduleLine)
    .filter(Boolean);
  const flatRows = parseFlattenedScheduleRows(text);
  const rows = lineRows.length >= flatRows.length ? lineRows : flatRows;
  if (rows.length === 0) return {};
  return summarizeScheduleRows(rows, text);
}

function parseBajajScheduleRows(text) {
  const normalized = normalizeWrappedPdfNumbers(String(text ?? "").replace(/\s+/g, " "));
  if (!/BAJAJ\s+FINANCE/i.test(normalized) && !/Agreement\s+No/i.test(normalized)) return [];
  if (!/Opening\s+Principal/i.test(normalized) || !/Instl\.?\s*Amt/i.test(normalized) || !/Closing\s+Principal/i.test(normalized)) return [];
  const rowStartPattern = /(?:^|\s)(D|B\d+|\d{1,3})\s+(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})(?=\s)/gi;
  const starts = [...normalized.matchAll(rowStartPattern)];
  return starts.map((match, index) => {
    const installmentLabel = match[1].toUpperCase();
    const rowStart = match.index + match[0].length;
    const rowEnd = starts[index + 1]?.index ?? normalized.length;
    const segment = normalized.slice(rowStart, rowEnd);
    const values = extractSignedMoneyLikeNumbers(segment);
    if (!/^\d+$/.test(installmentLabel) || values.length < 6) return null;
    const openingPrincipal = values[0];
    const installmentAmount = values[1];
    const principalPaid = values[2];
    const interest = values[3];
    const closingPrincipal = values[5];
    const rate = values.find((value) => toNumber(value) > 0 && toNumber(value) <= 40) || "";
    return makeScheduleRow({
      installment: installmentLabel,
      dueDate: match[2],
      openingPrincipal,
      installmentAmount,
      principalPaid,
      interest,
      closingPrincipal,
      rate
    });
  }).filter((row) => row?.installment > 0 && toNumber(row.installmentAmount) > 0 && toNumber(row.closingPrincipal) > 0);
}

function normalizeWrappedPdfNumbers(value) {
  return String(value ?? "")
    .replace(/(\d{1,3}(?:,\d{2,3})*)\s+(\d{1,2}\.00)\b/g, "$1$2")
    .replace(/(\d+)\s*,\s*(\d+)/g, "$1,$2");
}

function parseMahindraScheduleRows(text) {
  const normalized = String(text ?? "").replace(/\s+/g, " ");
  if (!/MAHINDRA\s+AND\s+MAHINDRA\s+FINANCIAL\s+SERVICES/i.test(normalized)) return [];
  if (!/INSTAL\.?\s*AMT/i.test(normalized) || !/PRINCIPAL\.?\s*O\/?S/i.test(normalized)) return [];
  const rowStartPattern = /(?:^|\s)(\d{1,3})\s+(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})(?=\s)/g;
  const starts = [...normalized.matchAll(rowStartPattern)];
  return starts.map((match, index) => {
    const rowStart = match.index + match[0].length;
    const rowEnd = starts[index + 1]?.index ?? normalized.length;
    const values = extractSignedMoneyLikeNumbers(normalized.slice(rowStart, rowEnd));
    if (values.length < 5) return null;
    const [installmentAmount, principalPaid, income, unmaturedIncome, closingPrincipal] = values.slice(-5);
    const openingPrincipal = String(toNumber(closingPrincipal) + toNumber(principalPaid));
    return makeScheduleRow({
      installment: match[1],
      dueDate: match[2],
      openingPrincipal,
      installmentAmount,
      principalPaid,
      interest: income,
      serviceTax: unmaturedIncome,
      closingPrincipal,
      rate: deriveAnnualRate(income, openingPrincipal)
    });
  }).filter((row) => row?.installment > 0 && toNumber(row.installmentAmount) > 0 && toNumber(row.closingPrincipal) > 0);
}

function parseOpeningBalanceScheduleRows(text) {
  const normalized = String(text ?? "").replace(/\s+/g, " ");
  if (!/Opening\s+Balance/i.test(normalized) || !/Effective\s+Rate/i.test(normalized)) return [];
  const rowStartPattern = /(?:^|\s)(\d{1,3})\s+(\d{1,2}[-\s][A-Za-z]{3,}[-\s]\d{2,4}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4})(?=\s)/g;
  const starts = [...normalized.matchAll(rowStartPattern)];
  const rawRows = starts.map((match, index) => {
    const rowStart = match.index + match[0].length;
    const rowEnd = starts[index + 1]?.index ?? normalized.length;
    const values = extractSignedMoneyLikeNumbers(normalized.slice(rowStart, rowEnd));
    if (values.length < 4) return null;
    const [openingPrincipal, installmentAmount, principalPaid, interest] = values;
    const rate = values.find((value) => toNumber(value) > 0 && toNumber(value) <= 40) || "";
    return {
      installment: match[1],
      dueDate: match[2],
      openingPrincipal,
      installmentAmount,
      principalPaid,
      interest,
      rate
    };
  }).filter((row) => row?.installment > 0 && toNumber(row.installmentAmount) > 0 && toNumber(row.openingPrincipal) > 0);
  return rawRows.map((row, index) => makeScheduleRow({
    ...row,
    closingPrincipal: rawRows[index + 1]?.openingPrincipal || String(toNumber(row.openingPrincipal) - toNumber(row.principalPaid))
  }));
}

function parseSundaramScheduleRows(text) {
  const rawText = String(text ?? "");
  const normalized = rawText.replace(/\s+/g, " ");
  if (!/SUNDARAM\s+FINANCE/i.test(normalized) && !/Details\s+of\s+Interest\s+and\s+Principal\s+Breakup/i.test(normalized)) return [];
  if (!/Due\s+Amount/i.test(normalized) || !/Loan\s+O\/?S/i.test(normalized)) return [];
  const lineRows = rawText
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .map((line) => {
      const match = line.match(/^(\d{1,3})\s+(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s+(.+)$/);
      if (!match) return null;
      const values = extractSignedMoneyLikeNumbers(match[3]);
      if (values.length < 5) return null;
      const [installmentAmount, principalPaid, interest, insurance, closingPrincipal] = values.slice(-5);
      const openingPrincipal = String(toNumber(closingPrincipal) + toNumber(principalPaid));
      return makeScheduleRow({
        installment: match[1],
        dueDate: match[2],
        openingPrincipal,
        installmentAmount,
        principalPaid,
        interest,
        serviceTax: insurance,
        closingPrincipal,
        rate: deriveAnnualRate(interest, openingPrincipal)
      });
    })
    .filter((row) => row?.installment > 0 && toNumber(row.installmentAmount) > 0 && toNumber(row.closingPrincipal) > 0);
  if (lineRows.length > 0) return lineRows;

  const rowStartPattern = /(?:^|\s)(\d{1,3})\s+(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})(?=\s)/g;
  const starts = [...normalized.matchAll(rowStartPattern)];
  return starts.map((match, index) => {
    const rowStart = match.index + match[0].length;
    const rowEnd = starts[index + 1]?.index ?? normalized.length;
    const values = extractSignedMoneyLikeNumbers(normalized.slice(rowStart, rowEnd));
    if (values.length < 5) return null;
    const [installmentAmount, principalPaid, interest, insurance, closingPrincipal] = values.slice(-5);
    const openingPrincipal = String(toNumber(closingPrincipal) + toNumber(principalPaid));
    return makeScheduleRow({
      installment: match[1],
      dueDate: match[2],
      openingPrincipal,
      installmentAmount,
      principalPaid,
      interest,
      serviceTax: insurance,
      closingPrincipal,
      rate: deriveAnnualRate(interest, openingPrincipal)
    });
  }).filter((row) => row?.installment > 0 && toNumber(row.installmentAmount) > 0 && toNumber(row.closingPrincipal) > 0);
}

function parseAshokLeylandScheduleRows(text) {
  const rawText = String(text ?? "");
  const normalized = collapseAdjacentDuplicateTokens(rawText.replace(/\s+/g, " "));
  if (!isAshokLeylandScheduleFormat(normalized)) return [];

  const lineRows = rawText
    .split(/\n+/)
    .map((line) => collapseAdjacentDuplicateTokens(line.replace(/\s+/g, " ").trim()))
    .map(parseAshokLeylandScheduleLine)
    .filter(Boolean);
  if (lineRows.length > 0) return lineRows;

  const strictRows = parseAshokLeylandStrictRows(normalized);
  if (strictRows.length > 0) return strictRows;

  const rowStartPattern = /(?:^|\s)(\d{1,3})\s+(?:(?:P?E?M?I|P\s*EMI|EM1|FMI)\s+)?(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s+(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})(?=\s)/gi;
  const starts = [...normalized.matchAll(rowStartPattern)];
  return starts
    .map((match, index) => {
      const rowStart = match.index + match[0].length;
      const rowEnd = starts[index + 1]?.index ?? normalized.length;
      return parseAshokLeylandScheduleValues(match[1], match[3], normalized.slice(rowStart, rowEnd));
    })
    .filter(Boolean);
}

function parseAshokLeylandScheduleLine(line) {
  const match = String(line ?? "").match(/^(\d{1,3})\s+(?:(?:P?E?M?I|P\s*EMI|EM1|FMI)\s+)?\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\s+(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s+(.+)$/i);
  if (!match) return null;
  return parseAshokLeylandScheduleValues(match[1], match[2], match[3]);
}

function parseAshokLeylandStrictRows(text) {
  const rowPattern = /(?:^|\s)(\d{1,3})\s+(?:(?:P?E?M?I|P\s*EMI|EM1|FMI)\s+)?\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\s+(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s+(\d{2,4}(?:\.\d{1,4})?)\s+(\d[\d,]*(?:\.\d{1,2})?)\s+(\d[\d,]*(?:\.\d{1,2})?)\s+(\d[\d,]*(?:\.\d{1,2})?)\s+(\d[\d,]*(?:\.\d{1,2})?)(?:\s+\d{1,3})?(?=\s|$)/gi;
  return [...String(text ?? "").matchAll(rowPattern)]
    .map((match) => parseAshokLeylandScheduleValues(match[1], match[2], match.slice(3).join(" ")))
    .filter(Boolean);
}

function parseAshokLeylandScheduleValues(installment, dueDate, valueText) {
  const values = extractSignedMoneyLikeNumbers(valueText);
  if (values.length < 5) return null;
  const [rawRate, rawPrincipalPaid, rawInterest, rawInstallmentAmount, rawClosingPrincipal] = values.slice(0, 5);
  const rate = normalizeAshokRate(rawRate);
  const principalPaid = normalizeAshokAmount(rawPrincipalPaid);
  const interest = normalizeAshokAmount(rawInterest);
  const installmentAmount = normalizeAshokAmount(rawInstallmentAmount);
  const closingPrincipal = normalizeAshokAmount(rawClosingPrincipal);
  const rateValue = toNumber(rate);
  const emiBreakupDiff = Math.abs(toNumber(installmentAmount) - toNumber(principalPaid) - toNumber(interest));
  const allowedDiff = Math.max(5, toNumber(installmentAmount) * 0.05);
  if (
    rateValue <= 0 ||
    rateValue > 40 ||
    toNumber(principalPaid) <= 0 ||
    toNumber(interest) <= 0 ||
    toNumber(installmentAmount) <= 0 ||
    toNumber(closingPrincipal) <= 0 ||
    emiBreakupDiff > allowedDiff
  ) {
    return null;
  }
  const openingPrincipal = String(toNumber(closingPrincipal) + toNumber(principalPaid));
  return makeScheduleRow({
    installment,
    dueDate,
    openingPrincipal,
    installmentAmount,
    principalPaid,
    interest,
    closingPrincipal,
    rate
  });
}

function normalizeAshokRate(value) {
  const clean = String(value ?? "").replace(/[^\d.]/g, "");
  const number = Number(clean);
  if (Number.isFinite(number) && number > 0 && number <= 40) return clean;
  if (/^\d{3,4}$/.test(clean)) {
    const scaled = Number(clean) / 100;
    if (scaled > 0 && scaled <= 40) return scaled.toFixed(2);
  }
  return clean;
}

function normalizeAshokAmount(value) {
  const clean = String(value ?? "").replace(/[^\d.]/g, "");
  if (!clean) return "";
  if (clean.includes(".")) return clean;
  return clean;
}

function isAshokLeylandScheduleFormat(text) {
  const normalized = String(text ?? "").replace(/\s+/g, " ");
  const hasAshokBrand = /ASHOK\s*LEYLAND|ASHOKLEYLAND/i.test(normalized);
  const hasScheduleTitle = /AMORTI[ZS]ATION|REPAYMENT\s+SCHEDULE|TENTATIVE\s+LOAN\s+REPAYMENT/i.test(normalized);
  const hasExactHeaders = /Instal(?:l)?ment\s+Number|Inst\s*No/i.test(normalized) &&
    /Start\s+Date/i.test(normalized) &&
    /Repayment\s+Date/i.test(normalized) &&
    /Interest\s+Rate|Rate\s*\(?%?\)?/i.test(normalized) &&
    /Total\s+Instal(?:l)?ment|Instal(?:l)?ment\s+Amount/i.test(normalized) &&
    /Outstanding\s+Balance|Outstanding\s+Principal/i.test(normalized);
  const hasAshokRows = /\b\d{1,3}\s+(?:(?:P?E?M?I|P\s*EMI|EM1|FMI)\s+)?\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\s+\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\s+\d{2,4}(?:\.\d{1,4})?\s+\d[\d,]*(?:\.\d{1,2})?\s+\d[\d,]*(?:\.\d{1,2})?\s+\d[\d,]*(?:\.\d{1,2})?\s+\d[\d,]*(?:\.\d{1,2})?/i.test(normalized);
  return (hasAshokBrand || hasScheduleTitle || hasExactHeaders) && hasAshokRows;
}

function findAshokLeylandSummaryValues(text) {
  const normalized = String(text ?? "").replace(/\s+/g, " ");
  if (!/ASHOK\s*LEYLAND|ASHOKLEYLAND|Repayment\s+Schedule|Total\s+Loan\s+Sanctioned/i.test(normalized)) return {};
  const values = {
    loanAmount: findPdfAmount(text, ["Total Loan Sanctioned", "Total Loan Disbursed"], { positive: true, min: 1000 }),
    tenure: findPdfValue(text, ["Period in Months"], { requireDigit: true, minLength: 1 }),
    interestRate: findPdfRate(text) || findPdfValue(text, ["Current Int Rate(%)", "Current Int Rate", "Interest Rate"], { requireDigit: true, minLength: 1 }),
    emiEnd: findPdfDate(text, ["Maturity Date"])
  };
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value));
}

function parseInstlOutstandingScheduleRows(text) {
  const rawText = String(text ?? "");
  const normalized = collapseAdjacentDuplicateTokens(rawText.replace(/\s+/g, " "));
  if (!isInstlOutstandingScheduleFormat(normalized)) return [];

  const columnRows = parseInstlOutstandingColumnRows(normalized);
  if (columnRows.length > 0) return columnRows;

  const lineRows = rawText
    .split(/\n+/)
    .map((line) => collapseAdjacentDuplicateTokens(line.replace(/\s+/g, " ").trim()))
    .map(parseInstlOutstandingLine)
    .filter(Boolean);
  if (lineRows.length > 0) return lineRows;

  const rowStartPattern = /(?:^|\s)(\d{1,3})\s+(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})(?=\s)/g;
  const starts = [...normalized.matchAll(rowStartPattern)];
  const segmentedRows = starts
    .map((match, index) => {
      const rowStart = match.index + match[0].length;
      const rowEnd = starts[index + 1]?.index ?? normalized.length;
      return parseInstlOutstandingValues(match[1], match[2], normalized.slice(rowStart, rowEnd));
    })
    .filter(Boolean);
  if (segmentedRows.length > 0) return segmentedRows;

  return parseInstlOutstandingStrictRows(normalized);
}

function collapseAdjacentDuplicateTokens(value) {
  const tokens = String(value ?? "").split(/\s+/).filter(Boolean);
  const collapsed = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token && token === tokens[index + 1]) {
      collapsed.push(token);
      index += 1;
    } else {
      collapsed.push(token);
    }
  }
  return collapsed.join(" ");
}

function parseInstlOutstandingColumnRows(normalized) {
  const installmentNumbers = extractColumnNumbers(normalized, /Instl\.?\s*No/i, /Due\s*Date/i)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0 && value <= 240);
  const dueDates = extractColumnDates(normalized, /Due\s*Date/i, /Cheque\s*No/i);
  const rowCount = Math.min(installmentNumbers.length, dueDates.length);
  if (rowCount < 3) return [];

  const emiValues = extractColumnMoney(normalized, /\bEMI\b/i, /\bPrincipal\b/i).slice(0, rowCount);
  const principalValues = extractColumnMoney(normalized, /\bPrincipal\b/i, /\bInterest\b/i).slice(0, rowCount);
  const interestValues = extractColumnMoney(normalized, /\bInterest\b/i, /Outstanding\s*Principal/i).slice(0, rowCount);
  const closingValues = extractColumnMoney(normalized, /Outstanding\s*Principal/i).slice(0, rowCount);

  if ([emiValues, principalValues, interestValues, closingValues].some((values) => values.length < rowCount)) return [];
  return Array.from({ length: rowCount }, (_, index) => parseInstlOutstandingValues(
    String(installmentNumbers[index]),
    dueDates[index],
    [emiValues[index], principalValues[index], interestValues[index], closingValues[index]].join(" ")
  )).filter(Boolean);
}

function parseInstlOutstandingLine(line) {
  const match = String(line ?? "").match(/^(\d{1,3})\s+(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s+(.+)$/);
  if (!match) return null;
  return parseInstlOutstandingValues(match[1], match[2], match[3]);
}

function parseInstlOutstandingValues(installment, dueDate, valueText) {
  const values = extractSignedMoneyLikeNumbers(valueText);
  if (values.length < 4) return null;
  const amounts = chooseInstlOutstandingAmounts(values);
  if (!amounts) return null;
  const [installmentAmount, principalPaid, interest, closingPrincipal] = amounts;
  const openingPrincipal = String(toNumber(closingPrincipal) + toNumber(principalPaid));
  return makeScheduleRow({
    installment,
    dueDate,
    openingPrincipal,
    installmentAmount,
    principalPaid,
    interest,
    closingPrincipal,
    rate: deriveAnnualRate(interest, openingPrincipal)
  });
}

function parseInstlOutstandingStrictRows(text) {
  const rowPattern = /(?:^|\s)(\d{1,3})\s+(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s+(?:N\/?A|NIA|NA|-|[A-Z0-9./-]+)\s+(?:N\/?A|NIA|NA|-|[A-Z0-9./-]+)\s+(\d[\d,]*(?:\.\d{1,2})?)\s+(\d[\d,]*(?:\.\d{1,2})?)\s+(\d[\d,]*(?:\.\d{1,2})?)\s+(\d[\d,]*(?:\.\d{1,2})?)(?=\s|$)/gi;
  return [...String(text ?? "").matchAll(rowPattern)]
    .map((match) => parseInstlOutstandingValues(match[1], match[2], match.slice(3).join(" ")))
    .filter(Boolean);
}

function isInstlOutstandingScheduleFormat(text) {
  const normalized = String(text ?? "").replace(/\s+/g, " ");
  return /Instl\.?\s*No/i.test(normalized) &&
    /Cheque\s*No/i.test(normalized) &&
    /Bank\s*Name/i.test(normalized) &&
    /\bEMI\b/i.test(normalized) &&
    /Principal/i.test(normalized) &&
    /Interest/i.test(normalized) &&
    /Outstanding\s*Principal/i.test(normalized);
}

function chooseInstlOutstandingAmounts(values) {
  const cleanedValues = (values ?? []).map((value) => String(value).replace(/,/g, ""));
  for (let index = 0; index <= cleanedValues.length - 4; index += 1) {
    const candidate = cleanedValues.slice(index, index + 4);
    const [installmentAmount, principalPaid, interest, closingPrincipal] = candidate.map(toNumber);
    const emiBreakupDiff = Math.abs(installmentAmount - principalPaid - interest);
    const allowedDiff = Math.max(5, installmentAmount * 0.05);
    if (
      installmentAmount >= 100 &&
      principalPaid > 0 &&
      interest > 0 &&
      (closingPrincipal === 0 || closingPrincipal > principalPaid) &&
      emiBreakupDiff <= allowedDiff
    ) {
      return candidate;
    }
  }
  return null;
}

function extractColumnNumbers(text, startPattern, endPattern) {
  return extractMoneyLikeNumbers(extractColumnText(text, startPattern, endPattern));
}

function extractColumnDates(text, startPattern, endPattern) {
  return [...extractColumnText(text, startPattern, endPattern).matchAll(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g)]
    .map((match) => match[0]);
}

function extractColumnMoney(text, startPattern, endPattern) {
  return extractSignedMoneyLikeNumbers(extractColumnText(text, startPattern, endPattern));
}

function extractColumnText(text, startPattern, endPattern) {
  const source = String(text ?? "");
  const startMatch = source.match(startPattern);
  if (!startMatch) return "";
  const start = (startMatch.index ?? 0) + startMatch[0].length;
  const tail = source.slice(start);
  const endMatch = endPattern ? tail.match(endPattern) : null;
  return endMatch ? tail.slice(0, endMatch.index) : tail;
}

function summarizeScheduleRows(rows, text) {
  const sortedRows = rows.sort((first, second) => first.installment - second.installment);
  const lastRow = sortedRows[sortedRows.length - 1];
  const payableRows = sortedRows.filter((row) => toNumber(row.installmentAmount) > 0);
  const emiCandidates = sortedRows
    .map((row) => row.installmentAmount)
    .filter((value) => toNumber(value) > 0);
  const emiAmount = mostCommonAmount(emiCandidates) || lastRow.installmentAmount;
  const paidRows = payableRows.filter((row) => isScheduleDuePaid(row.dueDate));
  const paidRow = paidRows[paidRows.length - 1];
  const closingPrincipal = chooseScheduleClosingPrincipal(paidRows, emiAmount) || sortedRows[0].openingPrincipal;
  const declaredTenure = findDeclaredTenure(text);
  const dateTenure = findTenureFromPdfDates(text);
  const tenure = declaredTenure || dateTenure || Math.max(payableRows.length || lastRow.installment, paidRows.length);
  const paidEmi = Math.min(paidRows.length, tenure);
  return {
    scheduleParsed: "yes",
    loanAmount: sortedRows[0].openingPrincipal,
    emiAmount,
    tenure: String(tenure),
    paidEmi: String(paidEmi),
    interestRate: paidRow?.rate || lastRow.rate || sortedRows.find((row) => row.rate)?.rate || "",
    emiStart: formatDisplayDate(sortedRows[0].dueDate),
    emiEnd: formatDisplayDate(lastRow.dueDate),
    bankClosingPrincipal: closingPrincipal
  };
}

function chooseScheduleClosingPrincipal(paidRows, emiAmount) {
  if (!paidRows.length) return "";
  const emi = toNumber(emiAmount);
  const lastClosing = toNumber(paidRows[paidRows.length - 1]?.closingPrincipal);
  if (lastClosing > 0 && (emi <= 0 || lastClosing > emi * 1.05 || paidRows.length === 1)) {
    return paidRows[paidRows.length - 1].closingPrincipal;
  }
  const previous = [...paidRows].reverse().find((row) => toNumber(row.closingPrincipal) > emi * 1.05);
  return previous?.closingPrincipal || paidRows[paidRows.length - 1]?.closingPrincipal || "";
}

function findTenureFromPdfDates(text) {
  const start = parseDisplayDate(findPdfDate(text, ["EMI Start Date", "Installment Start Date", "Instalment Start Date", "First EMI Date", "First Instalment date", "First Installment date"]));
  const end = parseDisplayDate(findPdfDate(text, ["EMI End Date", "Maturity Date", "Last EMI Date", "Last Instalment date", "Last Installment date"]));
  if (!start || !end || end < start) return 0;
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  return months > 0 && months <= 240 ? months : 0;
}

function parseAccountStatementScheduleRows(text) {
  const normalized = String(text ?? "").replace(/\s+/g, " ");
  const rowPattern = /(?:^|\s)(\d{1,3})\s+(\d{1,2}[-\s][A-Za-z]{3,}[-\s]\d{2,4})\s+(\d{1,2}[-\s][A-Za-z]{3,}[-\s]\d{2,4})\s+([0-9]+(?:\.[0-9]+)?)\s+\d{1,3}\s+(\d[\d,]*(?:\.\d{1,2})?)\s+(\d[\d,]*(?:\.\d{1,2})?)\s+(\d[\d,]*(?:\.\d{1,2})?)\s+(\d[\d,]*(?:\.\d{1,2})?)\s+(\d[\d,]*(?:\.\d{1,2})?)(?=\s|$)/gi;
  return [...normalized.matchAll(rowPattern)].map((match) => {
    const principalPaid = match[5];
    const interest = match[6];
    const charge = match[7];
    const installmentAmount = match[8];
    const closingPrincipal = match[9];
    const openingPrincipal = String(toNumber(closingPrincipal) + toNumber(principalPaid));
    return makeScheduleRow({
      installment: match[1],
      dueDate: match[3],
      openingPrincipal,
      installmentAmount,
      principalPaid,
      interest,
      serviceTax: charge,
      closingPrincipal,
      rate: match[4]
    });
  }).filter((row) => row.installment > 0 && toNumber(row.closingPrincipal) > 0);
}

function parseBankNameScheduleRows(text) {
  const rawText = String(text ?? "");
  const normalized = rawText.replace(/\s+/g, " ");
  if (!isIndostarScheduleFormat(normalized) && (!/Bank\s*Name/i.test(normalized) || !/(?:Out\s*Stand(?:ing)?|Outstanding)\s*Principal/i.test(normalized))) return [];
  const segmentedRows = parseBankNameSegmentRows(normalized);
  if (segmentedRows.length > 0) return segmentedRows;

  const lineRows = rawText
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .map((line) => {
      const match = line.match(/^(\d{1,3})\s+(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s+(.+)$/);
      if (!match) return null;
      const values = extractSignedMoneyLikeNumbers(match[3]);
      if (values.length < 5) return null;
      const [installmentAmount, principalPaid, interest, mi, closingPrincipal] = values.slice(-5);
      const openingPrincipal = String(toNumber(closingPrincipal) + toNumber(principalPaid));
      return makeScheduleRow({
        installment: match[1],
        dueDate: match[2],
        openingPrincipal,
        installmentAmount,
        principalPaid,
        interest,
        serviceTax: mi,
        closingPrincipal,
        rate: deriveAnnualRate(interest, openingPrincipal)
      });
    })
    .filter((row) => row?.installment > 0 && toNumber(row.installmentAmount) > 0 && toNumber(row.closingPrincipal) > 0);
  if (lineRows.length > 0) return lineRows;

  const rowPattern = /(?:^|\s)(\d{1,3})\s+(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s+(?:[A-Z][A-Z&.-]*\s+){1,8}?(-?\d[\d,]*(?:\.\d{1,2})?)\s+(-?\d[\d,]*(?:\.\d{1,2})?)\s+(-?\d[\d,]*(?:\.\d{1,2})?)\s+(-?\d[\d,]*(?:\.\d{1,2})?)\s+(-?\d[\d,]*(?:\.\d{1,2})?)(?=\s|$)/gi;
  return [...normalized.matchAll(rowPattern)].map((match) => {
    const installmentAmount = match[3];
    const principalPaid = match[4];
    const interest = match[5];
    const mi = match[6];
    const closingPrincipal = match[7];
    const openingPrincipal = String(toNumber(closingPrincipal) + toNumber(principalPaid));
    return makeScheduleRow({
      installment: match[1],
      dueDate: match[2],
      openingPrincipal,
      installmentAmount,
      principalPaid,
      interest,
      serviceTax: mi,
      closingPrincipal,
      rate: deriveAnnualRate(interest, openingPrincipal)
    });
  }).filter((row) => row.installment > 0 && toNumber(row.installmentAmount) > 0 && toNumber(row.closingPrincipal) > 0);
}

function isIndostarScheduleFormat(text) {
  const value = String(text ?? "");
  return /REPAYMENT\s*SCHEDULE\s*FOR\s*AGREEMENT/i.test(value) ||
    /INDOSTAR/i.test(value) ||
    (/Vehicle\s*Number/i.test(value) && /Out\s*Stand(?:ing)?\s*Principal/i.test(value) && /\bEMI\b/i.test(value));
}

function findIndostarEmiAmount(text) {
  const rows = parseBankNameScheduleRows(text);
  const emiAmount = mostCommonAmount(rows.map((row) => row.installmentAmount).filter((value) => toNumber(value) > 0));
  if (emiAmount) return emiAmount;
  const normalized = String(text ?? "").replace(/\s+/g, " ");
  const firstPayableRow = normalized.match(/\b[1-9]\d{0,2}\s+\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\s+(?:[A-Z][A-Z&.-]*\s+){1,8}?(\d[\d,]*(?:\.\d{1,2})?)\s+\d[\d,]*(?:\.\d{1,2})?\s+\d[\d,]*(?:\.\d{1,2})?\s+\d[\d,]*(?:\.\d{1,2})?\s+\d[\d,]*(?:\.\d{1,2})?/i);
  return firstPayableRow?.[1]?.replace(/,/g, "") ?? "";
}

function parseBankNameSegmentRows(normalized) {
  const rowStartPattern = /(?:^|\s)(\d{1,3})\s+(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})(?=\s)/g;
  const starts = [...String(normalized ?? "").matchAll(rowStartPattern)];
  return starts.map((match, index) => {
    const rowStart = match.index + match[0].length;
    const rowEnd = starts[index + 1]?.index ?? normalized.length;
    const values = extractSignedMoneyLikeNumbers(normalized.slice(rowStart, rowEnd));
    if (values.length < 5) return null;
    const [installmentAmount, principalPaid, interest, mi, closingPrincipal] = values.slice(-5);
    const openingPrincipal = String(toNumber(closingPrincipal) + toNumber(principalPaid));
    return makeScheduleRow({
      installment: match[1],
      dueDate: match[2],
      openingPrincipal,
      installmentAmount,
      principalPaid,
      interest,
      serviceTax: mi,
      closingPrincipal,
      rate: deriveAnnualRate(interest, openingPrincipal)
    });
  }).filter((row) => row?.installment > 0 && toNumber(row.installmentAmount) > 0 && toNumber(row.closingPrincipal) > 0);
}

function findDeclaredTenure(text) {
  const value = findPdfValue(text, [
    "Repayable in Instalments",
    "Repayable in Installments",
    "Period in Months",
    "Total Instl",
    "Total Instalments",
    "Total Installments",
    "No of Installments",
    "No. of Installments",
    "No of Instalments",
    "No. of Instalments",
    "Number of EMIs",
    "Tenure"
  ], { requireDigit: true, minLength: 1 });
  const number = Number(String(value ?? "").match(/\d{1,3}/)?.[0]);
  return Number.isFinite(number) && number > 0 && number <= 240 ? number : 0;
}

function isScheduleDuePaid(value) {
  const dueDate = parseDisplayDate(value);
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate <= today;
}

function parseFlattenedScheduleRows(text) {
  const normalized = String(text ?? "").replace(/\s+/g, " ");
  const naRows = parseNaScheduleRows(normalized);
  if (naRows.length > 0) return naRows;
  const rowStartPattern = /(?:^|\s)(\d{1,3})\s+(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s+/g;
  const starts = [...normalized.matchAll(rowStartPattern)];
  return starts.map((match, index) => {
    const rowStart = match.index + match[0].length;
    const rowEnd = starts[index + 1]?.index ?? normalized.length;
    const values = extractMoneyLikeNumbers(normalized.slice(rowStart, rowEnd));
    return classifyScheduleValues(match[1], match[2], values);
  }).filter((row) => row?.installment > 0 && toNumber(row.installmentAmount) > 0);
}

function parseNaScheduleRows(normalized) {
  const rowPattern = /(?:^|\s)(\d{1,3})\s+(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s+(?:N\/?A|NIA|NA|-|[A-Z0-9]+)\s+(?:N\/?A|NIA|NA|-|[A-Z0-9]+)\s+(\d[\d,]*(?:\.\d{1,2})?)\s+(\d[\d,]*(?:\.\d{1,2})?)\s+(\d[\d,]*(?:\.\d{1,2})?)\s+(\d[\d,]*(?:\.\d{1,2})?)(?=\s|$)/gi;
  return [...String(normalized ?? "").matchAll(rowPattern)].map((match) => {
    const installmentAmount = match[3];
    const principalPaid = match[4];
    const interest = match[5];
    const closingPrincipal = match[6];
    const openingPrincipal = String(toNumber(closingPrincipal) + toNumber(principalPaid));
    return makeScheduleRow({
      installment: match[1],
      dueDate: match[2],
      openingPrincipal,
      installmentAmount,
      principalPaid,
      interest,
      closingPrincipal,
      rate: deriveAnnualRate(interest, openingPrincipal)
    });
  }).filter((row) => row.installment > 0 && toNumber(row.installmentAmount) > 0);
}

function parseScheduleLine(line) {
  const text = String(line ?? "").replace(/\s+/g, " ").trim();
  const match = text.match(/^(\d{1,3})\s+(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s+(.+)$/);
  if (!match) return null;
  const [, installment, dueDate, rest] = match;
  const numbers = extractMoneyLikeNumbers(rest);
  if (numbers.length < 4) return null;
  return classifyScheduleValues(installment, dueDate, numbers);
}

function classifyScheduleValues(installment, dueDate, numbers) {
  const cleanedNumbers = (numbers ?? []).map((value) => String(value).replace(/,/g, ""));
  if (cleanedNumbers.length < 4) return null;
  const maybeRate = cleanedNumbers[cleanedNumbers.length - 1];
  const hasRate = toNumber(maybeRate) > 0 && toNumber(maybeRate) <= 40;
  const moneyValues = hasRate ? cleanedNumbers.slice(0, -1) : cleanedNumbers;
  if (moneyValues.length >= 6 && toNumber(moneyValues[4]) <= 100) {
    return makeScheduleRow({
      installment,
      dueDate,
      openingPrincipal: moneyValues[0],
      installmentAmount: moneyValues[1],
      principalPaid: moneyValues[2],
      interest: moneyValues[3],
      serviceTax: moneyValues[4],
      closingPrincipal: moneyValues[5],
      rate: hasRate ? maybeRate : ""
    });
  }
  if (moneyValues.length >= 6 && toNumber(moneyValues[3]) <= 100 && toNumber(moneyValues[4]) > 1000) {
    const installmentAmount = moneyValues[0];
    const principalPaid = moneyValues[1];
    const finCharges = moneyValues[2];
    const insurance = moneyValues[3];
    const closingPrincipal = moneyValues[4];
    const openingPrincipal = String(toNumber(closingPrincipal) + toNumber(principalPaid));
    return makeScheduleRow({
      installment,
      dueDate,
      openingPrincipal,
      installmentAmount,
      principalPaid,
      interest: finCharges,
      serviceTax: insurance,
      closingPrincipal,
      rate: deriveAnnualRate(finCharges, openingPrincipal)
    });
  }
  if (moneyValues.length >= 5) {
    return makeScheduleRow({
      installment,
      dueDate,
      openingPrincipal: moneyValues[0],
      installmentAmount: moneyValues[1],
      principalPaid: moneyValues[2],
      interest: moneyValues[3],
      closingPrincipal: moneyValues[4],
      rate: hasRate ? maybeRate : ""
    });
  }
  const [installmentAmount, principalPaid, interest, closingPrincipal] = moneyValues;
  const openingPrincipal = String(toNumber(closingPrincipal) + toNumber(principalPaid));
  return makeScheduleRow({
    installment,
    dueDate,
    openingPrincipal,
    installmentAmount,
    principalPaid,
    interest,
    closingPrincipal,
    rate: deriveAnnualRate(interest, openingPrincipal)
  });
}

function makeScheduleRow(row) {
  return {
    installment: Number(row.installment),
    dueDate: row.dueDate,
    openingPrincipal: String(row.openingPrincipal ?? "").replace(/,/g, ""),
    installmentAmount: String(row.installmentAmount ?? "").replace(/,/g, ""),
    principalPaid: String(row.principalPaid ?? "").replace(/,/g, ""),
    interest: String(row.interest ?? "").replace(/,/g, ""),
    serviceTax: String(row.serviceTax ?? "").replace(/,/g, ""),
    closingPrincipal: String(row.closingPrincipal ?? "").replace(/,/g, ""),
    rate: row.rate ? String(row.rate).replace(/^0+(\d)/, "$1") : ""
  };
}

function deriveAnnualRate(interest, openingPrincipal) {
  const principal = toNumber(openingPrincipal);
  const monthlyInterest = toNumber(interest);
  if (principal <= 0 || monthlyInterest <= 0) return "";
  return ((monthlyInterest * 1200) / principal).toFixed(2);
}

function mostCommonAmount(values) {
  const counts = new Map();
  values.forEach((value) => {
    const key = String(Math.round(toNumber(value)));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return [...counts.entries()]
    .sort((first, second) => second[1] - first[1] || Number(second[0]) - Number(first[0]))[0]?.[0] ?? "";
}

function extractMoneyLikeNumbers(value) {
  return [...String(value ?? "").matchAll(/\b\d[\d,]*(?:\.\d{1,2})?\b/g)]
    .map((match) => match[0].replace(/,/g, ""))
    .filter((item) => item.length <= 12);
}

function extractSignedMoneyLikeNumbers(value) {
  return [...String(value ?? "").matchAll(/-?\b\d[\d,]*(?:\.\d{1,2})?\b/g)]
    .map((match) => match[0].replace(/,/g, ""))
    .filter((item) => item.length <= 13);
}

function findAgreementFallback(text) {
  const patterns = [
    /\b(?:CVR|LNC|LAN|AG|AGR|HF|HL|TW|TR|LN)[A-Z0-9/-]{5,35}\b/gi,
    /\b[A-Z]{2,6}\d{6,25}\b/gi,
    /\b\d{8,25}\b/g
  ];
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)].map((match) => match[0]);
    const candidate = matches.find((value) => normalizeAgreement(value).length >= 8);
    if (candidate) return candidate;
  }
  return "";
}

function findPdfValue(text, labels, options = {}) {
  const allowsShortNumber = labels.some((label) => /tenure|paid|install/i.test(label));
  const requireDigit = options.requireDigit ?? allowsShortNumber;
  const minLength = options.minLength ?? (allowsShortNumber ? 1 : 2);
  for (const label of labels) {
    const valuePattern = allowsShortNumber ? "([A-Z0-9][A-Z0-9/\\-]{0,40})" : "([A-Z0-9][A-Z0-9/\\-]{1,40})";
    const pattern = new RegExp(`${looseLabelPattern(label)}\\s*[:\\-]?\\s*${valuePattern}`, "gi");
    const match = text.match(pattern);
    if (match) {
      for (const item of match) {
        const value = item.replace(new RegExp(`${looseLabelPattern(label)}\\s*[:\\-]?\\s*`, "i"), "").trim();
        const clean = cleanPdfValue(value);
        if ((!requireDigit || /\d/.test(clean)) && normalizeAgreement(clean).length >= minLength) return clean;
      }
    }
  }
  return "";
}

function findPdfAmount(text, labels, options = {}) {
  const candidates = [];
  for (const label of labels) {
    const pattern = new RegExp(`${looseLabelPattern(label)}[^0-9]{0,80}(?:INR|Rs\\.?)?\\s*([0-9][0-9,]*(?:\\.\\d{1,2})?)`, "gi");
    for (const match of text.matchAll(pattern)) {
      const value = match[1].replace(/,/g, "");
      candidates.push(value);
    }
  }
  if (options.positive) return candidates.find((value) => toNumber(value) > 0 && toNumber(value) >= (options.min ?? 0)) ?? "";
  return candidates[0] ?? "";
}

function findPdfExactAmount(text, labels) {
  for (const label of labels) {
    const pattern = new RegExp(`${looseLabelPattern(label)}\\s*[:\\-]?\\s*(?:INR|Rs\\.?)?\\s*(-?[0-9][0-9,]*(?:\\.\\d{1,2})?)`, "i");
    const match = String(text ?? "").match(pattern);
    if (match && Math.abs(toNumber(match[1])) >= 100) return match[1].replace(/,/g, "");
  }
  return "";
}

function findPdfRate(text) {
  const match = text.match(/(?:Current\s*Int\s*Rate|Interest\s*Rate|Rate\s*of\s*Interest|Internal\s*Rate\s*of\s*Return|ROI|IRR)[^0-9]{0,120}([0-9]+(?:\.[0-9]+)?)\s*%?/i);
  return match?.[1] ?? "";
}

function findPdfDate(text, labels) {
  for (const label of labels) {
    const pattern = new RegExp(`${looseLabelPattern(label)}[^0-9A-Za-z]{0,50}(\\d{1,2}[./-]\\d{1,2}[./-]\\d{2,4}|\\d{4}-\\d{1,2}-\\d{1,2}|\\d{1,2}[-\\s][A-Za-z]{3,}[-\\s]\\d{2,4})`, "i");
    const match = text.match(pattern);
    if (match) return formatDisplayDate(match[1]);
  }
  return "";
}

function looseLabelPattern(label) {
  return label
    .trim()
    .split(/\s+/)
    .map((word) => word.split("").map((char) => escapeRegExp(char)).join("\\s*"))
    .join("\\s*");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanPdfValue(value) {
  return String(value ?? "")
    .replace(/\s{2,}.*/, "")
    .replace(/\b(?:INR|Rs|Amount|Date)\b.*$/i, "")
    .trim();
}
function getReportRows(report, data) {
  if (report === "Finance") {
    return data.dueTasks.map((task) => ({
      id: task.id,
      name: `${task.type} - ${getDataClient(data, task.clientId)?.name ?? task.clientId}`,
      status: task.status,
      amount: formatMoney(task.amount),
      detail: `Due ${formatDisplayDate(task.dueDate)}`
    }));
  }
  if (report === "Insurance") {
    return data.vehicles.map((vehicle) => ({
      id: vehicle.id,
      name: vehicle.regNo,
      status: vehicle.insuranceExpiry <= "2026-08-31" ? "Due" : "Active",
      amount: formatMoney(vehicle.overdue),
      detail: `Insurance expiry ${formatDisplayDate(vehicle.insuranceExpiry)}`
    }));
  }
  if (report === "Compliance") {
    return data.vehicles.map((vehicle) => ({
      id: vehicle.id,
      name: vehicle.regNo,
      status: vehicle.permitExpiry <= "2026-08-31" ? "Due" : "Active",
      amount: "-",
      detail: `Permit expiry ${formatDisplayDate(vehicle.permitExpiry)}`
    }));
  }
  if (report === "Caller") {
    return data.callerActivities.map((activity) => ({
      id: activity.id,
      name: getDataClient(data, data.dueTasks.find((task) => task.id === activity.taskId)?.clientId)?.name ?? activity.taskId,
      status: activity.outcome,
      amount: activity.expectedAmount || "-",
      detail: `${activity.channel} | ${activity.nextFollowUp}`
    }));
  }
  if (report === "Marketplace") {
    return data.listings.map((listing) => ({
      id: listing.id,
      name: listing.title,
      status: listing.status,
      amount: formatMoney(listing.price),
      detail: `${listing.location} | ${listing.condition}`
    }));
  }
  return [];
}
