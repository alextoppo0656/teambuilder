import { useState, useEffect } from "react";
import axios from "../api/axios";
import { useToast } from "../context/ToastContext";

export default function AdminDashboard() {
  const [form, setForm] = useState({ title: "", description: "", requiredSkills: "" });
  const [projects, setProjects] = useState([]);
  const [applications, setApplications] = useState({});
  const [openProject, setOpenProject] = useState(null);
  const [students, setStudents] = useState([]);
  const [tab, setTab] = useState("projects");
  const [user, setUser] = useState(null);
  const [creating, setCreating] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser || storedUser.role !== "admin") return;
    setUser(storedUser);
    fetchProjects();
    fetchStudents();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await axios.get("/projects");
      setProjects(res.data);
    } catch (err) {
      addToast("Failed to load projects", "error");
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await axios.get("/students");
      setStudents(res.data);
    } catch (err) {}
  };

  const createProject = async () => {
    if (!form.title || !form.description) { addToast("Title and description required", "error"); return; }
    setCreating(true);
    try {
      await axios.post("/project", {
        title: form.title,
        description: form.description,
        requiredSkills: form.requiredSkills.split(",").map(s => s.trim()).filter(Boolean),
      });
      addToast("Project created ✅", "success");
      setForm({ title: "", description: "", requiredSkills: "" });
      fetchProjects();
    } catch (err) {
      addToast("Failed to create project", "error");
    } finally {
      setCreating(false);
    }
  };

  const fetchApplications = async (projectId) => {
    try {
      const res = await axios.get(`/applications/${projectId}`);
      setApplications(prev => ({ ...prev, [projectId]: res.data }));
      setOpenProject(openProject === projectId ? null : projectId);
    } catch (err) {
      addToast("Failed to load applicants", "error");
    }
  };

  const acceptStudent = async (applicationId, projectId) => {
    try {
      await axios.post("/accept", { applicationId });
      addToast("Student accepted ✅", "success");
      const res = await axios.get(`/applications/${projectId}`);
      setApplications(prev => ({ ...prev, [projectId]: res.data }));
    } catch (err) {
      addToast("Accept failed", "error");
    }
  };

  const rejectStudent = async (applicationId, projectId) => {
    try {
      await axios.post("/reject", { applicationId });
      addToast("Student rejected", "info");
      const res = await axios.get(`/applications/${projectId}`);
      setApplications(prev => ({ ...prev, [projectId]: res.data }));
    } catch (err) {
      addToast("Reject failed", "error");
    }
  };

  const deleteProject = async (projectId) => {
    if (!confirm("Delete this project and all its applications?")) return;
    try {
      await axios.delete(`/project/${projectId}`);
      addToast("Project deleted", "info");
      fetchProjects();
    } catch (err) {
      addToast("Delete failed", "error");
    }
  };

  const getMatchColor = (pct) => pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";

  const totalApplicants = Object.values(applications).flat().length;
  const totalAccepted = Object.values(applications).flat().filter(a => a.status === "accepted").length;

  if (!user) return <div className="card"><h3>Please login as Admin</h3></div>;

  return (
    <div>
      <div className="section-header">
        <h2>🛠️ Admin Dashboard</h2>
        <span className="badge badge-info">{user.name}</span>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{projects.length}</div>
          <div className="stat-label">Projects</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{students.length}</div>
          <div className="stat-label">Students</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalAccepted}</div>
          <div className="stat-label">Accepted</div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "projects" ? "active" : ""}`} onClick={() => setTab("projects")}>Projects</button>
        <button className={`tab ${tab === "create" ? "active" : ""}`} onClick={() => setTab("create")}>+ Create Project</button>
        <button className={`tab ${tab === "students" ? "active" : ""}`} onClick={() => setTab("students")}>Students ({students.length})</button>
      </div>

      {tab === "create" && (
        <div className="card">
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>➕ Create New Project</h3>
          <label>Project Title</label>
          <input value={form.title} placeholder="e.g. Fintech Hackathon Team" onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <label>Description</label>
          <input value={form.description} placeholder="Describe the project and its goals" onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <label>Required Skills (comma separated)</label>
          <input value={form.requiredSkills} placeholder="React, Node.js, MongoDB" onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })} />
          {form.requiredSkills && (
            <div className="skill-tags" style={{ marginTop: 12 }}>
              {form.requiredSkills.split(",").map(s => s.trim()).filter(Boolean).map(s => <span key={s} className="skill-tag">{s}</span>)}
            </div>
          )}
          <button className="btn-primary" onClick={createProject} disabled={creating} style={{ marginTop: 20 }}>
            {creating ? "Creating..." : "🚀 Create Project"}
          </button>
        </div>
      )}

      {tab === "projects" && (
        <div>
          {projects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <p>No projects yet. Create your first one!</p>
              <button className="btn-primary" onClick={() => setTab("create")} style={{ marginTop: 16 }}>Create Project</button>
            </div>
          ) : (
            projects.map((project) => (
              <div key={project._id} className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 700 }}>{project.title}</h3>
                    <p style={{ color: "var(--text2)", fontSize: 14, marginTop: 4 }}>{project.description}</p>
                  </div>
                  <button className="btn-danger" style={{ padding: "6px 14px", fontSize: 13 }} onClick={() => deleteProject(project._id)}>
                    🗑️ Delete
                  </button>
                </div>

                <div className="skill-tags" style={{ margin: "12px 0" }}>
                  {(project.requiredSkills || []).map(s => <span key={s} className="skill-tag">{s}</span>)}
                </div>

                <button
                  className="btn-outline"
                  onClick={() => fetchApplications(project._id)}
                  style={{ fontSize: 13 }}
                >
                  {openProject === project._id ? "▲ Hide" : "▼ View"} Applicants
                </button>

                {openProject === project._id && applications[project._id] && (
                  <div style={{ marginTop: 16 }}>
                    {applications[project._id].length === 0 ? (
                      <p style={{ color: "var(--text2)", fontSize: 14 }}>No applicants yet</p>
                    ) : (
                      applications[project._id].map((app) => (
                        <div key={app._id} className="applicant-card">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                              <h4>{app.student.name}</h4>
                              <p>Skills: {app.student.skills?.join(", ") || "None listed"}</p>
                              {app.student.availability && <p>⏰ {app.student.availability}</p>}
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 18, fontWeight: 800, color: getMatchColor(app.matchPercentage) }}>
                                {app.matchPercentage}%
                              </div>
                              <div style={{ fontSize: 11, color: "var(--text2)" }}>match</div>
                            </div>
                          </div>

                          <div style={{ marginTop: 8 }}>
                            <div className="match-bar">
                              <div className="match-fill" style={{ width: `${app.matchPercentage}%`, background: getMatchColor(app.matchPercentage) }} />
                            </div>
                          </div>

                          {app.matchedSkills?.length > 0 && (
                            <div className="skill-tags" style={{ marginTop: 8 }}>
                              {app.matchedSkills.map(s => <span key={s} className="skill-tag matched">{s}</span>)}
                            </div>
                          )}

                          <div className="applicant-actions">
                            {app.status === "accepted" ? (
                              <span className="badge badge-success">✅ Accepted</span>
                            ) : app.status === "rejected" ? (
                              <span className="badge badge-danger">❌ Rejected</span>
                            ) : (
                              <>
                                <button className="btn-success" style={{ padding: "6px 14px", fontSize: 13 }} onClick={() => acceptStudent(app._id, project._id)}>✅ Accept</button>
                                <button className="btn-danger" style={{ padding: "6px 14px", fontSize: 13 }} onClick={() => rejectStudent(app._id, project._id)}>❌ Reject</button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "students" && (
        <div>
          {students.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <p>No students registered yet.</p>
            </div>
          ) : (
            <div className="projects-grid">
              {students.map((s) => (
                <div key={s._id} className="project-card">
                  <h3>{s.name}</h3>
                  <p style={{ fontSize: 13, color: "var(--text2)" }}>{s.email}</p>
                  {s.availability && <p style={{ fontSize: 13, marginTop: 6 }}>⏰ {s.availability}</p>}
                  <div className="skill-tags" style={{ marginTop: 10 }}>
                    {s.skills?.length > 0 ? s.skills.map(sk => <span key={sk} className="skill-tag">{sk}</span>) : <span style={{ fontSize: 13, color: "var(--text2)" }}>No skills listed</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
