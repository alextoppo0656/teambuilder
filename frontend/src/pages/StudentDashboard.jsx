import { useState, useEffect } from "react";
import axios from "../api/axios";
import { useToast } from "../context/ToastContext";

export default function StudentDashboard() {
  const [skills, setSkills] = useState("");
  const [availability, setAvailability] = useState("");
  const [acceptedProjects, setAcceptedProjects] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [invites, setInvites] = useState([]);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    setUser(storedUser);
    loadProfile();
    fetchAcceptedProjects();
    fetchMyApplications();
    fetchInvites();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await axios.get("/profile-data");
      if (res.data.skills?.length > 0) setSkills(res.data.skills.join(", "));
      if (res.data.availability) setAvailability(res.data.availability);
    } catch (err) {}
  };

  const fetchAcceptedProjects = async () => {
    try {
      const res = await axios.get("/student-projects");
      setAcceptedProjects(res.data);
    } catch (err) {}
  };

  const fetchMyApplications = async () => {
    try {
      const res = await axios.get("/my-applications");
      setMyApplications(res.data);
    } catch (err) {}
  };

  const fetchInvites = async () => {
    try {
      const res = await axios.get("/invites/received");
      setInvites(res.data);
    } catch (err) {}
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await axios.post("/profile", {
        skills: skills.split(",").map(s => s.trim()).filter(Boolean),
        availability: availability.trim(),
      });
      addToast("Profile updated ✅", "success");
    } catch (err) {
      addToast("Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const respondToInvite = async (inviteId, status) => {
    try {
      await axios.post(`/invite/${inviteId}/respond`, { status });
      addToast(status === "accepted" ? "Invite accepted! 🎉" : "Invite declined", status === "accepted" ? "success" : "info");
      fetchInvites();
    } catch (err) {
      addToast("Failed to respond", "error");
    }
  };

  const getStatusBadge = (status) => {
    if (status === "accepted") return <span className="badge badge-success">✅ Accepted</span>;
    if (status === "rejected") return <span className="badge badge-danger">❌ Rejected</span>;
    return <span className="badge badge-warning">⏳ Pending</span>;
  };

  // Computed invite stats
  const pendingInvites = invites.filter(i => i.status === "pending").length;
  const acceptedInvites = invites.filter(i => i.status === "accepted").length;
  const totalInvites = invites.length;

  return (
    <div>
      <div className="section-header">
        <h2>👋 Welcome, {user?.name}</h2>
        <span className="badge badge-info">Student</span>
      </div>

      {/* Stats — 4 clearly labelled cards */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{myApplications.length}</div>
          <div className="stat-label">Project Applications</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{acceptedProjects.length}</div>
          <div className="stat-label">Projects Accepted</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: acceptedInvites > 0 ? "#10b981" : "var(--primary)" }}>
            {acceptedInvites}
          </div>
          <div className="stat-label">Invites Accepted</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: pendingInvites > 0 ? "#f59e0b" : "var(--primary)" }}>
            {pendingInvites}
          </div>
          <div className="stat-label">Pending Invites</div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "profile" ? "active" : ""}`} onClick={() => setTab("profile")}>Profile</button>
        <button className={`tab ${tab === "invites" ? "active" : ""}`} onClick={() => setTab("invites")}>
          Invites ({totalInvites})
          {pendingInvites > 0 && (
            <span style={{ background: "#f59e0b", color: "white", borderRadius: "50%", padding: "1px 6px", fontSize: 11, marginLeft: 4 }}>
              {pendingInvites}
            </span>
          )}
        </button>
        <button className={`tab ${tab === "applications" ? "active" : ""}`} onClick={() => setTab("applications")}>
          Applications ({myApplications.length})
        </button>
        <button className={`tab ${tab === "accepted" ? "active" : ""}`} onClick={() => setTab("accepted")}>
          Accepted ({acceptedProjects.length})
        </button>
      </div>

      {/* Profile Tab */}
      {tab === "profile" && (
        <div className="card">
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>✏️ Edit Profile</h3>
          <p style={{ color: "var(--text2)", fontSize: 14 }}>Keep your skills updated for better project matches</p>
          <label>Skills (comma separated)</label>
          <input value={skills} placeholder="React, Node.js, Python, MongoDB..." onChange={(e) => setSkills(e.target.value)} />
          <label>Availability</label>
          <input value={availability} placeholder="e.g. Weekdays after 6pm, Weekends full day" onChange={(e) => setAvailability(e.target.value)} />
          {skills && (
            <div className="skill-tags" style={{ marginTop: 12 }}>
              {skills.split(",").map(s => s.trim()).filter(Boolean).map(s => <span key={s} className="skill-tag">{s}</span>)}
            </div>
          )}
          <button className="btn-primary" onClick={saveProfile} disabled={saving} style={{ marginTop: 16 }}>
            {saving ? "Saving..." : "💾 Save Profile"}
          </button>
        </div>
      )}

      {/* Invites Tab */}
      {tab === "invites" && (
        <div>
          {invites.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📬</div>
              <p>No invites yet. They'll appear here when someone reaches out.</p>
            </div>
          ) : (
            <>
              {/* Pending section */}
              {pendingInvites > 0 && (
                <p style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 10 }}>
                  ⏳ {pendingInvites} pending invite{pendingInvites > 1 ? "s" : ""} — action required
                </p>
              )}
              {invites.map((invite) => (
                <div key={invite._id} className="card" style={{ marginBottom: 14, borderLeft: `3px solid ${invite.status === "accepted" ? "#10b981" : invite.status === "declined" ? "#ef4444" : "#f59e0b"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 15 }}>From: {invite.from?.name}</p>
                      <p style={{ color: "var(--text2)", fontSize: 13 }}>{invite.from?.email}</p>
                    </div>
                    {invite.status === "pending"
                      ? <span className="badge badge-warning">⏳ Pending</span>
                      : invite.status === "accepted"
                      ? <span className="badge badge-success">✅ Accepted</span>
                      : <span className="badge badge-danger">❌ Declined</span>
                    }
                  </div>

                  {invite.role && (
                    <p style={{ fontSize: 13, marginBottom: 8 }}>
                      <span style={{ background: "var(--primary-light)", color: "var(--primary)", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                        {invite.role}
                      </span>
                    </p>
                  )}

                  <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", marginBottom: 10, fontSize: 14, lineHeight: 1.6, fontStyle: "italic", color: "var(--text2)" }}>
                    "{invite.message}"
                  </div>

                  {invite.goal && (
                    <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 10 }}>
                      🎯 Goal: <strong style={{ color: "var(--text)" }}>{invite.goal}</strong>
                    </p>
                  )}

                  {invite.status === "pending" && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="btn-success" style={{ padding: "7px 18px", fontSize: 13 }} onClick={() => respondToInvite(invite._id, "accepted")}>
                        ✅ Accept
                      </button>
                      <button className="btn-danger" style={{ padding: "7px 18px", fontSize: 13 }} onClick={() => respondToInvite(invite._id, "declined")}>
                        ❌ Decline
                      </button>
                    </div>
                  )}

                  <p style={{ fontSize: 11, color: "var(--text2)", marginTop: 10 }}>
                    {new Date(invite.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Applications Tab */}
      {tab === "applications" && (
        <div>
          {myApplications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <p>No applications yet. Browse projects and apply!</p>
            </div>
          ) : (
            <div className="projects-grid">
              {myApplications.map((app) => (
                <div key={app._id} className="project-card">
                  <h3>{app.project?.title}</h3>
                  <p>{app.project?.description}</p>
                  <div className="skill-tags">
                    {(app.project?.requiredSkills || []).map(s => <span key={s} className="skill-tag">{s}</span>)}
                  </div>
                  <div style={{ marginTop: 12 }}>{getStatusBadge(app.status)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Accepted Projects Tab */}
      {tab === "accepted" && (
        <div>
          {acceptedProjects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎉</div>
              <p>No accepted projects yet. Keep applying!</p>
            </div>
          ) : (
            <div className="projects-grid">
              {acceptedProjects.map((app) => (
                <div key={app._id} className="project-card">
                  <h3>{app.project?.title}</h3>
                  <p>{app.project?.description}</p>
                  <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 8 }}>👤 {app.project?.createdBy?.name}</p>
                  <div style={{ marginTop: 12 }}><span className="badge badge-success">✅ Accepted</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}