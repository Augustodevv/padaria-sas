import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME} — padaria artesanal`;
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
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 70% 40%, #C68B59 0%, #6B4226 40%, #3E2723 75%)",
          color: "#F7F1E8",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 8, textTransform: "uppercase", color: "#E8D8C3" }}>Padaria artesanal</div>
        <div style={{ fontSize: 112, fontWeight: 700, marginTop: 16 }}>{SITE_NAME}</div>
        <div style={{ fontSize: 34, marginTop: 24, color: "#E8D8C3" }}>O sabor que transforma seus momentos</div>
      </div>
    ),
    size,
  );
}
