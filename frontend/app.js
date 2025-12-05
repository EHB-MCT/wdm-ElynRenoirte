// Authentication logic
let currentUser = null;
let authToken = localStorage.getItem("authToken");

// Check if user is already logged in
if (authToken) {
	fetch("http://localhost:4000/me", {
		headers: {
			Authorization: `Bearer ${authToken}`,
		},
	})
		.then((res) => res.json())
		.then((data) => {
			if (data.user) {
				currentUser = data.user;
				showGameContainer();
			}
		})
		.catch((err) => {
			console.log("Token invalid, clearing it");
			localStorage.removeItem("authToken");
		});
}

// Login form submission
document.getElementById("loginFormElement").addEventListener("submit", async (e) => {
	e.preventDefault();

	try {
		const response = await fetch("http://localhost:4000/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});

		const data = await response.json();

		if (response.ok) {
			currentUser = data.user;
			authToken = data.token;
			localStorage.setItem("authToken", authToken);
			console.log("✅ User created successfully:", {
				id: data.user.id,
				username: data.user.username,
				email: data.user.email
			});
			showGameContainer();
		} else {
			alert(data.error || "Login failed");
		}
	} catch (error) {
		alert("Login failed: " + error.message);
	}
});

// Logout functionality
document.getElementById("logoutBtn").addEventListener("click", () => {
	currentUser = null;
	authToken = null;
	localStorage.removeItem("authToken");
	showAuthContainer();
});

function showGameContainer() {
	document.getElementById("loginForm").style.display = "none";
	document.getElementById("gameContainer").style.display = "block";
	document.getElementById("userDisplay").textContent = `Player: ${currentUser.username}`;
}

function showAuthContainer() {
	document.getElementById("gameContainer").style.display = "none";
	document.getElementById("loginForm").style.display = "block";
}

// Start quiz functionality
document.getElementById("startQuizBtn").addEventListener("click", () => {
	// You can add quiz logic here
	alert("Quiz functionality would start here!");
});

//track every click
document.addEventListener("click", (e) => {
	console.log("Click detected:", e.clientX, e.clientY, e.target.id);

	// Only track if user is logged in
	if (currentUser && authToken) {
		fetch("http://localhost:4000/event", {
			method: "POST",
			headers: { 
				"Content-Type": "application/json",
				"Authorization": `Bearer ${authToken}`
			},
			body: JSON.stringify({
				type: "click",
				metadata: {
					x: e.clientX,
					y: e.clientY,
					target: e.target.id,
				},
			}),
		});
	}
});

//track hover
function trackHover(element, answerText) {
	let start;

	element.addEventListener("mouseenter", () => {
		start = performance.now();
		console.log("Hover started on:", answerText);
	});

	element.addEventListener("mouseleave", () => {
		const duration = performance.now() - start;
		console.log("Hover ended on:", answerText, "Duration:", duration + "ms");

		// Only track if user is logged in
		if (currentUser && authToken) {
			fetch("http://localhost:4000/event", {
				method: "POST",
				headers: { 
					"Content-Type": "application/json",
					"Authorization": `Bearer ${authToken}`
				},
				body: JSON.stringify({
					type: "hover",
					metadata: { answerText, duration },
				}),
			});
		}
	});
}

// Example: Apply hover tracking to existing buttons
document.addEventListener("DOMContentLoaded", () => {
	// Track hover on buttons
	const loginBtn = document.querySelector("#loginFormElement button[type='submit']");
	const startQuizBtn = document.getElementById("startQuizBtn");
	const logoutBtn = document.getElementById("logoutBtn");

	if (loginBtn) trackHover(loginBtn, "Start Button");
	if (startQuizBtn) trackHover(startQuizBtn, "Start Quiz Button");
	if (logoutBtn) trackHover(logoutBtn, "Logout Button");
});
