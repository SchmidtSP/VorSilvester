import React, { useEffect, useState } from "react";
import AdminPanel from "./components/AdminPanel.jsx";
import LoginForm from "./components/LoginForm.jsx";
import UserLogin from "./components/UserLogin.jsx";
import UserTickets from "./components/UserTickets.jsx";
import { api, getToken, clearToken } from "./auth";

const HUF = (n) =>
  new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(n);

const TICKETS = [
  { id: "bal", title: "Báljegy", desc: "Belépő a VorSilvester bálra – zene, tánc, élmény!", price: 6000 },
  { id: "vacsora", title: "Vacsorajegy", desc: "Ültetett vacsora az eseményen.", price: 5000 },
  { id: "asztal", title: "Asztalfoglalás", desc: "Asztalfoglalás a társaságnak (alapértelmezés 6 fő).", price: 12000 },
];

export default function App() {
  const [cart, setCart] = useState([]);
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const path = window.location.pathname;
  const isAdminRoute = path.startsWith("/admin");
  const isAccountRoute = path.startsWith("/account");

  useEffect(() => {
    function onKey(e) {
      if (e.altKey && (e.key === "a" || e.key === "A")) window.location.assign("/admin");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---- KOSÁR MŰVELETEK ----
  const add = (t) =>
    setCart((prev) => {
      const i = prev.findIndex((x) => x.id === t.id);
      if (i >= 0) {
        const c = [...prev];
        const newQty = Math.min(10, c[i].qty + 1);
        const names = Array.isArray(c[i].attendees) ? c[i].attendees.slice(0, newQty) : [];
        while (names.length < newQty) names.push("");
        const extra =
          c[i].id === "asztal"
            ? { tableSize: Number(c[i].tableSize || 6), tableName: c[i].tableName || "" }
            : {};
        c[i] = { ...c[i], qty: newQty, attendees: names, ...extra };
        return c;
      }
      return [
        ...prev,
        { ...t, qty: 1, attendees: [""], ...(t.id === "asztal" ? { tableSize: 6, tableName: "" } : {}) },
      ];
    });

  const changeQty = (id, d) =>
    setCart((prev) =>
      prev.map((x) => {
        if (x.id !== id) return x;
        const newQty = Math.max(1, Math.min(10, x.qty + d));
        const names = Array.isArray(x.attendees) ? x.attendees.slice(0, newQty) : [];
        while (names.length < newQty) names.push("");
        const extra =
          x.id === "asztal" ? { tableSize: Number(x.tableSize || 6), tableName: x.tableName || "" } : {};
        return { ...x, qty: newQty, attendees: names, ...extra };
      })
    );

  const removeItem = (id) => setCart((prev) => prev.filter((x) => x.id !== id));

  function setAttendeeName(ticketId, index, value) {
    setCart((prev) =>
      prev.map((x) => {
        if (x.id !== ticketId) return x;
        const names = Array.isArray(x.attendees) ? [...x.attendees] : [];
        while (names.length < x.qty) names.push("");
        names[index] = value;
        return { ...x, attendees: names };
      })
    );
  }

  function setTableField(ticketId, field, value) {
    setCart((prev) =>
      prev.map((x) => {
        if (x.id !== ticketId) return x;
        if (x.id !== "asztal") return x;
        const next = { ...x };
        if (field === "tableSize") next.tableSize = Math.max(1, Number(value || 1));
        if (field === "tableName") next.tableName = value;
        return next;
      })
    );
  }

  const total = cart.reduce((s, x) => s + x.price * x.qty, 0);

  const handleCheckout = async () => {
    if (!email || !name || cart.length === 0) {
      alert("Név, e-mail és legalább 1 tétel szükséges.");
      return;
    }
    for (const item of cart) {
      if (item.id !== "asztal") {
        const names = (item.attendees || []).slice(0, item.qty);
        if (names.length !== item.qty || names.some((n) => !n || !n.trim())) {
          alert(`Kérlek add meg az összes név mezőt a(z) "${item.title}" jegyeknél.`);
          return;
        }
      } else {
        const size = Number(item.tableSize || 0);
        if (!item.tableName || !item.tableName.trim() || !size || size < 1) {
          alert('Kérlek add meg az "Asztalfoglalás" adatait: "Hány főre" és "Milyen névre".');
          return;
        }
      }
    }

    const order = {
      name,
      email,
      items: cart
        .map((x) => {
          if (x.id === "asztal") {
            const size = Number(x.tableSize || 6);
            const nm = x.tableName || "";
            return `${x.title} (${x.qty} db, ${size} fő, név: ${nm})`;
          }
          return `${x.title} (${x.qty} db)`;
        })
        .join(", "),
      attendees: cart.map((x) => {
        const base = { ticketId: x.id, title: x.title, names: (x.attendees || []).slice(0, x.qty) };
        if (x.id === "asztal") {
          base.tableName = x.tableName || "";
          base.tableSize = Number(x.tableSize || 6);
        }
        return base;
      }),
      note,
      total,
      createdAt: new Date().toISOString(),
    };

    try {
      await api("/api/orders", { method: "POST", body: order });
      alert("Köszönjük! A rendelésed mentve.");
      setCart([]);
      setNote("");
    } catch (err) {
      alert("Hiba rendelés mentésekor: " + (err?.message || String(err)));
    }
  };

  // ---- ADMIN ----
  if (isAdminRoute) {
    return getToken("admin") ? (
      <AdminPanel />
    ) : (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 text-slate-900">
        <header className="border-b border-blue-200">
          <div className="max-w-6xl mx-auto px-4 py-10 text-center">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">Admin – Bejelentkezés</h1>
            <p className="mt-3 text-slate-600">Jelentkezz be a rendeléskezeléshez.</p>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8">
          <LoginForm />
          <div className="mt-6 text-center">
            <a href="/" className="inline-block px-4 py-2 rounded-xl border hover:bg-white">
              Vissza a főoldalra
            </a>
          </div>
        </main>
      </div>
    );
  }

  // ---- FIÓK / JEGYEIM ----
  if (isAccountRoute) {
    const token = getToken("user");
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 text-slate-900">
        <header className="border-b border-blue-200">
          <div className="max-w-6xl mx-auto px-4 py-10 text-center">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">Fiókom / Jegyeim</h1>
            <p className="mt-3 text-slate-600">Itt látod a rendeléseidet és jegyeidet.</p>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          {token ? (
            <>
              <div className="flex justify-between items-center">
                <a href="/" className="inline-block px-4 py-2 rounded-xl border hover:bg-white">
                  Vissza a főoldalra
                </a>
                <button
                  onClick={() => {
                    clearToken("user");
                    window.location.reload();
                  }}
                  className="px-4 py-2 rounded-xl border hover:bg-white"
                >
                  Kijelentkezés
                </button>
              </div>
              <UserTickets />
            </>
          ) : (
            <>
              <UserLogin />
              <div className="mt-6 text-center">
                <a href="/" className="inline-block px-4 py-2 rounded-xl border hover:bg-white">
                  Vissza a főoldalra
                </a>
              </div>
            </>
          )}
        </main>
      </div>
    );
  }

  // ---- FŐOLDAL / VÁSÁRLÁS ----
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 text-slate-900">
      <header className="border-b border-blue-200">
        <div className="max-w-6xl mx-auto px-4 py-10 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">VorSilvester 2025 – Wemender GJU</h1>
          <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
            Ünnepeld velünk az évet a Wemender GJU szervezésében! Válassz jegyet az eseményre, és élvezd a zene, a
            vacsora és a társaság felejthetetlen estéjét.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 lg:py-10 grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="grid sm:grid-cols-2 gap-6">
            {TICKETS.map((t) => (
              <article
                key={t.id}
                className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 flex flex-col"
              >
                <h3 className="text-xl font-bold">{t.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{t.desc}</p>
                <div className="mt-auto pt-4 flex items-center justify-between">
                  <span className="text-lg font-extrabold text-blue-700 tabular-nums">{HUF(t.price)}</span>
                  <button
                    onClick={() => add(t)}
                    className="px-4 py-2 rounded-xl bg-blue-700 text-white hover:bg-blue-800 transition"
                  >
                    Kosárba
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6">
          <h2 className="text-xl font-bold mb-3">Kosarad</h2>
          {cart.length === 0 ? (
            <p className="text-slate-500">Még üres a kosarad.</p>
          ) : (
            <ul className="space-y-5">
              {cart.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap gap-3 sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    <p className="text-xs text-slate-500 tabular-nums">{HUF(item.price)} / db</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => changeQty(item.id, -1)}
                      className="w-8 h-8 rounded-lg border border-blue-200"
                      aria-label="Kevesebb"
                    >
                      –
                    </button>
                    <span className="w-10 text-center font-medium tabular-nums">{item.qty}</span>
                    <button
                      onClick={() => changeQty(item.id, 1)}
                      className="w-8 h-8 rounded-lg border border-blue-200"
                      aria-label="Több"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{HUF(item.price * item.qty)}</p>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Eltávolítás
                    </button>
                  </div>

                  {/* Résztvevők / speciális mezők – mindig új sorban */}
                  <div className="w-full basis-full grid gap-2">
                    {item.id !== "asztal" ? (
                      Array.from({ length: item.qty }).map((_, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <label className="text-xs text-slate-600 w-28 shrink-0">Résztvevő #{idx + 1}</label>
                          <input
                            value={(item.attendees && item.attendees[idx]) || ""}
                            onChange={(e) => setAttendeeName(item.id, idx, e.target.value)}
                            className="flex-1 px-3 h-10 border rounded-lg"
                            placeholder="Teljes név"
                          />
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-600 w-36 shrink-0">Asztal – hány főre</label>
                          <input
                            type="number"
                            min={1}
                            value={Number(item.tableSize || 6)}
                            onChange={(e) => setTableField(item.id, "tableSize", e.target.value)}
                            className="w-32 px-3 h-10 border rounded-lg tabular-nums"
                            placeholder="6"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-600 w-36 shrink-0">Asztal – milyen névre</label>
                          <input
                            type="text"
                            value={item.tableName || ""}
                            onChange={(e) => setTableField(item.id, "tableName", e.target.value)}
                            className="flex-1 px-3 h-10 border rounded-lg"
                            placeholder="Teljes név"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 border-t border-blue-100 pt-4 flex items-center justify-between">
            <span className="font-medium">Összesen</span>
            <span className="font-bold text-lg tabular-nums">{HUF(total)}</span>
          </div>

          {cart.length > 0 && (
            <div className="mt-4 space-y-3">
              <input
                type="text"
                placeholder="Név (vásárló)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 border rounded-lg px-3"
              />
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 border rounded-lg px-3"
              />
              <textarea
                placeholder="Megjegyzés (opcionális)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full border rounded-lg p-3 min-h-[80px]"
              />
              <button
                onClick={handleCheckout}
                className="w-full py-3 rounded-xl bg-blue-700 text-white font-semibold hover:bg-blue-800 transition"
              >
                Rendelés leadása
              </button>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
