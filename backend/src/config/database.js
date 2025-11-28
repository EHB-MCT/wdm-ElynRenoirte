const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

let db;

async function runMigrations() {
	try {
		const migrationFiles = ["001_initial.sql", "002_add_auth.sql"];

		for (const file of migrationFiles) {
			const migrationPath = path.join(__dirname, "../migrations", file);
			const migrationSQL = fs.readFileSync(migrationPath, "utf8");

			// Split the SQL file by semicolons and execute each statement
			const statements = migrationSQL
				.split(";")
				.map((stmt) => stmt.trim())
				.filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

			for (const statement of statements) {
				await db.query(statement);
			}
		}

		console.log("Migrations executed successfully");
	} catch (error) {
		console.error("Migration error:", error);
	}
}

async function initDB() {
	const maxRetries = 10;
	const retryDelay = 2000;

	for (let i = 0; i < maxRetries; i++) {
		try {
			db = await mysql.createPool({
				host: process.env.DB_HOST || "mysql",
				user: process.env.DB_USER || "root",
				password: process.env.DB_PASSWORD || "root",
				database: process.env.DB_NAME || "marvel",
				connectionLimit: 10,
			});

			// Test connection
			await db.query("SELECT 1");
			console.log("Database connected successfully");

			await runMigrations();
			return db;
		} catch (error) {
			console.log(`Database connection attempt ${i + 1}/${maxRetries} failed:`, error.message);
			if (i < maxRetries - 1) {
				console.log(`Retrying in ${retryDelay}ms...`);
				await new Promise((resolve) => setTimeout(resolve, retryDelay));
			} else {
				throw error;
			}
		}
	}
}

function getDB() {
	return db;
}

module.exports = {
	initDB,
	getDB,
};
