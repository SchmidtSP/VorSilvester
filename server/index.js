import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "url";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* ---- Biztonság + limitek ---- */
app.use(helmet());
app.use(rateLimit({ windowMs: 60 * 1000, limit: 200 }));

/* ---- CORS ----
   Ha a frontend és az API ugyanazon az originen fut (ajánlott Renderen), CORS nem is kell.
   Ha mégis külön hoston próbálod, állítsd be itt a konkrét origin(eke)t .env-ben:
   CORS_ORIGINS=https://valami-frontend.onrender.com,https://domain.hu
*/
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.length === 0) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
  })
);

/* ---- JSON body ---- */
app.use(express.json());

/* ---- Adatkönyvtár beállítás ----
   Alapértelmezés: a server mappa (visszafelé kompatibilis).
   Renderen adj hozzá egy Disk-et és állítsd: DATA_DIR=/data
   Így a users.json / orders.json tartós lesz redeploy után is.
*/
const DATA_DIR = process.env.DATA_DIR ? process.env.DATA_DIR : __dirname;
const USERS_FILE = path.join(DATA_DIR, "users.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

/* ---- Titkok / admin ---- */
const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASS = process.env.ADMIN_PASS || "admin123";

/* ---- Helper függvények ---- */
async function readJson(p) {
  try {
    const t = await fs.readFile(p, "utf-8");
    return JSON.parse(t || "[]");
  } catch {
    return [];
  }
}
async function writeJson(p, data) {
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(data, null, 2), "utf-8");
}
function sign(payload, role = "user") {
  return jwt.sign({ ...payload, role }, JWT_SECRET, { expiresIn: "7d" });
}
function auth(requiredRole = "user") {
  return (req, res, next) => {
    try {
      const h = req.headers.authorization || "";
      const token = h.startsWith("Bearer ") ? h.slice(7) : h;
      const dec = jwt.verify(token, JWT_SECRET);
      if (requiredRole && dec.role !== requiredRole) return res.status(403).json({ error: "forbidden" });
      req.user = dec;
      next();
    } catch {
      return res.status(401).json({ error: "unauthorized" });
    }
  };
}

/* ---- AUTH + API ---- */
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Hiányos adatok." });
  if (String(email).toLowerCase() !== String(ADMIN_EMAIL).toLowerCase()) {
    return res.status(401).json({ error: "Hibás belépési adatok." });
  }
  if (password !== ADMIN_PASS) return res.status(401).json({ error: "Hibás belépési adatok." });
  const token = sign({ email, admin: true }, "admin");
  res.json({ token });
});

app.post("/api/register", async (req, res) => {
  const { email, name, password } = req.body || {};
  if (!email || !name || !password) return res.status(400).json({ error: "Hiányos adatok." });

  const users = await readJson(USERS_FILE);
  if (users.some((u) => String(u.email).toLowerCase() === String(email).toLowerCase())) {
    return res.status(400).json({ error: "Ezzel az e-mail címmel már van fiók." });
  }
  const passHash = await bcrypt.hash(password, 10);
  const user = { id: Date.now(), email, name, passHash, createdAt: new Date().toISOString() };
  users.unshift(user);
  await writeJson(USERS_FILE, users);
  res.json({ ok: true });
});

app.post("/api/user-login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Hiányos adatok." });

  const users = await readJson(USERS_FILE);
  const u = users.find((x) => String(x.email).toLowerCase() === String(email).toLowerCase());
  if (!u) return res.status(401).json({ error: "Hibás belépési adatok." });
  const ok = await bcrypt.compare(password, u.passHash);
  if (!ok) return res.status(401).json({ error: "Hibás belépési adatok." });

  const token = sign({ email: u.email, name: u.name, userId: u.id }, "user");
  res.json({ token });
});

app.post("/api/orders", async (req, res) => {
  const { name, email, items, attendees = [], note = "", total = 0, createdAt } = req.body || {};
  if (!name || !email || !items) return res.status(400).json({ error: "Hiányos adatok." });

  const order = {
    id: `${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
    name,
    email,
    items,
    attendees,
    note,
    total: Number(total) || 0,
    status: "pending", // online fizetésnél webhookból frissítsd 'paid'-re
    createdAt: createdAt || new Date().toISOString(),
  };
  const list = await readJson(ORDERS_FILE);
  list.unshift(order);
  await writeJson(ORDERS_FILE, list);
  res.json({ ok: true, id: order.id });
});

app.get("/api/orders", auth("admin"), async (req, res) => {
  const list = await readJson(ORDERS_FILE);
  res.json(list);
});

app.get("/api/my-orders", auth("user"), async (req, res) => {
  const list = await readJson(ORDERS_FILE);
  const mine = list.filter((o) => String(o.email).toLowerCase() === String(req.user.email).toLowerCase());
  res.json(mine);
});

/* ---- Statikus kiszolgálás (Vite build) + SPA fallback ---- */
const DIST_DIR = path.resolve(__dirname, "..", "dist");
app.use(express.static(DIST_DIR));
app.get("*", (_req, res) => {
  res.sendFile(path.join(DIST_DIR, "index.html"));
});

/* ---- Start ---- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Ready on http://localhost:${PORT}`);
  console.log(`Data dir: ${DATA_DIR}`);
});
