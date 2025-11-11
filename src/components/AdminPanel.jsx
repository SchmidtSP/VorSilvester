import React, { useEffect, useState } from "react";
import { api, clearToken } from "../auth";

const HUF = (n) =>
  new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n);

function renderKinek(attendees) {
  if (!Array.isArray(attendees)) return "";
  const parts = [];
  for (const a of attendees) {
    if (a && a.ticketId === "asztal") {
      const size = a.tableSize != null ? Number(a.tableSize) : null;
      const nm = a.tableName || "";
      const chunk = `Asztalfoglalás${size ? ` – ${size} fő` : ""}${nm ? ` – ${nm} névre` : ""}`;
      parts.push(chunk);
    }
    const list = (a?.names || a?.attendees || []).filter(Boolean);
    if (list.length) parts.push(list.join(", "));
  }
  return parts.join(" | ");
}

export default function AdminPanel() {
  const [orders, setOrders] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const list = await api("/api/orders", { auth: true, role: "admin" });
        setOrders(list);
      } catch {
        setErr("Hozzáférés megtagadva vagy lejárt bejelentkezés.");
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 text-slate-900">
      <header className="border-b border-blue-200">
        <div className="max-w-6xl mx-auto px-4 py-10 flex items-center justify-between">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">Admin – Rendelések</h1>
          <div className="space-x-2">
            <a href="/" className="px-4 py-2 rounded-xl border hover:bg-white">Vissza a főoldalra</a>
            <button
              onClick={() => { clearToken("admin"); window.location.assign("/admin"); }}
              className="px-4 py-2 rounded-xl border hover:bg-white"
            >
              Kijelentkezés
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {err ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">{err}</div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-xl shadow">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-2">Dátum</th>
                  <th className="p-2">Ki vette (név)</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Jegyek</th>
                  <th className="p-2">Kinek (résztvevők / asztal)</th>
                  <th className="p-2">Megjegyzés</th>
                  <th className="p-2 text-right">Összeg</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t">
                    <td className="p-2 whitespace-nowrap tabular-nums">
                      {new Date(o.createdAt).toLocaleString("hu-HU")}
                    </td>
                    <td className="p-2">{o.name}</td>
                    <td className="p-2">{o.email}</td>
                    <td className="p-2">{o.items}</td>
                    <td className="p-2">{renderKinek(o.attendees)}</td>
                    <td className="p-2">{o.note}</td>
                    <td className="p-2 text-right font-semibold tabular-nums">{HUF(o.total || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
