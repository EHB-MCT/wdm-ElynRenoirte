const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const app = express();
app.use(express.json());
app.use(
	require("cors")({
		origin: ["http://localhost:3000", "http://127.0.0.1:3000", "http://127.0.0.1:5500", "http://localhost:5500", "file://"],
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
	const db = getDB();

	try {
		// Create or get anonymous user
		const userId = crypto.randomUUID();
		const username = `Player_${userId.substring(0, 8)}`;
		
		// Insert anonymous user
		await db.query("INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)", 
			[userId, username, `${username}@anonymous.local`, ""]);

		// Generate JWT token
		const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: "24h" });

		res.json({
			message: "Login successful",
			token,
			user: { id: userId, username, email: `${username}@anonymous.local` },
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
	const { uid, question, answer, time, questionTime } = req.body;
	const db = getDB();

	await db.query("INSERT INTO answers (uid, question, answer, time_taken, question_time) VALUES (?, ?, ?, ?, ?)", [uid, question, answer, time, questionTime]);

	res.json({ status: "saved" });
});

// Admin endpoint to view user data
app.get("/admin/data", async (req, res) => {
	const db = getDB();
	
	try {
		// Get all users with their event counts
		const [userStats] = await db.query(`
			SELECT u.id, u.username, u.email, u.created_at as user_created,
			COUNT(e.id) as total_events,
			SUM(CASE WHEN e.type = 'click' THEN 1 ELSE 0 END) as clicks,
			SUM(CASE WHEN e.type = 'hover' THEN 1 ELSE 0 END) as hovers
			FROM users u 
			LEFT JOIN events e ON u.id = e.uid 
			GROUP BY u.id, u.username, u.email, u.created_at 
			ORDER BY u.created_at DESC
		`);

		// Get recent events
		const [recentEvents] = await db.query(`
			SELECT u.username, e.type, e.metadata, e.created_at 
			FROM users u 
			JOIN events e ON u.id = e.uid 
			ORDER BY e.created_at DESC 
			LIMIT 20
		`);

		res.json({
			userStats,
			recentEvents
		});
	} catch (error) {
		console.error("Admin data error:", error);
		res.status(500).json({ error: "Failed to get admin data" });
	}
});

// Admin analytics endpoint - comprehensive user and behavior insights
app.get("/admin/analytics", async (req, res) => {
	const db = getDB();
	
	try {
		// User completion metrics
		const [userMetrics] = await db.query(`
			SELECT 
				COUNT(DISTINCT u.id) as total_users,
				COUNT(DISTINCT CASE WHEN a.id IS NOT NULL THEN u.id END) as users_completed_quiz,
				AVG(a.time_taken) as avg_time_spent,
				MIN(a.time_taken) as fastest_time,
				MAX(a.time_taken) as slowest_time,
				COUNT(a.id) as total_answers
			FROM users u 
			LEFT JOIN answers a ON u.id = a.uid
		`);

		// User hesitation and click speed analysis
		const [userBehavior] = await db.query(`
			SELECT 
				u.id,
				u.username,
				COUNT(e.id) as total_events,
				SUM(CASE WHEN e.type = 'click' THEN 1 ELSE 0 END) as total_clicks,
				AVG(CASE WHEN e.type = 'click' THEN 
					JSON_UNQUOTE(JSON_EXTRACT(e.metadata, '$.time')) 
				END) as avg_click_speed,
				SUM(CASE WHEN e.type = 'hover' THEN 1 ELSE 0 END) as total_hovers,
				AVG(CASE WHEN e.type = 'hover' THEN 
					JSON_UNQUOTE(JSON_EXTRACT(e.metadata, '$.duration')) 
				END) as avg_hover_duration,
				COUNT(a.id) as answers_count,
				AVG(a.time_taken) as avg_answer_time
			FROM users u 
			LEFT JOIN events e ON u.id = e.uid 
			LEFT JOIN answers a ON u.id = a.uid
			GROUP BY u.id, u.username
			ORDER BY avg_hover_duration DESC
		`);

		// Question difficulty analysis (hesitation patterns)
		const [questionAnalysis] = await db.query(`
			SELECT 
				a.question,
				COUNT(a.id) as total_attempts,
				AVG(a.time_taken) as avg_time_spent,
				AVG(a.question_time) as avg_question_time,
				MAX(a.time_taken) as max_time_spent,
				COUNT(DISTINCT a.uid) as unique_users
			FROM answers a
			GROUP BY a.question
			ORDER BY avg_question_time DESC
		`);

		// Answer hover patterns
		const [answerHoverAnalysis] = await db.query(`
			SELECT 
				a.answer,
				COUNT(e.id) as hover_count,
				AVG(JSON_UNQUOTE(JSON_EXTRACT(e.metadata, '$.duration'))) as avg_hover_time
			FROM answers a
			LEFT JOIN events e ON a.uid = e.uid 
				AND e.type = 'hover' 
				AND JSON_EXTRACT(e.metadata, '$.target') LIKE CONCAT('%', a.answer, '%')
			GROUP BY a.answer
			HAVING hover_count > 0
			ORDER BY avg_hover_time DESC
		`);

		// Answer results analysis
		const [characterResults] = await db.query(`
			SELECT 
				a.answer as answer_type,
				COUNT(a.id) as result_count,
				ROUND(COUNT(a.id) * 100.0 / (SELECT COUNT(*) FROM answers), 2) as percentage
			FROM answers a
			GROUP BY a.answer
			ORDER BY result_count DESC
		`);

		// Behavior vs answer correlation
		const [behaviorCharacterCorrelation] = await db.query(`
			SELECT 
				a.answer as answer_type,
				AVG(user_stats.avg_click_speed) as avg_click_speed,
				AVG(user_stats.avg_hover_duration) as avg_hover_duration,
				AVG(user_stats.avg_answer_time) as avg_answer_time,
				COUNT(a.id) as user_count
			FROM answers a
			JOIN (
				SELECT 
					u.id,
					AVG(CASE WHEN e.type = 'click' THEN 
						JSON_UNQUOTE(JSON_EXTRACT(e.metadata, '$.time')) 
					END) as avg_click_speed,
					AVG(CASE WHEN e.type = 'hover' THEN 
						JSON_UNQUOTE(JSON_EXTRACT(e.metadata, '$.duration')) 
					END) as avg_hover_duration,
					AVG(a.time_taken) as avg_answer_time
				FROM users u 
				LEFT JOIN events e ON u.id = e.uid 
				LEFT JOIN answers a ON u.id = a.uid
				GROUP BY u.id
			) user_stats ON a.uid = user_stats.id
			GROUP BY a.answer
			ORDER BY user_count DESC
		`);

		res.json({
			userMetrics: userMetrics[0],
			userBehavior,
			questionAnalysis,
			answerHoverAnalysis,
			characterResults,
			behaviorCharacterCorrelation
		});
	} catch (error) {
		console.error("Admin analytics error:", error);
		res.status(500).json({ error: "Failed to get analytics data" });
	}
});

// Admin users endpoint with filtering capabilities
app.get("/admin/users", async (req, res) => {
	const db = getDB();
	const { 
		startDate, 
		endDate, 
		minEvents, 
		maxEvents, 
		browser, 
		os, 
		completedQuiz,
		sortBy = 'created_at',
		sortOrder = 'DESC',
		page = 1,
		limit = 20
	} = req.query;

	try {
		let whereConditions = [];
		let queryParams = [];

		// Build dynamic WHERE clause
		if (startDate) {
			whereConditions.push("u.created_at >= ?");
			queryParams.push(startDate);
		}
		if (endDate) {
			whereConditions.push("u.created_at <= ?");
			queryParams.push(endDate);
		}
		if (browser) {
			whereConditions.push("u.browser LIKE ?");
			queryParams.push(`%${browser}%`);
		}
		if (os) {
			whereConditions.push("u.os LIKE ?");
			queryParams.push(`%${os}%`);
		}
		if (completedQuiz === 'true') {
			whereConditions.push("answers_count > 0");
		} else if (completedQuiz === 'false') {
			whereConditions.push("answers_count IS NULL OR answers_count = 0");
		}

		const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

		// Get filtered users with pagination
		const offset = (parseInt(page) - 1) * parseInt(limit);
		const [users] = await db.query(`
			SELECT 
				u.id,
				u.username,
				u.email,
				u.browser,
				u.os,
				u.screen_width,
				u.screen_height,
				u.created_at,
				COUNT(e.id) as total_events,
				SUM(CASE WHEN e.type = 'click' THEN 1 ELSE 0 END) as click_count,
				SUM(CASE WHEN e.type = 'hover' THEN 1 ELSE 0 END) as hover_count,
				COUNT(a.id) as answers_count,
				AVG(a.time_taken) as avg_answer_time,
				SUM(a.time_taken) as total_time_spent
			FROM users u 
			LEFT JOIN events e ON u.id = e.uid 
			LEFT JOIN answers a ON u.id = a.uid
			${whereClause}
			GROUP BY u.id, u.username, u.email, u.browser, u.os, u.screen_width, u.screen_height, u.created_at
			HAVING ${minEvents ? `total_events >= ? AND ` : ''}${maxEvents ? `total_events <= ?` : '1=1'}
			ORDER BY ${sortBy} ${sortOrder}
			LIMIT ? OFFSET ?
		`, [...queryParams, ...(minEvents ? [parseInt(minEvents)] : []), ...(maxEvents ? [parseInt(maxEvents)] : []), parseInt(limit), offset]);

		// Get total count for pagination
		const [countResult] = await db.query(`
			SELECT COUNT(DISTINCT u.id) as total_count
			FROM users u 
			LEFT JOIN events e ON u.id = e.uid 
			LEFT JOIN answers a ON u.id = a.uid
			${whereClause}
			GROUP BY u.id
			HAVING ${minEvents ? `COUNT(e.id) >= ? AND ` : ''}${maxEvents ? `COUNT(e.id) <= ?` : '1=1'}
		`, [...queryParams, ...(minEvents ? [parseInt(minEvents)] : []), ...(maxEvents ? [parseInt(maxEvents)] : [])]);

		const totalCount = countResult.length;

		res.json({
			users,
			pagination: {
				currentPage: parseInt(page),
				totalPages: Math.ceil(totalCount / parseInt(limit)),
				totalCount,
				hasNext: offset + parseInt(limit) < totalCount,
				hasPrev: parseInt(page) > 1
			}
		});
	} catch (error) {
		console.error("Admin users error:", error);
		res.status(500).json({ error: "Failed to get users data" });
	}
});

// Admin events endpoint for behavior analysis
app.get("/admin/events", async (req, res) => {
	const db = getDB();
	const { 
		startDate, 
		endDate, 
		eventType, 
		userId,
		groupBy = 'day',
		page = 1,
		limit = 50
	} = req.query;

	try {
		let whereConditions = [];
		let queryParams = [];

		if (startDate) {
			whereConditions.push("e.created_at >= ?");
			queryParams.push(startDate);
		}
		if (endDate) {
			whereConditions.push("e.created_at <= ?");
			queryParams.push(endDate);
		}
		if (eventType) {
			whereConditions.push("e.type = ?");
			queryParams.push(eventType);
		}
		if (userId) {
			whereConditions.push("e.uid = ?");
			queryParams.push(userId);
		}

		const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

		// Determine GROUP BY clause based on grouping parameter
		let groupByClause;
		switch (groupBy) {
			case 'hour':
				groupByClause = "DATE_FORMAT(e.created_at, '%Y-%m-%d %H:00:00')";
				break;
			case 'day':
				groupByClause = "DATE(e.created_at)";
				break;
			case 'week':
				groupByClause = "YEARWEEK(e.created_at)";
				break;
			case 'month':
				groupByClause = "DATE_FORMAT(e.created_at, '%Y-%m-01')";
				break;
			default:
				groupByClause = "DATE(e.created_at)";
		}

		// Get events with grouping
		const offset = (parseInt(page) - 1) * parseInt(limit);
		const [events] = await db.query(`
			SELECT 
				${groupBy === 'none' ? 'e.id, e.uid, e.type, e.metadata, e.created_at, u.username' : `${groupByClause} as time_period`},
				${groupBy === 'none' ? '' : 'COUNT(e.id) as event_count,'}
				SUM(CASE WHEN e.type = 'click' THEN 1 ELSE 0 END) as click_count,
				SUM(CASE WHEN e.type = 'hover' THEN 1 ELSE 0 END) as hover_count,
				${groupBy === 'none' ? 'u.username' : 'COUNT(DISTINCT e.uid) as unique_users'}
			FROM events e
			JOIN users u ON e.uid = u.id
			${whereClause}
			${groupBy === 'none' ? '' : `GROUP BY ${groupByClause}`}
			ORDER BY ${groupBy === 'none' ? 'e.created_at' : 'time_period'} DESC
			${groupBy === 'none' ? `LIMIT ? OFFSET ?` : ''}
		`, [...queryParams, ...(groupBy === 'none' ? [parseInt(limit), offset] : [])]);

		// Get event type distribution
		const [eventTypeDistribution] = await db.query(`
			SELECT 
				e.type,
				COUNT(e.id) as count,
				ROUND(COUNT(e.id) * 100.0 / (SELECT COUNT(*) FROM events ${whereClause}), 2) as percentage
			FROM events e
			${whereClause}
			GROUP BY e.type
			ORDER BY count DESC
		`, queryParams);

		res.json({
			events,
			eventTypeDistribution,
			grouping: groupBy
		});
	} catch (error) {
		console.error("Admin events error:", error);
		res.status(500).json({ error: "Failed to get events data" });
	}
});

// Admin answers endpoint for quiz performance analysis
app.get("/admin/answers", async (req, res) => {
	const db = getDB();
	const { 
		startDate, 
		endDate, 
		userId,
		question,
		sortBy = 'created_at',
		sortOrder = 'DESC',
		page = 1,
		limit = 50
	} = req.query;

	try {
		let whereConditions = [];
		let queryParams = [];

		if (startDate) {
			whereConditions.push("a.created_at >= ?");
			queryParams.push(startDate);
		}
		if (endDate) {
			whereConditions.push("a.created_at <= ?");
			queryParams.push(endDate);
		}
		if (userId) {
			whereConditions.push("a.uid = ?");
			queryParams.push(userId);
		}
		if (question) {
			whereConditions.push("a.question LIKE ?");
			queryParams.push(`%${question}%`);
		}

		const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

		// Get answers with pagination
		const offset = (parseInt(page) - 1) * parseInt(limit);
		const [answers] = await db.query(`
			SELECT 
				a.id,
				a.uid,
				a.question,
				a.answer,
				a.time_taken,
				a.question_time,
				a.created_at,
				u.username,
				u.browser,
				u.os
			FROM answers a
			JOIN users u ON a.uid = u.id
			${whereClause}
			ORDER BY a.${sortBy} ${sortOrder}
			LIMIT ? OFFSET ?
		`, [...queryParams, parseInt(limit), offset]);

		// Get answer statistics
		const [answerStats] = await db.query(`
			SELECT 
				COUNT(a.id) as total_answers,
				COUNT(DISTINCT a.uid) as unique_users,
				AVG(a.time_taken) as avg_time_taken,
				AVG(a.question_time) as avg_question_time,
				MIN(a.time_taken) as fastest_answer,
				MAX(a.time_taken) as slowest_answer,
				COUNT(DISTINCT a.question) as unique_questions
			FROM answers a
			${whereClause}
		`, queryParams);

		// Get question performance analysis
		const [questionPerformance] = await db.query(`
			SELECT 
				a.question,
				COUNT(a.id) as attempt_count,
				COUNT(DISTINCT a.uid) as unique_users,
				AVG(a.time_taken) as avg_time,
				AVG(a.question_time) as avg_question_time,
				MIN(a.time_taken) as fastest_time,
				MAX(a.time_taken) as slowest_time,
				STDEV(a.time_taken) as time_deviation
			FROM answers a
			${whereClause}
			GROUP BY a.question
			ORDER BY avg_time DESC
		`, queryParams);

		res.json({
			answers,
			stats: answerStats[0],
			questionPerformance
		});
	} catch (error) {
		console.error("Admin answers error:", error);
		res.status(500).json({ error: "Failed to get answers data" });
	}
});

app.listen(4000, async () => {
	await initDB();
	console.log("Backend running on 4000");
});
