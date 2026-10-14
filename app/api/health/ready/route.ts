import { pool } from "@/server/db";
import { storageReady } from "@/server/integrations/storage";
export const GET = async () => { try { await Promise.all([pool.query("select 1"), storageReady()]); return Response.json({ status: "ready" }); } catch { return Response.json({ status: "not_ready" }, { status: 503 }); } };
