import React from "react";

export default function WhatsappFloatingButton() {
  const href =
    "https://wa.me/5562994090276?text=Olá%20quero%20saber%20mais%20sobre%20o%20InsightDISC";

  return (
    <>
      <style>{`
        .wa-float-wrap {
          position: fixed;
          right: 22px;
          bottom: 22px;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .wa-tooltip {
          background: rgba(15, 23, 42, 0.92);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          padding: 10px 12px;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.18);
          white-space: nowrap;
          opacity: 0;
          transform: translateX(8px);
          pointer-events: none;
          transition: all 0.25s ease;
        }

        .wa-float-wrap:hover .wa-tooltip {
          opacity: 1;
          transform: translateX(0);
        }

        .wa-button {
          width: 62px;
          height: 62px;
          border-radius: 999px;
          background: linear-gradient(135deg, #25D366 0%, #1ebe5d 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 12px 30px rgba(37, 211, 102, 0.35),
            0 4px 14px rgba(0,0,0,0.16);
          text-decoration: none;
          position: relative;
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }

        .wa-button:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow:
            0 16px 34px rgba(37, 211, 102, 0.42),
            0 8px 20px rgba(0,0,0,0.22);
          filter: saturate(1.05);
        }

        .wa-button:active {
          transform: scale(0.98);
        }

        .wa-button::before {
          content: "";
          position: absolute;
          inset: -6px;
          border-radius: 999px;
          background: rgba(37, 211, 102, 0.22);
          animation: waPulse 2s infinite;
          z-index: -1;
        }

        @keyframes waPulse {
          0% {
            transform: scale(0.92);
            opacity: 0.65;
          }
          70% {
            transform: scale(1.18);
            opacity: 0;
          }
          100% {
            transform: scale(1.18);
            opacity: 0;
          }
        }

        .wa-icon {
          width: 30px;
          height: 30px;
          display: block;
          fill: white;
        }

        @media (max-width: 640px) {
          .wa-float-wrap {
            right: 16px;
            bottom: 16px;
          }

          .wa-tooltip {
            display: none;
          }

          .wa-button {
            width: 58px;
            height: 58px;
          }

          .wa-icon {
            width: 28px;
            height: 28px;
          }
        }
      `}</style>

      <div className="wa-float-wrap" aria-label="Contato por WhatsApp">
        <div className="wa-tooltip">Fale no WhatsApp</div>

        <a
          className="wa-button"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir conversa no WhatsApp"
          title="Fale no WhatsApp"
          data-testid="whatsapp-floating-button"
        >
          <svg viewBox="0 0 32 32" className="wa-icon" aria-hidden="true">
            <path d="M19.11 17.29c-.29-.14-1.73-.85-2-.95-.27-.1-.47-.14-.67.14-.2.29-.77.95-.94 1.15-.17.2-.35.22-.64.07-.29-.14-1.24-.46-2.36-1.48-.88-.78-1.48-1.74-1.65-2.03-.17-.29-.02-.44.13-.58.13-.13.29-.35.43-.52.14-.17.19-.29.29-.48.1-.2.05-.36-.02-.5-.07-.14-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.5.07-.76.36-.26.29-.99.97-.99 2.37s1.01 2.75 1.15 2.94c.14.2 1.98 3.02 4.8 4.23.67.29 1.19.46 1.6.59.67.21 1.27.18 1.75.11.53-.08 1.73-.71 1.98-1.39.24-.68.24-1.26.17-1.39-.07-.13-.26-.2-.55-.34Z" />
            <path d="M16.01 3.2c-7.07 0-12.8 5.72-12.8 12.78 0 2.26.59 4.47 1.72 6.4L3 29l6.79-1.78a12.84 12.84 0 0 0 6.22 1.58h.01c7.06 0 12.79-5.73 12.79-12.79 0-3.42-1.33-6.63-3.75-9.04A12.72 12.72 0 0 0 16.01 3.2Zm0 23.43h-.01a10.7 10.7 0 0 1-5.44-1.49l-.39-.23-4.03 1.06 1.08-3.93-.25-.4a10.61 10.61 0 0 1-1.63-5.65c0-5.9 4.79-10.69 10.69-10.69 2.85 0 5.53 1.11 7.54 3.13a10.6 10.6 0 0 1 3.12 7.55c0 5.9-4.8 10.7-10.68 10.7Z" />
          </svg>
        </a>
      </div>
    </>
  );
}
