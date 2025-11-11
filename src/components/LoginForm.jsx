import React, { useState } from "react";
import { adminLogin } from "../auth";

export default function LoginForm({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function handle(e) {
    e.preventDefault();
    setErr("");
    try {
      await adminLogin({ email, password });
      onSuccess?.();
    } catch {
      setErr("Hibás e-mail vagy jelszó.");
    }
  }

  return (
    <form onSubmit={handle} className="max-w-sm mx-auto bg-white rounded-2xl shadow p-6 space-y-3">
      <h2 className="text-xl font-bold">Admin bejelentkezés</h2>
      {err && <p className="text-red-600 text-sm">{err}</p>}
      <input className="w-full border rounded-lg p-2" type="email" placeholder="E-mail" value={email} onChange={e=>setEmail(e.target.value)} />
      <input className="w-full border rounded-lg p-2" type="password" placeholder="Jelszó" value={password} onChange={e=>setPassword(e.target.value)} />
      <button className="w-full bg-blue-700 text-white rounded-lg py-2">Belépés</button>
    </form>
  );
}
