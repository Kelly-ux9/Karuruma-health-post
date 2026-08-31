import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://wfwchzmaqfujrwodkfmq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_oVDEVJJZ1dTLDVKmyxXULw__ND_iS2j";

const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

const tableColumns = {
  patients: ["id","patient_id","name","dob","sex","phone","address","emergency_contact","notes","registered_at","registered_by","archived"],
  visits: ["id","visit_id","patient_id","date","reason","service_id","staff_id","amount","payment_method","status","notes"],
  transactions: ["id","txn_id","date","time","patient_id","visit_id","service_id","amount","method","staff_id","description","status"],
  services: ["id","name","description","price","active"],
  closings: ["id","date","closed_by","closed_at","patients_count","visits_count","txn_count","cash_total","momo_total","total_revenue"],
  users: ["id","username","name","role","password_hash","active","created_at","email","auth_user_id"],
  audit_logs: ["id","user_id","username","action","target","description","timestamp"]
};

const snake = k => k.replace(/[A-Z]/g, m => "_" + m.toLowerCase());
const cleanRows = (table, rows) => {
  const allowed = tableColumns[table] || [];
  return (Array.isArray(rows) ? rows : []).map(input => {
    const r = {};
    for (const [k,v] of Object.entries(input || {})) {
      const key = snake(k);
      if (allowed.includes(key) && v !== undefined && !(key === "dob" && v === "")) r[key] = v;
    }
    if (table === "patients") {
      r.patient_id = r.patient_id || r.id;
      r.dob = r.dob || null;
      r.sex = r.sex || null;
      r.registered_at = r.registered_at || new Date().toISOString();
      if (r.archived === undefined) r.archived = false;
    }
    if (table === "visits") {
      r.visit_id = r.visit_id || r.id;
      r.amount = Number(r.amount ?? 0);
      r.status = r.status || "completed";
    }
    if (table === "transactions") {
      r.txn_id = r.txn_id || r.id;
      r.time = r.time || new Date().toISOString();
      r.amount = Number(r.amount ?? 0);
      r.status = r.status || "completed";
    }
    return r;
  });
};

export const supabase = new Proxy(client, {
  get(target, prop, receiver) {
    if (prop !== "from") return Reflect.get(target, prop, receiver);
    return (table) => {
      const builder = target.from(table);
      return new Proxy(builder, {
        get(obj, method, recv) {
          if (method === "upsert") return (rows, options) => obj.upsert(cleanRows(table, rows), options);
          // Prevent the old bulk-delete-by-diff logic from deleting records created on another device.
          if (method === "delete") return () => ({ in: async () => ({ data: null, error: null }) });
          return Reflect.get(obj, method, recv);
        }
      });
    };
  }
});

console.info("Karuruma Health Post: Supabase persistence active");
