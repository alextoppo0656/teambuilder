import { useNavigate } from "react-router-dom";

export default function HomePage({ user }) {
  const navigate = useNavigate();

  return (
    <div>
      <div className="hero">
        <h1>Build Your Dream Team,<br />Powered by AI</h1>
        <p>
          TeamBuilder matches students to projects using skill analysis and an AI concierge
          that drafts messages, assigns roles, and plans your next steps — automatically.
        </p>
        <div className="hero-actions">
          {!user ? (
            <>
              <button className="btn-primary" onClick={() => navigate("/register")} style={{ padding: "14px 32px", fontSize: "16px" }}>
                🚀 Get Started
              </button>
              <button className="btn-outline" onClick={() => navigate("/login")} style={{ padding: "14px 32px", fontSize: "16px" }}>
                Login
              </button>
            </>
          ) : (
            <>
              <button className="btn-primary" onClick={() => navigate("/projects")} style={{ padding: "14px 32px", fontSize: "16px" }}>
                Browse Projects
              </button>
              <button className="btn-ghost" onClick={() => navigate("/ai-agent")} style={{ padding: "14px 32px", fontSize: "16px" }}>
                🤖 Try AI Agent
              </button>
            </>
          )}
        </div>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">🎯</div>
          <h3>Smart Skill Matching</h3>
          <p>Automatically match students to projects based on their skills with a percentage match score.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🤖</div>
          <h3>Agentic AI Concierge</h3>
          <p>Tell the AI your goal. It finds the right people, drafts intro messages, and plans your next steps.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">✅</div>
          <h3>Trust & Control</h3>
          <p>AI always shows its reasoning. You approve every action before it happens — no surprises.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📱</div>
          <h3>QR Team Joining</h3>
          <p>Share a QR code for your project so teammates can join instantly from any device.</p>
        </div>
      </div>
    </div>
  );
}
