import { useEffect, useState } from "react";
import axios from "../api/axios";
import { useToast } from "../context/ToastContext";
import QRCodeGenerator from "../components/QRCodeGenerator";
import { useNavigate } from "react-router-dom";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [qrProject, setQrProject] = useState(null);
  // BUG FIX: Track already-applied projects from server, not just session
  const [myApplications, setMyApplications] = useState([]);
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      navigate("/login");
      return;
    }
    setUser(storedUser);
    fetchProjects();
    if (storedUser.role === "student") fetchMyApplications();
  }, []);

  const fetchMyApplications = async () => {
    try {
      const res = await axios.get("/my-applications");
      setMyApplications(res.data.map(a => a.project?._id).filter(Boolean));
    } catch (err) {}
  };

  const fetchProjects = async (s = "", sk = "") => {
    setLoading(true);
    try {
      const params = {};
      if (s) params.search = s;
      if (sk) params.skill = sk;
      const res = await axios.get("/projects", { params });
      setProjects(res.data);
    } catch (err) {
      addToast("Failed to load projects", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    fetchProjects(val, skillFilter);
  };

  const handleSkillFilter = (e) => {
    const val = e.target.value;
    setSkillFilter(val);
    fetchProjects(search, val);
  };

  const applyToProject = async (projectId) => {
    try {
      await axios.post("/apply", { projectId });
      setMyApplications(prev => [...prev, projectId]);
      addToast("Applied successfully! 🚀", "success");
    } catch (err) {
      addToast(err.response?.data?.error || "Apply failed", "error");
    }
  };

  const getMatchColor = (pct) => {
    if (pct >= 70) return "#10b981";
    if (pct >= 40) return "#f59e0b";
    return "#ef4444";
  };

  const allSkills = [...new Set(projects.flatMap(p => p.requiredSkills || []))];

  return (
    <div>
      <div className="section-header">
        <h2>📋 All Projects</h2>
        <span className="badge badge-info">{projects.length} project{projects.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="search-bar">
        <input value={search} onChange={handleSearch} placeholder="🔍 Search by project title..." />
        <select value={skillFilter} onChange={handleSkillFilter}>
          <option value="">All Skills</option>
          {allSkills.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>No projects found. Try a different search.</p>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((project) => {
            const alreadyApplied = myApplications.includes(project._id);
            return (
              <div key={project._id} className="project-card">
                <h3>{project.title}</h3>
                <p>{project.description}</p>

                <div className="skill-tags">
                  {(project.requiredSkills || []).map(skill => (
                    <span
                      key={skill}
                      className={`skill-tag ${
                        user?.role === "student" &&
                        project.matchedSkills?.map(s => s.toLowerCase()).includes(skill.toLowerCase())
                          ? "matched" : ""
                      }`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                {user?.role === "student" && (
                  <div className="match-bar-wrap">
                    <div className="match-label">
                      <span>Skill Match</span>
                      <span style={{ color: getMatchColor(project.matchPercentage || 0), fontWeight: 700 }}>
                        {project.matchPercentage ?? 0}%
                      </span>
                    </div>
                    <div className="match-bar">
                      <div className="match-fill" style={{
                        width: `${project.matchPercentage ?? 0}%`,
                        background: getMatchColor(project.matchPercentage || 0)
                      }} />
                    </div>
                  </div>
                )}

                <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 8 }}>
                  👤 {project.createdBy?.name || "Unknown"}
                </p>

                <div className="card-actions">
                  {user?.role === "student" && (
                    <button
                      className={alreadyApplied ? "btn-ghost" : "btn-primary"}
                      onClick={() => !alreadyApplied && applyToProject(project._id)}
                      disabled={alreadyApplied}
                    >
                      {alreadyApplied ? "✅ Applied" : "Apply Now"}
                    </button>
                  )}
                  <button
                    className="btn-outline"
                    onClick={() => setQrProject(qrProject?._id === project._id ? null : project)}
                  >
                    📱 QR Code
                  </button>
                </div>

                {qrProject?._id === project._id && (
                  <QRCodeGenerator projectId={project._id} projectTitle={project.title} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}