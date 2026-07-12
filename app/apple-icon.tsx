import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        background: "linear-gradient(145deg, #34d399 0%, #10b981 100%)",
        display: "flex",
        height: "100%",
        position: "relative",
        width: "100%",
      }}
    >
      <div style={{ background: "#06241a", borderRadius: 8, height: 74, left: 75, position: "absolute", top: 34, width: 30 }} />
      <div style={{ background: "#06241a", borderRadius: 8, height: 28, left: 41, position: "absolute", top: 83, width: 98 }} />
      <div style={{ background: "#06241a", borderRadius: 8, height: 41, left: 41, position: "absolute", top: 106, width: 28 }} />
      <div style={{ background: "#06241a", borderRadius: 8, height: 41, left: 111, position: "absolute", top: 106, width: 28 }} />
    </div>,
    size,
  );
}
