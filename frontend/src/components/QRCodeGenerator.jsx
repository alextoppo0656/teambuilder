import { useEffect, useRef } from "react";

export default function QRCodeGenerator({ projectId, projectTitle }) {
  const canvasRef = useRef(null);
  const url = `${window.location.origin}/projects?join=${projectId}`;

  useEffect(() => {
    // Simple QR code using a public API rendered as image
    // We'll use a canvas to display it cleanly
  }, []);

  return (
    <div className="qr-section" style={{ marginTop: 16, padding: 16, background: "var(--bg3)", borderRadius: 8, border: "1px solid var(--border)" }}>
      <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>📱 Scan to join this project</p>
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`}
        alt="QR Code"
        style={{ width: 150, height: 150, borderRadius: 8, margin: "8px auto", display: "block" }}
        onError={(e) => {
          e.target.style.display = "none";
          e.target.nextSibling.style.display = "block";
        }}
      />
      <div style={{ display: "none", background: "white", padding: 12, borderRadius: 8, margin: "8px auto", width: "fit-content" }}>
        <p style={{ fontSize: 11, color: "#333", wordBreak: "break-all", maxWidth: 200 }}>{url}</p>
      </div>
      <p style={{ fontSize: 11, color: "var(--text2)", marginTop: 8, wordBreak: "break-all" }}>{url}</p>
      <button
        className="btn-outline"
        style={{ marginTop: 8, fontSize: 12, padding: "6px 14px" }}
        onClick={() => { navigator.clipboard.writeText(url); }}
      >
        📋 Copy Link
      </button>
    </div>
  );
}
