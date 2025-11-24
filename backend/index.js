const express = require("express");
const app = express();
app.use(express.json());
app.use(require("cors")());
require("dotenv").config();

const mysql = require("mysql2/promise");
const db = await mysql.createPool({
	host: "mysql",
	user: process.env.template.MYSQL_USER,
	password: process.env.template.MYSQL_PASSWORD,
	database: process.env.template.MYSQL_DATABASE,
});

//endpoint: register new user
app.post("/user", async (req, res) => {
	const { uid, browser, os, screen } = req.body;

	await db.query("INSERT INTO users (id, browser, os, screen_width, screen_height) VALUES (?, ?, ?, ?, ?)", [uid, browser, os, screen.width, screen.height]);

	res.json({ status: "ok" });
});

//endpoint: log events
app.post("/event", async (req, res) => {
	console.log("EVENT RECEIVED:", req.body); 
	const { uid, type, metadata } = req.body;

	await db.query("INSERT INTO events (uid, type, metadata) VALUES (?, ?, ?)", [uid, type, JSON.stringify(metadata)]);

	res.json({ status: "logged" });
});

//endpoint: store answers
app.post("/answer", async (req, res) => {
	const { uid, question, answer, time } = req.body;

	await db.query("INSERT INTO answers (uid, question, answer, time_taken) VALUES (?, ?, ?, ?)", [uid, question, answer, time]);

	res.json({ status: "saved" });
});

app.listen(4000, () => console.log("Backend running on 4000"));

//store and generate user ID
let uid = localStorage.getItem("uid");
if (!uid) {
	uid = crypto.randomUUID();
	localStorage.setItem("uid", uid);

	// Send user info to backend
	fetch("http://localhost:4000/user", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			uid,
			browser: navigator.userAgent,
			os: navigator.platform,
			screen: {
				width: window.innerWidth,
				height: window.innerHeight,
			},
		}),
	});
}


