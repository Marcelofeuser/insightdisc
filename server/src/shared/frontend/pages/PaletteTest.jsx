import React from "react";

export default function PaletteTest() {
  const colors = {
    primary: "#5f151d",
    secondary: "#dec7a4",
    secondary2: "#4e6b3f"
  };

  return (
    <div className="min-h-screen bg-slate-50 p-10 space-y-10">
      <h1 className="text-3xl font-bold">InsightDISC – Palette Test</h1>

      {/* Color swatches */}
      <div className="grid grid-cols-3 gap-6">
        <ColorCard title="Primary" hex={colors.primary} />
        <ColorCard title="Secondary" hex={colors.secondary} />
        <ColorCard title="Secondary 2" hex={colors.secondary2} />
      </div>

      {/* Buttons */}
      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <h2 className="text-xl font-semibold">Buttons</h2>

        <div className="flex gap-4 flex-wrap">
          <button
            className="px-6 py-3 rounded-lg text-white font-medium"
            style={{ backgroundColor: colors.primary }}
          >
            Primary Button
          </button>

          <button
            className="px-6 py-3 rounded-lg font-medium"
            style={{ backgroundColor: colors.secondary }}
          >
            Secondary Button
          </button>

          <button
            className="px-6 py-3 rounded-lg text-white font-medium"
            style={{ backgroundColor: colors.secondary2 }}
          >
            Secondary 2 Button
          </button>
        </div>
      </div>

      {/* Badges */}
      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <h2 className="text-xl font-semibold">Badges</h2>
        <div className="flex gap-3 flex-wrap">
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: colors.primary }}
          >
            Primary Badge
          </span>
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: colors.secondary }}
          >
            Secondary Badge
          </span>
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: colors.secondary2 }}
          >
            Secondary 2 Badge
          </span>
        </div>
      </div>

      {/* Card Test */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold">Neutral Card</h3>
          <p className="text-gray-600 mt-2">
            Example of neutral card using palette for actions.
          </p>

          <button
            className="mt-5 px-5 py-2 rounded text-white"
            style={{ backgroundColor: colors.primary }}
          >
            Start Test
          </button>
        </div>

        <div
          className="rounded-xl shadow p-6 text-white"
          style={{
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary2})`
          }}
        >
          <h3 className="text-lg font-semibold">Gradient Card</h3>
          <p className="opacity-90 mt-2">
            Example hero card using the palette gradient.
          </p>

          <button
            className="mt-5 px-5 py-2 rounded"
            style={{
              backgroundColor: colors.secondary,
              color: "#111"
            }}
          >
            Buy Report
          </button>
        </div>
      </div>

      {/* Form test */}
      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <h2 className="text-xl font-semibold">Inputs</h2>

        <input
          placeholder="Email"
          className="w-full border border-gray-300 rounded-lg px-4 py-3"
        />

        <button
          className="px-6 py-3 rounded text-white"
          style={{ backgroundColor: colors.primary }}
        >
          Submit
        </button>
      </div>
    </div>
  );
}

function ColorCard({ title, hex }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow flex items-center gap-4">
      <div
        className="w-14 h-14 rounded-lg border"
        style={{ backgroundColor: hex }}
      />

      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-gray-500 text-sm">{hex}</div>
      </div>
    </div>
  );
}
