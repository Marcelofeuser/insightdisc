import React from "react";

export default function WhatsappButton() {
  const message =
    "https://wa.me/5562994090276?text=Olá%20quero%20saber%20mais%20sobre%20o%20InsightDISC";

  return (
    <a
      href={message}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Abrir WhatsApp InsightDISC"
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        backgroundColor: "#25D366",
        color: "white",
        borderRadius: "50px",
        padding: "14px 18px",
        fontWeight: "600",
        textDecoration: "none",
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "14px",
      }}
    >
      💬 WhatsApp
    </a>
  );
}
