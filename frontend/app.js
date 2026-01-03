// Authentication logic
let currentUser = null;
let authToken = localStorage.getItem("authToken");

// Quiz state
let currentQuestionIndex = 0;
let userAnswers = [];
let quizStartTime = null;

// Quiz questions data
const quizQuestions = [
	{
		question: "What is your favourite color?",
		answers: ["red", "yellow", "green", "blue", "purple"],
	},
	{
		question: "What do you like to do in your free time?",
		answers: ["watch netflix", "read", "do homework", "sleep"],
	},
	{
		question: "Pick a subject!",
		answers: ["math", "english", "history", "biology", "gym", "geography"],
	},
	{
		question: "Pick an animal!",
		answers: ["cat", "dog", "rabbit", "hamster"],
	},
	{
		question: "Pick a beverage!",
		answers: ["water", "tea", "soda", "alcohol"],
	},
	{
		question: "What's your favorite infinity stone?",
		answers: ["mind", "time", "power", "space", "reality", "soul"],
	},
];

// Marvel character results based on answers
const characterResults = {
	"Iron Man": {
		traits: ["red", "blue", "mind", "space", "read", "math"],
		description: "You're Tony Stark! Brilliant, witty, and always thinking ahead. Your intelligence and innovation make you a natural leader.",
	},
	"Captain America": {
		traits: ["blue", "red", "power", "gym", "history", "dog"],
		description: "You're Steve Rogers! Honorable, brave, and always standing up for what's right. Your moral compass guides you through any challenge.",
	},
	Thor: {
		traits: ["red", "blue", "power", "time", "gym", "dog"],
		description: "You're Thor! Powerful, confident, and with a heart of gold. You wield your strength with wisdom and compassion.",
	},
	Hulk: {
		traits: ["green", "power", "anger", "strength", "biology"],
		description: "You're Bruce Banner! Intelligent and complex, with incredible power that you're learning to control. Your duality makes you unique.",
	},
	"Black Widow": {
		traits: ["red", "black", "time", "reality", "read", "cat"],
		description: "You're Natasha Romanoff! Skilled, mysterious, and fiercely loyal. Your past has made you strong and adaptable.",
	},
	Hawkeye: {
		traits: ["purple", "blue", "time", "precision", "focus", "dog"],
		description: "You're Clint Barton! Precise, reliable, and always hitting your mark. Your focus and dedication make you invaluable.",
	},
	"Spider-Man": {
		traits: ["red", "blue", "time", "responsibility", "science", "cat"],
		description: "You're Peter Parker! Smart, responsible, and always trying to do the right thing. Your wit and heart make you a hero.",
	},
	"Doctor Strange": {
		traits: ["purple", "red", "time", "reality", "mind", "read"],
		description: "You're Stephen Strange! Wise, powerful, and guardian of reality itself. Your knowledge transcends ordinary understanding.",
	},
};

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
				email: data.user.email,
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
	startQuiz();
});

// Quiz logout functionality
document.getElementById("logoutBtnQuiz").addEventListener("click", () => {
	currentUser = null;
	authToken = null;
	localStorage.removeItem("authToken");
	showAuthContainer();
});

// Restart quiz functionality
document.getElementById("restartQuiz").addEventListener("click", () => {
	startQuiz();
});

// Back to menu functionality
document.getElementById("backToMenu").addEventListener("click", () => {
	// Reset quiz state
	currentQuestionIndex = 0;
	userAnswers = [];
	document.getElementById("quizContent").style.display = "block";
	document.getElementById("resultsContainer").style.display = "none";

	showGameContainer();
});

function startQuiz() {
	currentQuestionIndex = 0;
	userAnswers = [];
	quizStartTime = performance.now();
	showQuizContainer();

	// Reset quiz display
	document.getElementById("quizContent").style.display = "block";
	document.getElementById("resultsContainer").style.display = "none";

	displayQuestion();
}

function showQuizContainer() {
	document.getElementById("loginForm").style.display = "none";
	document.getElementById("gameContainer").style.display = "none";
	document.getElementById("quizContainer").style.display = "block";
	document.getElementById("userDisplayQuiz").textContent = `Player: ${currentUser.username}`;
}

function displayQuestion() {
	const question = quizQuestions[currentQuestionIndex];
	const questionText = document.getElementById("questionText");
	const answersContainer = document.getElementById("answersContainer");
	const progressText = document.getElementById("progressText");
	const progressFill = document.getElementById("progressFill");

	// Update progress
	progressText.textContent = `Question ${currentQuestionIndex + 1} of ${quizQuestions.length}`;
	progressFill.style.width = `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%`;

	// Display question
	questionText.textContent = question.question;

	// Clear and populate answers
	answersContainer.innerHTML = "";
	question.answers.forEach((answer, index) => {
		const answerButton = document.createElement("button");
		answerButton.className = "answer-button";
		answerButton.textContent = answer.charAt(0).toUpperCase() + answer.slice(1);
		answerButton.addEventListener("click", () => selectAnswer(answer));
		answersContainer.appendChild(answerButton);

		// Add hover tracking
		trackHover(answerButton, answer);
	});
}

function selectAnswer(answer) {
	//track time spent on each question
	const timeTaken = performance.now() - quizStartTime;

	// Store answer
	userAnswers.push({
		question: quizQuestions[currentQuestionIndex].question,
		answer: answer,
		time: timeTaken,
	});

	// Send answer to backend
	if (currentUser && authToken) {
		fetch("http://localhost:4000/answer", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${authToken}`,
			},
			body: JSON.stringify({
				uid: currentUser.id,
				question: quizQuestions[currentQuestionIndex].question,
				answer: answer,
				time: timeTaken,
			}),
		});
	}

	// Move to next question or show results
	currentQuestionIndex++;
	if (currentQuestionIndex < quizQuestions.length) {
		displayQuestion();
	} else {
		showResults();
	}
}

function showResults() {
	document.getElementById("quizContent").style.display = "none";
	document.getElementById("resultsContainer").style.display = "block";

	const character = calculateCharacter();
	const resultCharacter = document.getElementById("resultCharacter");
	const resultDescription = document.getElementById("resultDescription");

	resultCharacter.innerHTML = `<h2>${character}</h2>`;
	resultDescription.textContent = characterResults[character].description;

	// Save the final result to database
	if (currentUser && authToken) {
		const totalTime = performance.now() - quizStartTime;

		fetch("http://localhost:4000/answer", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${authToken}`,
			},
			body: JSON.stringify({
				uid: currentUser.id,
				question: "QUIZ_RESULT",
				answer: character,
				time: totalTime,
			}),
		})
			.then((response) => {
				console.log("Quiz result saved:", character);
			})
			.catch((error) => {
				console.error("Error saving quiz result:", error);
			});
	}
}

function calculateCharacter() {
	// Simple scoring system based on answer matches
	let scores = {};

	// Initialize scores
	Object.keys(characterResults).forEach((character) => {
		scores[character] = 0;
	});

	// Score each character based on user answers
	userAnswers.forEach((userAnswer) => {
		Object.keys(characterResults).forEach((character) => {
			if (characterResults[character].traits.some((trait) => userAnswer.answer.toLowerCase().includes(trait.toLowerCase()))) {
				scores[character]++;
			}
		});
	});

	// Find character with highest score
	let maxScore = 0;
	let result = "Iron Man"; // default

	Object.keys(scores).forEach((character) => {
		if (scores[character] > maxScore) {
			maxScore = scores[character];
			result = character;
		}
	});

	// If no clear winner, use some logic based on specific answers
	if (maxScore === 0) {
		const firstAnswer = userAnswers[0]?.answer?.toLowerCase();
		if (firstAnswer?.includes("red") || firstAnswer?.includes("blue")) {
			result = "Iron Man";
		} else if (firstAnswer?.includes("green")) {
			result = "Hulk";
		} else if (firstAnswer?.includes("purple")) {
			result = "Doctor Strange";
		} else {
			result = "Spider-Man";
		}
	}

	return result;
}

//track every click
document.addEventListener("click", (e) => {
	console.log("Click detected:", e.clientX, e.clientY, e.target.id);

	// Only track if user is logged in
	if (currentUser && authToken) {
		fetch("http://localhost:4000/event", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${authToken}`,
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
					Authorization: `Bearer ${authToken}`,
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
	const logoutBtnQuiz = document.getElementById("logoutBtnQuiz");
	const restartQuizBtn = document.getElementById("restartQuiz");
	const backToMenuBtn = document.getElementById("backToMenu");

	if (loginBtn) trackHover(loginBtn, "Start Button");
	if (startQuizBtn) trackHover(startQuizBtn, "Start Quiz Button");
	if (logoutBtn) trackHover(logoutBtn, "Logout Button");
	if (logoutBtnQuiz) trackHover(logoutBtnQuiz, "Quiz Logout Button");
	if (restartQuizBtn) trackHover(restartQuizBtn, "Restart Quiz Button");
	if (backToMenuBtn) trackHover(backToMenuBtn, "Back to Menu Button");
});
