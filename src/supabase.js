import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://wfwchzmaqfujrwodkfmq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_oVDEVJJZ1dTLDVKmyxXULw__ND_iS2j";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// Compatibility layer: the existing single-file app uses window.storage.
// This keeps its UI/business logic intact while persisting collections in Supabase.
const tables = {
  "khp:users": ["users", (r) => ({ ...r, passwordHash: r.password_hash, createdAt: r.created_at }), (r) => ({ id:r.id, username:r.username, name:r.name, role:r.role, password_hash:r.passwordHash, active:r.active, created_at:r.createdAt })],
  "khp:patients": ["patients", (r) => ({ ...r, patientId:r.patient_id, emergencyContact:r.emergency_contact, registeredAt:r.registered_at, registeredBy:r.registered_by }), (r) => ({ id:r.id, patient_id:r.patientId, name:r.name, dob:r.dob, sex:r.sex, phone:r.phone, address:r.address, emergency_contact:r.emergencyContact, notes:r.notes, registered_at:r.registeredAt, registered_by:r.registeredBy, archived:r.archived })],
  "khp:services": ["services", (r) => ({ ...r }), (r) => ({ id:r.id, name:r.name, description:r.description, price:r.price, active:r.active })],
  "khp:visits": ["visits", (r) => ({ ...r, visitId:r.visit_id, patientId:r.patient_id, serviceId:r.service_id, staffId:r.staff_id, paymentMethod:r.payment_method }), (r) => ({ id:r.id, visit_id:r.visitId, patient_id:r.patientId, date:r.date, reason:r.reason, service_id:r.serviceId, staff_id:r.staffId, amount:r.amount, payment_method:r.paymentMethod, status:r.status, notes:r.notes })],
  "khp:transactions": ["transactions", (r) => ({ ...r, txnId:r.txn_id, patientId:r.patient_id, visitId:r.visit_id, serviceId:r.service_id, staffId:r.staff_id }), (r) => ({ id:r.id, txn_id:r.txnId, date:r.date, time:r.time, patient_id:r.patientId, visit_id:r.visitId, service_id:r.serviceId, amount:r.amount, method:r.method, staff_id:r.staffId, description:r.description, status:r.status })],
  "khp:closings": ["closings", (r) => ({ ...r, closedBy:r.closed_by, closedAt:r.closed_at, transactionsCount:r.txn_count, cash:r.cash_total, momo:r.momo_total, total:r.total_revenue }), (r) => ({ id:r.id, date:r.date, closed_by:r.closedBy, closed_at:r.closedAt, patients_count:r.patientsCount, visits_count:r.visitsCount, txn_count:r.transactionsCount, cash_total:r.cash, momo_total:r.momo, total_revenue:r.total })],
  "khp:audit": ["audit_logs", (r) => ({ ...r, userId:r.user_id, timestamp:r.timestamp }), (r) => ({ id:r.id, user_id:r.userId, username:r.username, action:r.action, target:r.target, description:r.description, timestamp:r.timestamp })],
};

async function readCollection(key, fallback) {
  const meta = tables[key];
  if (!meta) return fallback;
  const { data, error } = await supabase.from(meta[0]).select("*");
  if (error) {
    console.error(`Supabase read failed for ${meta[0]}:`, error);
    return fallback;
  }
  return (data || []).map(meta[1]);
}

async function writeCollection(key, value) {
  const meta = tables[key];
  if (!meta) return;
  const table = meta[0];
  const rows = Array.isArray(value) ? value.map(meta[2]) : [];

  if (rows.length) {
    const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }

  // Remove records that the current app state no longer contains.
  if (!rows.length) {
    const { error } = await supabase.from(table).delete().neq("id", "");
    if (error) throw error;
  } else {
    const ids = rows.map((r) => r.id);
    const { data: existing, error: listError } = await supabase.from(table).select("id");
    if (listError) throw listError;
    const stale = (existing || []).map((r) => r.id).filter((id) => !ids.includes(id));
    if (stale.length) {
      const { error } = await supabase.from(table).delete().in("id", stale);
      if (error) throw error;
    }
  }
}

window.storage = {
  async get(key) {
    const value = await readCollection(key, null);
    return value === null ? null : { value: JSON.stringify(value) };
  },
  async set(key, serialized) {
    const value = typeof serialized === "string" ? JSON.parse(serialized) : serialized;
    await writeCollection(key, value);
    return { ok: true };
  },
};

console.info("Karuruma Health Post: Supabase storage enabled");
