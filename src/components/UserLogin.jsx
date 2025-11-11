import React, { useState } from "react";
import { userLogin, userRegister } from "../auth";

export default function UserLogin({ onSuccess }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");

  async function handle(e) {
    e.preventDefault();
    setErr("");
    try {
      if (mode === "register") {
        await userRegister({ email, password, name });
      } else {
        await userLogin({ email, password });
      }
      onSuccess?.();
    } catch (ex) {
      setErr(ex.message || "Hiba történt.");
    }
  }

  return (
    <div className="max-w-sm mx-auto bg-white rounded-2xl shadow p-6 space-y-3">
      <h2 className="text-xl font-bold">
        {mode === "register" ? "Regisztráció" : "Bejelentkezés"}
      </h2>
      {err && <p className="text-red-600 text-sm">{err}</p>}

      <form onSubmit={handle} className="space-y-3">
        {mode === "register" && (
          <input className="w-full border rounded-lg p-2" placeholder="Név (opcionális)"
                 value={name} onChange={(e)=>setName(e.target.value)} />
        )}
        <input className="w-full border rounded-lg p-2" type="email" placeholder="E-mail"
               value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="w-full border rounded-lg p-2" type="password" placeholder="Jelszó"
               value={password} onChange={(e)=>setPassword(e.target.value)} />
        <button className="w-full bg-blue-700 text-white rounded-lg py-2">
          {mode === "register" ? "Regisztráció" : "Belépés"}
        </button>
      </form>

      <p className="text-sm text-slate-600">
        {mode === "register" ? (
          <>Van már fiókod? <button className="text-blue-700 underline" onClick={()=>setMode("login")}>Lépj be</button></>
        ) : (
          <>Még nincs fiókod? <button className="text-blue-700 underline" onClick={()=>setMode("register")}>Regisztrálj</button></>
        )}
      </p>
    </div>
  );
}
