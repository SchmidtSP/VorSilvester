import React, { useEffect, useState } from "react";
import { fetchMyOrders } from "../auth";

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

export default function UserTickets() {
  const [orders, setOrders] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchMyOrders();
        setOrders(list);
      } catch {
        setErr("Nem sikerült betölteni a rendeléseket.");
      }
    })();
  }, []);

  if (err) return <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">{err}</div>;
  if (!orders) return <div>Betöltés…</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6">
      <h2 className="text-xl font-bold mb-3">Rendeléseim / Jegyeim</h2>
      {orders.length === 0 ? (
        <p className="text-slate-500">Még nincs rendelésed.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-2">Dátum</th>
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
    </div>
  );
}
