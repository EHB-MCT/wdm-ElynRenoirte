const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());
app.use(
	require("cors")({
		origin: ["http://localhost:3000", "http://127.0.0.1:3000", "file://"],
		credentials: true,
	})
);
require("dotenv").config();

const { initDB, getDB } = require("./config/database");
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Authentication middleware
function authenticateToken(req, res, next) {
	const authHeader = req.headers["authorization"];
	const token = authHeader && authHeader.split(" ")[1];

	if (!token) {
		return res.status(401).json({ error: "Access token required" });
	}

	jwt.verify(token, JWT_SECRET, (err, user) => {
		if (err) {
			return res.status(403).json({ error: "Invalid token" });
		}
		req.user = user;
		next();
	});
}

//endpoint: register new user
app.post("/register", async (req, res) => {
	const { username, email, password } = req.body;
	const db = getDB();

	try {
		// Check if user already exists
		const [existingUsers] = await db.query("SELECT id FROM users WHERE username = ? OR email = ?", [username, email]);

		if (existingUsers.length > 0) {
			return res.status(400).json({ error: "Username or email already exists" });
		}

		// Hash password
		const passwordHash = await bcrypt.hash(password, 10);

		// Create user with UUID
		const userId = crypto.randomUUID();
		await db.query("INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)", [userId, username, email, passwordHash]);

		// Generate JWT token
		const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: "24h" });

		res.json({
			message: "User registered successfully",
			token,
			user: { id: userId, username, email },
		});
	} catch (error) {
		console.error("Registration error:", error);
		res.status(500).json({ error: "Registration failed" });
	}
});

//endpoint: login user
app.post("/login", async (req, res) => {
	const { username, password } = req.body;
	const db = getDB();

	try {
		// Find user by username or email
		const [users] = await db.query("SELECT id, username, email, password_hash FROM users WHERE username = ? OR email = ?", [username, username]);

		if (users.length === 0) {
			return res.status(401).json({ error: "Invalid credentials" });
		}

		const user = users[0];

		// Verify password
		const isValidPassword = await bcrypt.compare(password, user.password_hash);
		if (!isValidPassword) {
			return res.status(401).json({ error: "Invalid credentials" });
		}

		// Generate JWT token
		const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "24h" });

		res.json({
			message: "Login successful",
			token,
			user: { id: user.id, username: user.username, email: user.email },
		});
	} catch (error) {
		console.error("Login error:", error);
		res.status(500).json({ error: "Login failed" });
	}
});

//endpoint: get current user info
app.get("/me", authenticateToken, async (req, res) => {
	const db = getDB();

	try {
		const [users] = await db.query("SELECT id, username, email FROM users WHERE id = ?", [req.user.id]);

		if (users.length === 0) {
			return res.status(404).json({ error: "User not found" });
		}

		res.json({ user: users[0] });
	} catch (error) {
		console.error("Get user error:", error);
		res.status(500).json({ error: "Failed to get user info" });
	}
});

//endpoint: register anonymous user (for tracking)
app.post("/user", async (req, res) => {
	const { uid, browser, os, screen } = req.body;
	const db = getDB();

	await db.query("INSERT INTO users (id, browser, os, screen_width, screen_height) VALUES (?, ?, ?, ?, ?)", [uid, browser, os, screen.width, screen.height]);

	res.json({ status: "ok" });
});

//endpoint: log events
app.post("/event", async (req, res) => {
	console.log("EVENT RECEIVED:", req.body);
	const { uid, type, metadata } = req.body;
	const db = getDB();

	// If no uid provided, try to get from token
	let userId = uid;
	if (!userId && req.headers.authorization) {
		try {
			const token = req.headers.authorization.split(" ")[1];
			const decoded = jwt.verify(token, JWT_SECRET);
			userId = decoded.id;
		} catch (err) {
			// Invalid token, continue with no uid
		}
	}

	await db.query("INSERT INTO events (uid, type, metadata) VALUES (?, ?, ?)", [userId, type, JSON.stringify(metadata)]);

	res.json({ status: "logged" });
});

//endpoint: store answers
app.post("/answer", async (req, res) => {
	const { uid, question, answer, time } = req.body;
	const db = getDB();

	await db.query("INSERT INTO answers (uid, question, answer, time_taken) VALUES (?, ?, ?, ?)", [uid, question, answer, time]);

	res.json({ status: "saved" });
});

app.listen(4000, async () => {
	await initDB();
	console.log("Backend running on 4000");
});
