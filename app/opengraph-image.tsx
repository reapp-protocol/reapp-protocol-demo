import { ImageResponse } from "next/og";

export const alt = "REAPP — agent payments, enforced on-chain";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "90px",
          background: "#0a0e0d",
          backgroundImage: "radial-gradient(900px 500px at 50% -10%, #1a1430, #0a0e0d 60%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              width: 104,
              height: 104,
              borderRadius: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
              fontSize: 68,
              fontWeight: 900,
              color: "#fff",
            }}
          >
            r
          </div>
          <div
            style={{
              fontSize: 104,
              fontWeight: 800,
              letterSpacing: -2,
              backgroundImage: "linear-gradient(90deg, #a78bfa, #60a5fa)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            reapp
          </div>
        </div>
        <div style={{ marginTop: 46, fontSize: 48, fontWeight: 700, color: "#eef2ff" }}>
          Agent payments, enforced on-chain.
        </div>
        <div style={{ marginTop: 20, fontSize: 28, color: "#9aa6c0" }}>
          Stellar · MandateRegistry · @reapp-sdk/core
        </div>
      </div>
    ),
    { ...size },
  );
}
