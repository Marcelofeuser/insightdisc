import React from "react";

function baseClasses(variant) {
  const common =
    "pointer-events-auto w-full max-w-sm rounded-md border px-4 py-3 shadow-lg";
  const variants = {
    default: "bg-white text-slate-900 border-slate-200",
    destructive: "bg-red-600 text-white border-red-700",
    success: "bg-emerald-600 text-white border-emerald-700",
  };
  return `${common} ${variants[variant] || variants.default}`;
}

export function Toast({ title, description, variant = "default", onClose }) {
  const isLightText = variant === "destructive" || variant === "success";

  return (
    <div className={baseClasses(variant)} role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          {title ? <div className={`font-semibold leading-5 ${isLightText ? "text-white" : "text-slate-900"}`}>{title}</div> : null}
          {description ? (
            <div className={`mt-1 text-sm ${isLightText ? "text-white/90" : "text-slate-700"}`}>{description}</div>
          ) : null}
        </div>

        <button
          onClick={onClose}
          className={`rounded px-2 py-1 text-sm hover:opacity-100 ${isLightText ? "text-white/80" : "text-slate-500"}`}
          aria-label="Fechar"
          type="button"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
