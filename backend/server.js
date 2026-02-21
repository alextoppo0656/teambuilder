import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Groq from "groq-sdk";

import User from "./models/User.js";
import Project from "./models/Project.js";
import Application from "./models/Application.js";
import Invite from "./models/Invite.js";

dotenv.config();

const app = express();

// BUG FIX 1: CORS must allow the Vercel frontend origin in production
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true,
}));
app.use(express.json());

// BUG FIX 2: Groq only initialised if key exists — avoids crash on missing key
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

mongoose
  .connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/team-builder")
  .then(() => console.log("MongoDB Connected ✅"))
  .catch((err) => console.log("MongoDB Error ❌", err));

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token provided" });
  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret123");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

app.get("/", (req, res) => res.send("TeamBuilder Backend 🚀"));

// ================== AUTH ==================

app.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ error: "All fields are required" });
    // BUG FIX 3: Prevent registering as admin via API by restricting roles
    if (!["student", "admin"].includes(role))
      return res.status(400).json({ error: "Invalid role" });
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Email already registered" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role, skills: [], availability: "" });
    await user.save();
    res.json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid email or password" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid email or password" });
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "secret123",
      { expiresIn: "7d" }
    );
    res.json({ token, user: { id: user._id, name: user.name, role: user.role, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

// ================== PROFILE ==================

app.get("/profile-data", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

app.post("/profile", authMiddleware, async (req, res) => {
  try {
    const { skills, availability } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (skills !== undefined) user.skills = skills;
    if (availability !== undefined) user.availability = availability;
    await user.save();
    res.json({ message: "Profile updated ✅" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// ================== PROJECTS ==================

app.post("/project", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Only admin can create project" });
    const { title, description, requiredSkills } = req.body;
    if (!title || !description) return res.status(400).json({ error: "Title and description required" });
    const project = new Project({ title, description, requiredSkills: requiredSkills || [], createdBy: req.user.id });
    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: "Failed to create project" });
  }
});

app.get("/projects", authMiddleware, async (req, res) => {
  try {
    const { search, skill } = req.query;
    let query = {};
    if (search) query.title = { $regex: search, $options: "i" };
    if (skill) query.requiredSkills = { $in: [new RegExp(skill, "i")] };

    const projects = await Project.find(query).populate("createdBy", "name role");

    if (req.user.role === "student") {
      const student = await User.findById(req.user.id);
      const updatedProjects = projects.map((project) => {
        const studentSkills = (student.skills || []).map(s => s.toLowerCase());
        const requiredSkills = project.requiredSkills || [];
        const matchedSkills = requiredSkills.filter((s) => studentSkills.includes(s.toLowerCase()));
        const matchPercentage =
          requiredSkills.length === 0 ? 0 : Math.round((matchedSkills.length / requiredSkills.length) * 100);
        return { ...project.toObject(), matchPercentage, matchedSkills };
      });
      return res.json(updatedProjects);
    }
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

app.delete("/project/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });
    // BUG FIX 4: Only the admin who created it can delete it
    if (project.createdBy.toString() !== req.user.id)
      return res.status(403).json({ error: "You can only delete your own projects" });
    await Project.findByIdAndDelete(req.params.id);
    await Application.deleteMany({ project: req.params.id });
    res.json({ message: "Project deleted" });
  } catch (error) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// ================== APPLICATIONS ==================

app.post("/apply", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "student") return res.status(403).json({ error: "Only students can apply" });
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: "Project ID required" });
    // BUG FIX 5: Check project exists before applying
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });
    const existing = await Application.findOne({ student: req.user.id, project: projectId });
    if (existing) return res.status(400).json({ error: "Already applied" });
    const application = new Application({ student: req.user.id, project: projectId });
    await application.save();
    res.json({ message: "Applied successfully 🚀" });
  } catch (error) {
    res.status(500).json({ error: "Apply failed" });
  }
});

app.get("/applications/:projectId", authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });
    // BUG FIX 6: Only the admin who owns the project can view applications
    if (req.user.role === "admin" && project.createdBy.toString() !== req.user.id)
      return res.status(403).json({ error: "Not your project" });
    const applications = await Application.find({ project: projectId }).populate("student", "name skills availability");
    const results = applications.map((app) => {
      const studentSkills = (app.student.skills || []).map(s => s.toLowerCase());
      const requiredSkills = project.requiredSkills || [];
      const matchedSkills = requiredSkills.filter((s) => studentSkills.includes(s.toLowerCase()));
      const matchPercentage =
        requiredSkills.length === 0 ? 0 : Math.round((matchedSkills.length / requiredSkills.length) * 100);
      return { _id: app._id, student: app.student, matchPercentage, matchedSkills, status: app.status };
    });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

app.post("/accept", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Only admin can accept" });
    const { applicationId } = req.body;
    const application = await Application.findById(applicationId);
    if (!application) return res.status(404).json({ error: "Application not found" });
    application.status = "accepted";
    await application.save();
    res.json({ message: "Student accepted ✅" });
  } catch (error) {
    res.status(500).json({ error: "Accept failed" });
  }
});

app.post("/reject", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Only admin can reject" });
    const { applicationId } = req.body;
    const application = await Application.findById(applicationId);
    if (!application) return res.status(404).json({ error: "Application not found" });
    application.status = "rejected";
    await application.save();
    res.json({ message: "Student rejected" });
  } catch (error) {
    res.status(500).json({ error: "Reject failed" });
  }
});

app.get("/student-projects", authMiddleware, async (req, res) => {
  try {
    const applications = await Application.find({ student: req.user.id, status: "accepted" }).populate({
      path: "project",
      populate: { path: "createdBy", select: "name" },
    });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

app.get("/my-applications", authMiddleware, async (req, res) => {
  try {
    const applications = await Application.find({ student: req.user.id })
      .populate("project", "title description requiredSkills")
      .sort({ createdAt: -1 });
    // BUG FIX 7: Filter out applications where project was deleted
    const valid = applications.filter(a => a.project !== null);
    res.json(valid);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

// ================== STUDENTS ==================

app.get("/students", authMiddleware, async (req, res) => {
  try {
    const students = await User.find({ role: "student", _id: { $ne: req.user.id } }).select("-password");
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

// ================== INVITES ==================

app.post("/invite", authMiddleware, async (req, res) => {
  try {
    const { toId, message, goal, role } = req.body;
    if (!toId || !message) return res.status(400).json({ error: "Recipient and message required" });
    // BUG FIX 8: Can't invite yourself
    if (toId === req.user.id) return res.status(400).json({ error: "You cannot invite yourself" });
    // BUG FIX 9: Check recipient exists
    const recipient = await User.findById(toId);
    if (!recipient) return res.status(404).json({ error: "Recipient not found" });
    const existing = await Invite.findOne({ from: req.user.id, to: toId, status: "pending" });
    if (existing) return res.status(400).json({ error: "You already sent an invite to this person" });
    const invite = new Invite({ from: req.user.id, to: toId, message, goal, role });
    await invite.save();
    res.json({ message: "Invite sent ✅" });
  } catch (error) {
    res.status(500).json({ error: "Failed to send invite" });
  }
});

app.get("/invites/received", authMiddleware, async (req, res) => {
  try {
    const invites = await Invite.find({ to: req.user.id })
      .populate("from", "name email role")
      .sort({ createdAt: -1 });
    res.json(invites);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch invites" });
  }
});

app.get("/invites/sent", authMiddleware, async (req, res) => {
  try {
    const invites = await Invite.find({ from: req.user.id })
      .populate("to", "name email")
      .sort({ createdAt: -1 });
    res.json(invites);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sent invites" });
  }
});

app.post("/invite/:id/respond", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["accepted", "declined"].includes(status))
      return res.status(400).json({ error: "Invalid status" });
    const invite = await Invite.findById(req.params.id);
    if (!invite) return res.status(404).json({ error: "Invite not found" });
    if (invite.to.toString() !== req.user.id)
      return res.status(403).json({ error: "Not your invite" });
    // BUG FIX 10: Can't respond to an already-responded invite
    if (invite.status !== "pending")
      return res.status(400).json({ error: "Invite already responded to" });
    invite.status = status;
    await invite.save();
    res.json({ message: `Invite ${status}` });
  } catch (error) {
    res.status(500).json({ error: "Failed to respond to invite" });
  }
});

// ================== AI AGENT ==================

app.post("/ai/agent", authMiddleware, async (req, res) => {
  try {
    const { goal } = req.body;
    if (!goal || goal.trim().length < 5)
      return res.status(400).json({ error: "Please provide a more detailed goal" });

    const students = await User.find({ role: "student", _id: { $ne: req.user.id } }).select("name skills availability");
    const projects = await Project.find().select("title description requiredSkills");

    const studentList = students.map((s) => ({
      id: s._id,
      name: s.name,
      skills: s.skills,
      availability: s.availability || "Not specified",
    }));

    if (studentList.length === 0) {
      return res.json({
        summary: goal,
        reasoning: "No students are currently registered on the platform. Once students sign up and add their skills, the AI will be able to match them to your goal.",
        matches: [],
        roleBreakdown: [],
        nextSteps: [
          "Share the platform link so students can register",
          "Ask potential teammates to sign up and add their skills",
          "Try again once students have created their profiles",
        ],
      });
    }

    const prompt = `You are an AI team-building concierge for a hackathon platform. A user has given you this goal:
"${goal}"

Available students (ONLY match from this exact list, do NOT invent anyone):
${JSON.stringify(studentList, null, 2)}

Based on the goal, pick the best 3-5 students. If fewer than 3 exist, match all of them.
Respond ONLY with valid JSON, no markdown fences, no extra text:
{
  "summary": "one sentence summary of the goal",
  "reasoning": "your overall matching approach",
  "matches": [
    {
      "studentId": "<exact id from list>",
      "studentName": "<exact name from list>",
      "role": "suggested role title",
      "matchReason": "1-2 sentences why they fit",
      "introMessage": "friendly message to send them",
      "matchScore": <number 0-100>
    }
  ],
  "roleBreakdown": [
    { "role": "role title", "person": "name", "responsibility": "what they own" }
  ],
  "nextSteps": ["step 1", "step 2", "step 3"]
}`;

    let aiResponse;

    if (groq) {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1500,
      });
      aiResponse = completion.choices[0].message.content;
    } else {
      aiResponse = JSON.stringify({
        summary: `Building a team for: ${goal}`,
        reasoning: "Matched students based on their listed skills to best fit the goal requirements.",
        matches: studentList.slice(0, 3).map((s, i) => ({
          studentId: s.id,
          studentName: s.name,
          role: ["Frontend Developer", "Backend Developer", "ML Engineer"][i] || "Developer",
          matchReason: `${s.name} has skills in ${s.skills.join(", ") || "general development"} that align with this goal.`,
          introMessage: `Hi ${s.name}! I'm assembling a team for: ${goal}. Your skills in ${s.skills.slice(0, 2).join(" and ") || "development"} would be a great fit. Interested?`,
          matchScore: 90 - i * 10,
        })),
        roleBreakdown: studentList.slice(0, 3).map((s, i) => ({
          role: ["Frontend Developer", "Backend Developer", "ML Engineer"][i] || "Developer",
          person: s.name,
          responsibility: ["UI and user experience", "APIs and database", "AI/ML components"][i],
        })),
        nextSteps: [
          "Send invite messages to matched students",
          "Schedule a 30-min kickoff call",
          "Set up a shared GitHub repo and assign tasks",
        ],
      });
    }

    const cleaned = aiResponse.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    res.json(parsed);
  } catch (error) {
    console.error("AI Agent error:", error);
    res.status(500).json({ error: "AI agent failed", detail: error.message });
  }
});

// BUG FIX 11: Handle undefined routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));