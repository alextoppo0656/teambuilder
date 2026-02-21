import { Routes, Route, Link, useNavigate, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTheme } from "./context/ThemeContext";

import HomePage from "./pages/HomePage";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Projects from "./pages/Projects";
import AIAgent from "./pages/AIAgent";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";

function App() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const updateUser = () => {
      const storedUser = localStorage.getItem("user");
      setUser(storedUser ? JSON.parse(storedUser) : null);
    };
    updateUser();
    window.addEventListener("storage", updateUser);
    return () => window.removeEventListener("storage", updateUser);
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">
          🔗 Team<span>Builder</span>
        </div>
        <div className="nav-links">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/projects">Projects</NavLink>
          {!user && (
            <>
              <NavLink to="/login">Login</NavLink>
              <NavLink to="/register">Register</NavLink>
            </>
          )}
          {user && (
            <>
              <NavLink to="/ai-agent">🤖 AI Agent</NavLink>
              {user.role === "student" && <NavLink to="/student">Dashboard</NavLink>}
              {user.role === "admin" && <NavLink to="/admin">Dashboard</NavLink>}
              <button className="btn-logout" onClick={logout}>Logout</button>
            </>
          )}
          <button className="theme-toggle" onClick={toggle} title="Toggle theme">
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>
      </nav>

      <div className="container">
        <Routes>
          <Route path="/" element={<HomePage user={user} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/ai-agent" element={<AIAgent />} />
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
