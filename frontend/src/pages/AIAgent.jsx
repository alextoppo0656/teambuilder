import { useState } from "react";
import axios from "../api/axios";
import { useToast } from "../context/ToastContext";

const EXAMPLE_GOALS = [
  "Build my team for a fintech hackathon (need React + backend + pitch deck)",
  "Find teammates for an ML project on sentiment analysis",
  "Assemble a 3-person team to build a mobile app in 48 hours",
];

export default function AIAgent() {
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [editedMessages, setEditedMessages] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [approvedMessages, setApprovedMessages] = useState({});
  const [sentMessages, setSentMessages] = useState({});
  const [sendingId, setSendingId] = useState(null);
  const { addToast } = useToast();

  const user = JSON.parse(localStorage.getItem("user"));

  const runAgent = async () => {
    if (!goal.trim()) { addToast("Please describe your goal first", "error"); return; }
    if (!user) { addToast("Please login first", "error"); return; }
    setLoading(true);
    setResult(null);
    setEditedMessages({});
    setEditingId(null);
    setApprovedMessages({});
    setSentMessages({});
    try {
      const res = await axios.post("/ai/agent", { goal });
      setResult(res.data);
      // Pre-populate editable messages from AI response
      const msgs = {};
      (res.data.matches || []).forEach(m => { msgs[m.studentId] = m.introMessage; });
      setEditedMessages(msgs);
    } catch (err) {
      addToast(err.response?.data?.error || "AI Agent failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const approveMessage = (studentId) => {
    setApprovedMessages(prev => ({ ...prev, [studentId]: true }));
    setEditingId(null);
    addToast("Message approved — ready to send", "info");
  };

  const sendMessage = async (match) => {
    setSendingId(match.studentId);
    try {
      await axios.post("/invite", {
        toId: match.studentId,
        message: editedMessages[match.studentId] || match.introMessage,
        goal,
        role: match.role,
      });
      setSentMessages(prev => ({ ...prev, [match.studentId]: true }));
      addToast(`Invite sent to ${match.studentName}! ✅`, "success");
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to send invite", "error");
    } finally {
      setSendingId(null);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  };

  if (!user) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
        <h2>AI Agent</h2>
        <p style={{ color: "var(--text2)", marginTop: 8 }}>Please login to use the AI Agent.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="ai-panel">
        <div className="ai-tag">🤖 Agentic AI — Bounded</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Team Builder AI Concierge</h2>
        <p style={{ marginBottom: 4 }}>
          Tell me your goal. I'll find the right people, draft personalized intro messages,
          assign roles, and plan your next steps.{" "}
          <strong style={{ color: "#fbbf24" }}>You review and approve before anything is sent.</strong>
        </p>

        <div className="ai-input-row">
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder='e.g. "Build my team for a fintech hack (need React + backend + pitch)"'
            onKeyDown={(e) => e.key === "Enter" && runAgent()}
          />
          <button
            className="btn-primary"
            onClick={runAgent}
            disabled={loading}
            style={{ whiteSpace: "nowrap", padding: "11px 24px" }}
          >
            {loading ? "Thinking..." : "🚀 Run Agent"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <span style={{ fontSize: 12, color: "#64748b", alignSelf: "center" }}>Try:</span>
          {EXAMPLE_GOALS.map((eg, i) => (
            <button
              key={i}
              onClick={() => setGoal(eg)}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid #334155",
                color: "#94a3b8",
                fontSize: 12,
                padding: "5px 12px",
                borderRadius: 20,
                cursor: "pointer",
              }}
            >
              {eg.length > 48 ? eg.slice(0, 48) + "…" : eg}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div className="spinner" />
          <p style={{ color: "var(--text2)", marginTop: 12 }}>AI is analyzing your goal and matching students...</p>
        </div>
      )}

      {result && (
        <div className="ai-result-card">
          {/* Summary */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ color: "white", fontSize: 16, marginBottom: 8 }}>📋 Goal Summary</h3>
            <div className="reasoning-box">{result.summary}</div>
            <h3 style={{ color: "white", fontSize: 16, margin: "16px 0 8px" }}>🧠 AI Reasoning</h3>
            <div className="reasoning-box">{result.reasoning}</div>
          </div>

          {/* No matches state */}
          {(!result.matches || result.matches.length === 0) && (
            <div style={{ textAlign: "center", padding: "32px 20px", color: "#64748b" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
              <p style={{ fontSize: 15 }}>No students available to match yet.</p>
              <p style={{ fontSize: 13, marginTop: 6 }}>Share the platform so others can register and add their skills.</p>
            </div>
          )}

          {/* Matches */}
          {result.matches?.length > 0 && (
            <>
              <h3 style={{ color: "white", fontSize: 16, marginBottom: 4 }}>
                👥 Top Matches ({result.matches.length} students)
              </h3>

              {result.matches.map((match) => (
                <div key={match.studentId} className="ai-match-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4>{match.studentName}</h4>
                      <span className="role-badge">{match.role}</span>
                    </div>
                    <div
                      className="score-ring"
                      style={{ borderColor: getScoreColor(match.matchScore), color: getScoreColor(match.matchScore) }}
                    >
                      {match.matchScore}%
                    </div>
                  </div>

                  <p className="match-reason">💡 {match.matchReason}</p>

                  {/* Editable message */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <p style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>DRAFT INTRO MESSAGE:</p>
                    {!sentMessages[match.studentId] && (
                      <button
                        onClick={() => setEditingId(editingId === match.studentId ? null : match.studentId)}
                        style={{
                          background: "transparent",
                          border: "1px solid #475569",
                          color: "#94a3b8",
                          fontSize: 11,
                          padding: "3px 10px",
                          borderRadius: 4,
                          cursor: "pointer",
                        }}
                      >
                        {editingId === match.studentId ? "✓ Done" : "✏️ Edit"}
                      </button>
                    )}
                  </div>

                  {editingId === match.studentId ? (
                    <textarea
                      value={editedMessages[match.studentId] || ""}
                      onChange={(e) => setEditedMessages(prev => ({ ...prev, [match.studentId]: e.target.value }))}
                      rows={4}
                      style={{
                        width: "100%",
                        background: "#1e293b",
                        border: "1px solid #3b82f6",
                        borderRadius: 6,
                        padding: "10px 14px",
                        fontSize: 13,
                        color: "#cbd5e1",
                        lineHeight: 1.6,
                        resize: "vertical",
                        outline: "none",
                        marginBottom: 10,
                        marginTop: 0,
                      }}
                    />
                  ) : (
                    <div className="intro-msg">"{editedMessages[match.studentId] || match.introMessage}"</div>
                  )}

                  {/* Trust & Control bar */}
                  {!sentMessages[match.studentId] && (
                    <div className="trust-bar">
                      <p>⚠️ AI wants to send this message. Do you approve?</p>
                      <div className="trust-actions">
                        {!approvedMessages[match.studentId] ? (
                          <button
                            onClick={() => approveMessage(match.studentId)}
                            style={{ background: "#10b981", color: "white", padding: "6px 14px", fontSize: 13, borderRadius: 6, border: "none", cursor: "pointer" }}
                          >
                            ✅ Approve
                          </button>
                        ) : (
                          <button
                            onClick={() => sendMessage(match)}
                            disabled={sendingId === match.studentId}
                            style={{ background: "#2563eb", color: "white", padding: "6px 14px", fontSize: 13, borderRadius: 6, border: "none", cursor: "pointer", opacity: sendingId === match.studentId ? 0.7 : 1 }}
                          >
                            {sendingId === match.studentId ? "Sending..." : "📤 Send Invite"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {sentMessages[match.studentId] && (
                    <div style={{ background: "#064e3b", border: "1px solid #10b981", borderRadius: 6, padding: "8px 14px", marginTop: 8, fontSize: 13, color: "#34d399" }}>
                      ✅ Invite sent to {match.studentName} — they'll see it in their dashboard
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {/* Role Breakdown */}
          {result.roleBreakdown?.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ color: "white", fontSize: 16, marginBottom: 12 }}>🗂️ Role Breakdown</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                {result.roleBreakdown.map((r, i) => (
                  <div key={i} style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: 14 }}>
                    <p style={{ color: "#3b82f6", fontSize: 12, fontWeight: 700 }}>{r.role}</p>
                    <p style={{ color: "white", fontSize: 14, fontWeight: 600, margin: "4px 0" }}>{r.person}</p>
                    <p style={{ color: "#64748b", fontSize: 12 }}>{r.responsibility}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Steps */}
          {result.nextSteps?.length > 0 && (
            <div className="next-steps">
              <h3>📌 Next Steps</h3>
              {result.nextSteps.map((step, i) => (
                <div key={i} className="next-step-item">
                  <span className="step-num">{i + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}