import { useEffect, useState, useRef } from "react";
import axios from "../api/axios";
import { useToast } from "../context/ToastContext";
import QRCodeGenerator from "../components/QRCodeGenerator";
import { useNavigate, useLocation } from "react-router-dom";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [qrProject, setQrProject] = useState(null);
  const [myApplications, setMyApplications] = useState([]);
  const [highlightedId, setHighlightedId] = useState(null);
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const projectRefs = useRef({});

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      // Save the join param so we can redirect back after login
      navigate(`/login?redirect=${encodeURIComponent(location.search)}`);
      return;
    }
    setUser(storedUser);
    fetchProjects();
    if (storedUser.role === "student") fetchMyApplications();
  }, []);

  // After projects load, scroll to and highlight the joined project
  useEffect(() => {
    if (loading || projects.length === 0) return;
    const params = new URLSearchParams(location.search);
    const joinId = params.get("join");
    if (!joinId) return;

    setHighlightedId(joinId);

    // Wait a tick for refs to be attached
    setTimeout(() => {
      const el = projectRefs.current[joinId];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);

    // Remove highlight after 4 seconds
    setTimeout(() => setHighlightedId(null), 4000);
  }, [loading, projects]);

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
            const isHighlighted = highlightedId === project._id;

            return (
              <div
                key={project._id}
                ref={el => projectRefs.current[project._id] = el}
                className="project-card"
                style={isHighlighted ? {
                  border: "2px solid #3b82f6",
                  boxShadow: "0 0 0 4px rgba(59,130,246,0.2)",
                  transform: "scale(1.02)",
                  transition: "all 0.3s ease",
                } : { transition: "all 0.3s ease" }}
              >
                {isHighlighted && (
                  <div style={{
                    background: "#1d4ed8",
                    color: "white",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: 6,
                    marginBottom: 10,
                    display: "inline-block",
                  }}>
                    📱 You scanned this project's QR code
                  </div>
                )}

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
                      className={alreadyApplied ? "btn-ghost" : isHighlighted ? "btn-primary" : "btn-primary"}
                      onClick={() => !alreadyApplied && applyToProject(project._id)}
                      disabled={alreadyApplied}
                      style={isHighlighted && !alreadyApplied ? { background: "#1d4ed8", animation: "pulse 1.5s infinite" } : {}}
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

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}