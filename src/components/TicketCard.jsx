import React from "react";

const HUF = (n) =>
  new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n);

export default function TicketCard({ ticket, onAdd }) {
  return (
    <article className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 flex flex-col">
      <h3 className="text-xl font-bold">{ticket.title}</h3>
      <p className="mt-1 text-sm text-slate-600">{ticket.desc}</p>
      <div className="mt-auto pt-4 flex items-center justify-between">
        <span className="text-lg font-extrabold text-blue-700">{HUF(ticket.price)}</span>
        <button onClick={() => onAdd(ticket)} className="px-4 py-2 rounded-xl bg-blue-700 text-white hover:bg-blue-800 transition">
          Kosárba
        </button>
      </div>
    </article>
  );
}