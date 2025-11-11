const API = "http://localhost:8787";

const KEYS = { user: "usertoken", admin: "admintoken" };

export function setToken(t, role = "user") { localStorage.setItem(KEYS[role] || KEYS.user, t); }
export function getToken(role = "user") { return localStorage.getItem(KEYS[role] || KEYS.user); }
export function clearToken(role = "user") { localStorage.removeItem(KEYS[role] || KEYS.user); }

export async function api(path, { method = "GET", body, auth = false, role = "user" } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const t = getToken(role);
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function userRegister({ email, password, name }) {
  const data = await api("/api/auth/register", { method: "POST", body: { email, password, name } });
  setToken(data.token, "user");
  return data;
}
export async function userLogin({ email, password }) {
  const data = await api("/api/auth/login", { method: "POST", body: { email, password } });
  setToken(data.token, "user");
  return data;
}
export async function fetchMyOrders() {
  return api("/api/my-orders", { auth: true, role: "user" });
}

export async function adminLogin({ email, password }) {
  const data = await api("/api/login", { method: "POST", body: { email, password } });
  setToken(data.token, "admin");
  return data;
}
