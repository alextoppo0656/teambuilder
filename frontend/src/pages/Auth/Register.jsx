import { useState } from "react";
import axios from "../../api/axios";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "../../context/ToastContext";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post("/register", form);
      addToast("Registered successfully! Please login.", "success");
      navigate("/login");
    } catch (err) {
      addToast(err.response?.data?.error || "Registration failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h2>Create account 🚀</h2>
        <p className="subtitle">Join TeamBuilder to find your perfect team</p>
        <form onSubmit={handleSubmit}>
          <label>Full Name</label>
          <input placeholder="John Doe" required onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <label>Email</label>
          <input type="email" placeholder="you@example.com" required onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <label>Password</label>
          <input type="password" placeholder="••••••••" required onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <label>Role</label>
          <select onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="student">Student</option>
            <option value="admin">Admin / Project Creator</option>
          </select>
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", marginTop: 20, padding: 13 }}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>
        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
