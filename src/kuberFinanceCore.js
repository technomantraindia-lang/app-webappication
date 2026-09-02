const users = [];
const clients = [];
const vehicles = [];
const dueTasks = [];
const listings = [];
const importRows = [];
const verificationItems = [];
const callerOutcomes = [
  { outcome: "Connected - Will Pay", required: "Promise date and expected amount", nextAction: "Follow up on commitment date" },
  { outcome: "Already Paid", required: "Receipt or transaction reference", nextAction: "Pause after submission" },
  { outcome: "Insurance Interested", required: "Expected renewal date and notes", nextAction: "Move to renewal follow-up" },
  { outcome: "No Answer / Busy", required: "Attempt note", nextAction: "Schedule next attempt" },
  { outcome: "Switched Off", required: "Attempt note", nextAction: "Schedule retry" },
  { outcome: "Callback Requested", required: "Callback date, time and note", nextAction: "Schedule callback" },
  { outcome: "Wrong Number", required: "Correction note", nextAction: "Escalate to Admin" },
  { outcome: "Dispute", required: "Detailed notes", nextAction: "Escalate to Admin" }
];
const marketplaceChats = [
  { listingId: "m1", buyer: "Shree Cargo Movers", seller: "Rajesh Logistics", status: "Negotiating", unread: 2 },
  { listingId: "m2", buyer: "Rajesh Logistics", seller: "Shree Cargo Movers", status: "Interested", unread: 0 }
];
const reportGroups = [
  ["Finance", "Upcoming EMI, overdue EMI, principal outstanding, closing amount and payment history"],
  ["Insurance", "Expiring, expired, renewed, pending verification and insurer-wise renewal report"],
  ["Compliance", "Permit, fitness, PUC and tax expiry report"],
  ["Caller", "Attempts, connected calls, promises, missed tasks and escalations"],
  ["Marketplace", "Active listings, enquiries, chats, reserved vehicles, sold vehicles and sale values"],
  ["Audit", "Who changed what, previous value, new value, date, time and verification remark"]
];
const permissionRows = [
  ["View all clients", "Yes", "No", "Assigned only", "No"],
  ["View own fleet", "Yes", "Yes", "Assigned only", "Yes"],
  ["Import Excel", "Yes", "No", "No", "No"],
  ["Edit closing principal", "Yes", "No", "No", "No"],
  ["Mark EMI paid", "Yes", "Own fleet", "No", "Own fleet"],
  ["Verify payment", "Yes", "No", "No", "No"],
  ["Call / WhatsApp", "Optional", "No", "Yes", "No"],
  ["Create sale listing", "Yes", "Yes", "No", "Yes"],
  ["Approve listing", "Yes", "No", "No", "No"],
  ["Owner chat", "Reports only", "Yes", "No", "Yes"]
];
const STORAGE_KEY = "kuber-finance-admin-data-v1";
function getNavSections(role) {
  if (role === "Admin") {
    return [
      ["dashboard", "Overview", "home-outline"],
      ["clients", "Clients", "people-outline"],
      ["fleet", "Fleet", "bus-outline"],
      ["dues", "Dues", "calendar-outline"],
      ["verification", "Verification", "checkmark-done-outline"],
      ["marketplace", "Marketplace", "storefront-outline"],
      ["reports", "Reports", "bar-chart-outline"],
      ["settings", "Settings", "settings-outline"]
    ];
  }
  if (role === "Caller") {
    return [
      ["dashboard", "Overview", "home-outline"],
      ["caller", "Queue", "call-outline"],
      ["dues", "Dues", "calendar-outline"],
      ["clients", "Clients", "people-outline"],
      ["profile", "Profile", "person-outline"]
    ];
  }
  return [
    ["dashboard", "Overview", "home-outline"],
    ["fleet", "Fleet", "bus-outline"],
    ["dues", "Dues", "calendar-outline"],
    ["marketplace", "Marketplace", "storefront-outline"],
    ["profile", "Profile", "person-outline"]
  ];
}
const initialAuditLogs = [];
const initialNotifications = [];
const initialCallerActivities = [];
const initialDocuments = [];
const initialMarketplaceThreads = [];
const initialAppData = {
  clients,
  vehicles,
  dueTasks,
  listings,
  verificationItems,
  importRows,
  clientImports: [],
  callerActivities: initialCallerActivities,
  auditLogs: initialAuditLogs,
  notifications: initialNotifications,
  documents: initialDocuments,
  marketplaceThreads: initialMarketplaceThreads
};
const formatMoney = (value) => `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value)}`;
const liability = (vehicle) => vehicle.principal + vehicle.overdue + vehicle.penalty + vehicle.foreclosure;
const getClient = (clientId) => clients.find((client) => client.id === clientId);
const getVehicle = (vehicleId) => vehicles.find((vehicle) => vehicle.id === vehicleId);
export {
  STORAGE_KEY,
  callerOutcomes,
  clients,
  dueTasks,
  formatMoney,
  getClient,
  getNavSections,
  getVehicle,
  importRows,
  initialAppData,
  initialAuditLogs,
  initialCallerActivities,
  initialDocuments,
  initialMarketplaceThreads,
  initialNotifications,
  liability,
  listings,
  marketplaceChats,
  permissionRows,
  reportGroups,
  users,
  vehicles,
  verificationItems
};
