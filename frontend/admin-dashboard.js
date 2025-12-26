// Admin Dashboard JavaScript
class AdminDashboard {
	constructor() {
		this.apiBase = 'http://localhost:4000';
		this.currentSection = 'overview';
	 this.charts = {};
		this.usersData = [];
		this.analyticsData = {};
		this.init();
	}

	async init() {
		this.setupEventListeners();
		this.showLoading();
		await this.loadInitialData();
		this.hideLoading();
	}

	setupEventListeners() {
		// Navigation
		document.querySelectorAll('.nav-btn').forEach(btn => {
			btn.addEventListener('click', (e) => {
				this.switchSection(e.target.dataset.section);
			});
		});

		// Header controls
		document.getElementById('refreshBtn').addEventListener('click', () => {
			this.refreshData();
		});

		document.getElementById('logoutBtn').addEventListener('click', () => {
			this.logout();
		});

		// Filters
		document.getElementById('applyFilters').addEventListener('click', () => {
			this.applyUserFilters();
		});

		document.getElementById('clearFilters').addEventListener('click', () => {
			this.clearUserFilters();
		});

		// Modal
		document.querySelector('.modal-close').addEventListener('click', () => {
			this.closeModal();
		});

		// Close modal on outside click
		document.getElementById('userDetailModal').addEventListener('click', (e) => {
			if (e.target.id === 'userDetailModal') {
				this.closeModal();
			}
		});
	}

	switchSection(section) {
		// Update navigation
		document.querySelectorAll('.nav-btn').forEach(btn => {
			btn.classList.remove('active');
		});
		document.querySelector(`[data-section="${section}"]`).classList.add('active');

		// Update sections
		document.querySelectorAll('.dashboard-section').forEach(sec => {
			sec.classList.remove('active');
		});
		document.getElementById(`${section}Section`).classList.add('active');

		this.currentSection = section;

		// Load section-specific data
		this.loadSectionData(section);
	}

	async loadInitialData() {
		try {
			// Load analytics data for overview
			const analyticsResponse = await fetch(`${this.apiBase}/admin/analytics`);
			this.analyticsData = await analyticsResponse.json();

			// Load users data
			const usersResponse = await fetch(`${this.apiBase}/admin/users`);
			const usersData = await usersResponse.json();
			this.usersData = usersData.users;

			// Update overview section
			this.updateOverview();
		} catch (error) {
			console.error('Error loading initial data:', error);
			this.showError('Failed to load dashboard data');
		}
	}

	async loadSectionData(section) {
		this.showLoading();

		try {
			switch (section) {
				case 'overview':
					await this.loadOverviewData();
					break;
				case 'users':
					await this.loadUsersData();
					break;
				case 'analytics':
					await this.loadAnalyticsData();
					break;
				case 'behavior':
					await this.loadBehaviorData();
					break;
				case 'results':
					await this.loadResultsData();
					break;
			}
		} catch (error) {
			console.error(`Error loading ${section} data:`, error);
			this.showError(`Failed to load ${section} data`);
		} finally {
			this.hideLoading();
		}
	}

	async loadOverviewData() {
		// Overview data already loaded in loadInitialData
		this.updateOverview();
	}

	updateOverview() {
		const { userMetrics, characterResults, userBehavior } = this.analyticsData;

		// Update metrics cards
		document.getElementById('totalUsers').textContent = userMetrics.total_users || 0;
		document.getElementById('quizCompletions').textContent = userMetrics.users_completed_quiz || 0;
		document.getElementById('avgTimeSpent').textContent = this.formatTime(userMetrics.avg_time_spent);
		
		const completionRate = userMetrics.total_users > 0 
			? Math.round((userMetrics.users_completed_quiz / userMetrics.total_users) * 100)
			: 0;
		document.getElementById('completionRate').textContent = `${completionRate}%`;

		// Update charts
		this.updateUserGrowthChart();
		this.updateCharacterChart(characterResults);
		this.updateRecentActivity();
	}

	updateUserGrowthChart() {
		const ctx = document.getElementById('userGrowthChart').getContext('2d');
		
		// Destroy existing chart if it exists
		if (this.charts.userGrowth) {
			this.charts.userGrowth.destroy();
		}

		// Group users by creation date
		const userDates = {};
		this.usersData.forEach(user => {
			const date = new Date(user.created_at).toLocaleDateString();
			userDates[date] = (userDates[date] || 0) + 1;
		});

		const sortedDates = Object.keys(userDates).sort();
		const cumulativeUsers = [];
		let total = 0;
		sortedDates.forEach(date => {
			total += userDates[date];
			cumulativeUsers.push(total);
		});

		this.charts.userGrowth = new Chart(ctx, {
			type: 'line',
			data: {
				labels: sortedDates,
				datasets: [{
					label: 'Cumulative Users',
					data: cumulativeUsers,
					borderColor: '#007bff',
					backgroundColor: 'rgba(0, 123, 255, 0.1)',
					fill: true,
					tension: 0.4
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: false
					}
				},
				scales: {
					y: {
						beginAtZero: true
					}
				}
			}
		});
	}

	updateCharacterChart(characterResults) {
		const ctx = document.getElementById('characterChart').getContext('2d');
		
		if (this.charts.character) {
			this.charts.character.destroy();
		}
		
		// Group answers by character result for better visualization
		const characterGroups = {};
		characterResults.forEach(result => {
			const character = result.answer_type || result.character;
			if (!characterGroups[character]) {
				characterGroups[character] = [];
			}
		});
		
		// Get all answers for each character
		const allAnswers = characterResults.map(r => r.answer_type || r.character);
		const uniqueCharacters = [...new Set(allAnswers)];
		
		// Build data for stacked bar chart showing answer distribution
		const datasets = uniqueCharacters.map((character, index) => {
			const characterData = characterResults.filter(r => 
				(r.answer_type || r.character) === character
			);
			
			// Count answers per character
			const answerCounts = {};
			characterData.forEach(result => {
				const answer = result.answer_type || result.character;
				answerCounts[answer] = (answerCounts[answer] || 0) + 1;
			});
			
			const colors = [
				'#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
				'#9966FF', '#FF9F40', '#FFD700', '#FF69B4',
				'#00BCD4', '#FF6B6B', '#4ECDC4', '#F8F9FA',
				'#E91E63', '#9C27B0', '#2196F3'
			];
			
			return {
				label: character,
				data: Object.values(answerCounts).sort((a, b) => b - a).slice(0, 5), // Top 5 answers
				backgroundColor: colors[index % colors.length],
				borderColor: colors[index % colors.length]
			};
		});
		
		this.charts.character = new Chart(ctx, {
			type: 'bar',
			data: {
				labels: uniqueCharacters,
				datasets: [{
					label: 'Most Common Answers',
					data: datasets.map(d => d.data[0] || 0), // Take top answer as primary
					backgroundColor: '#007bff',
					borderColor: '#0056b3',
					borderWidth: 2
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				indexAxis: 'x',
				scales: {
					y: {
						beginAtZero: true,
						title: {
							display: true,
							text: 'Number of Selections'
						}
					},
					x: {
						title: {
							display: true,
							text: 'Marvel Characters'
						}
					}
				},
				plugins: {
					legend: {
						display: false
					},
					tooltip: {
						callbacks: {
							label: function(context) {
								const character = context[0].label;
								const value = context[0].raw;
								const total = context[0].dataset.data.reduce((a, b) => a + b, 0);
								const percentage = ((value / total) * 100).toFixed(1);
								return `${character}: ${value} selections (${percentage}%)`;
							}
						}
					}
				}
			}
		});

		// Initialize individual character detail charts
		this.updateCharacterDetailCharts(characterResults);
	}

	// Create individual doughnut charts for each Marvel character
	updateCharacterDetailCharts(characterResults) {
		// Destroy existing character detail charts
		const chartIds = ['blackWidowChart', 'ironManChart', 'spiderManChart', 'captainAmericaChart', 'thorChart', 'hulkChart', 'hawkeyeChart', 'doctorStrangeChart'];
		chartIds.forEach(id => {
			const existingChart = this.charts[id];
			if (existingChart) {
				existingChart.destroy();
			}
		});

		// Create charts for each major character
		this.createCharacterChart('blackWidowChart', characterResults, 'Black Widow', '#FF6384');
		this.createCharacterChart('ironManChart', characterResults, 'Iron Man', '#FF6B6B');
		this.createCharacterChart('spiderManChart', characterResults, 'Spider-Man', '#FF5B21');
		this.createCharacterChart('captainAmericaChart', characterResults, 'Captain America', '#002B5C');
		this.createCharacterChart('thorChart', characterResults, 'Thor', '#F8F9FA');
		this.createCharacterChart('hulkChart', characterResults, 'Hulk', '#FF7000');
		this.createCharacterChart('hawkeyeChart', characterResults, 'Hawkeye', '#FFD700');
		this.createCharacterChart('doctorStrangeChart', characterResults, 'Doctor Strange', '#FF5733');
	}

	// Helper function to create individual character charts
	createCharacterChart(canvasId, characterResults, characterName, primaryColor) {
		const ctx = document.getElementById(canvasId);
		if (!ctx) return;

		// Filter results for this character
		const characterData = characterResults.filter(r => 
			(r.answer_type || r.character) === characterName
		);

		// Count answer occurrences
		const answerCounts = {};
		characterData.forEach(result => {
			const answer = result.answer_type || result.character;
			answerCounts[answer] = (answerCounts[answer] || 0) + 1;
		});

		// Get top 5 answers
		const topAnswers = Object.entries(answerCounts)
			.sort(([,a], [,b]) => b - a)
			.slice(0, 5);

		this.charts[canvasId] = new Chart(ctx, {
			type: 'doughnut',
			data: {
				labels: topAnswers.map(([answer]) => answer),
				datasets: [{
					data: topAnswers.map(([, count]) => count),
					backgroundColor: [
						primaryColor,
						'#FFA500', '#FFCE56', '#FFC107', '#FF9800'
					],
					borderWidth: 2,
					borderColor: '#fff'
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: true,
						position: 'bottom',
						labels: {
							padding: 15,
							usePointStyle: true
						}
					},
					title: {
						display: true,
						text: `${characterName} Answer Distribution`
					},
					tooltip: {
						callbacks: {
							label: function(context) {
								const answer = context[0].label;
								const count = context[0].raw;
								return `${answer}: ${count} selections`;
							}
						}
					}
				}
			}
		});
	}

	updateRecentActivity() {
		const activityContainer = document.getElementById('recentActivity');
		activityContainer.innerHTML = '';

		// Get recent events from user behavior data
		const recentActivities = this.usersData
			.slice(0, 10)
			.map(user => ({
				username: user.username,
				type: 'Quiz Completed',
				time: new Date(user.created_at).toLocaleString(),
				events: user.total_events
			}));

		recentActivities.forEach(activity => {
			const activityItem = document.createElement('div');
			activityItem.className = 'activity-item';
			activityItem.innerHTML = `
				<div>
					<span class="activity-user">${activity.username}</span>
					<span class="activity-type">${activity.type}</span>
				</div>
				<span class="activity-time">${activity.time}</span>
			`;
			activityContainer.appendChild(activityItem);
		});
	}

	async loadUsersData() {
		try {
			const response = await fetch(`${this.apiBase}/admin/users`);
			const data = await response.json();
			this.usersData = data.users;
			this.updateUsersTable(data.users);
			this.updateUsersPagination(data.pagination);
		} catch (error) {
			console.error('Error loading users data:', error);
			throw error;
		}
	}

	updateUsersTable(users) {
		const tbody = document.getElementById('usersTableBody');
		tbody.innerHTML = '';

		users.forEach(user => {
			const row = document.createElement('tr');
			row.innerHTML = `
				<td>${user.username}</td>
				<td>${user.email || 'N/A'}</td>
				<td>${user.browser || 'N/A'}</td>
				<td>${user.os || 'N/A'}</td>
				<td>${user.total_events || 0}</td>
				<td>${user.answers_count || 0}</td>
				<td>${this.formatTime(user.avg_answer_time)}</td>
				<td>
					<button onclick="dashboard.showUserDetail('${user.id}')" class="btn-sm">
						View Details
					</button>
				</td>
			`;
			tbody.appendChild(row);
		});
	}

	updateUsersPagination(pagination) {
		const paginationContainer = document.getElementById('usersPagination');
		paginationContainer.innerHTML = '';

		// Previous button
		const prevBtn = document.createElement('button');
		prevBtn.textContent = 'Previous';
		prevBtn.disabled = !pagination.hasPrev;
		prevBtn.onclick = () => this.loadUsersPage(pagination.currentPage - 1);
		paginationContainer.appendChild(prevBtn);

		// Page numbers
		for (let i = 1; i <= pagination.totalPages; i++) {
			const pageBtn = document.createElement('button');
			pageBtn.textContent = i;
			pageBtn.className = i === pagination.currentPage ? 'active' : '';
			pageBtn.onclick = () => this.loadUsersPage(i);
			paginationContainer.appendChild(pageBtn);
		}

		// Next button
		const nextBtn = document.createElement('button');
		nextBtn.textContent = 'Next';
		nextBtn.disabled = !pagination.hasNext;
		nextBtn.onclick = () => this.loadUsersPage(pagination.currentPage + 1);
		paginationContainer.appendChild(nextBtn);
	}

	async loadUsersPage(page) {
		try {
			const response = await fetch(`${this.apiBase}/admin/users?page=${page}`);
			const data = await response.json();
			this.updateUsersTable(data.users);
			this.updateUsersPagination(data.pagination);
		} catch (error) {
			console.error('Error loading users page:', error);
		}
	}

	async loadAnalyticsData() {
		const { userBehavior, questionAnalysis } = this.analyticsData;
		
		this.updateUserPerformanceInsights(userBehavior);
		this.updateQuestionDifficultyChart(questionAnalysis);
		this.updateQuestionDifficultyTable(questionAnalysis);
	}

	updateUserPerformanceInsights(userBehavior) {
		const container = document.getElementById('userPerformanceInsights');
		container.innerHTML = '';

		// Find most hesitant user
		const mostHesitant = userBehavior
			.filter(u => u.avg_hover_duration)
			.sort((a, b) => parseFloat(b.avg_hover_duration) - parseFloat(a.avg_hover_duration))[0];

		// Find fastest clicker
		const fastestClicker = userBehavior
			.filter(u => u.avg_click_speed)
			.sort((a, b) => parseFloat(a.avg_click_speed) - parseFloat(b.avg_click_speed))[0];

		// Find slowest answerer
		const slowestAnswerer = userBehavior
			.filter(u => u.avg_answer_time)
			.sort((a, b) => parseFloat(b.avg_answer_time) - parseFloat(a.avg_answer_time))[0];

		const insights = [
			{
				title: 'Most Hesitant User',
				value: mostHesitant?.username || 'N/A',
				description: `Average hover: ${this.formatTime(mostHesitant?.avg_hover_duration)}`
			},
			{
				title: 'Fastest Clicker',
				value: fastestClicker?.username || 'N/A',
				description: `Average click time: ${this.formatTime(fastestClicker?.avg_click_speed)}`
			},
			{
				title: 'Slowest Answerer',
				value: slowestAnswerer?.username || 'N/A',
				description: `Average answer time: ${this.formatTime(slowestAnswerer?.avg_answer_time)}`
			}
		];

		insights.forEach(insight => {
			const insightItem = document.createElement('div');
			insightItem.className = 'insight-item';
			insightItem.innerHTML = `
				<div class="insight-title">${insight.title}</div>
				<div class="insight-value">${insight.value}</div>
				<div class="insight-description">${insight.description}</div>
			`;
			container.appendChild(insightItem);
		});
	}

	updateQuestionDifficultyChart(questionAnalysis) {
		const ctx = document.getElementById('questionDifficultyChart').getContext('2d');
		
		if (this.charts.questionDifficulty) {
			this.charts.questionDifficulty.destroy();
		}

		this.charts.questionDifficulty = new Chart(ctx, {
			type: 'bar',
			data: {
				labels: questionAnalysis.map(q => q.question.substring(0, 50) + '...'),
				datasets: [{
					label: 'Average Question Time (seconds)',
					data: questionAnalysis.map(q => parseFloat(q.avg_question_time) || 0),
					backgroundColor: '#FF6384'
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: false
					}
				},
				scales: {
					y: {
						beginAtZero: true,
						title: {
							display: true,
							text: 'Time (seconds)'
						}
					}
				}
			}
		});
	}

	updateQuestionDifficultyTable(questionAnalysis) {
		const container = document.getElementById('questionDifficultyTable');
		container.innerHTML = `
			<table class="data-table">
				<thead>
					<tr>
						<th>Question</th>
						<th>Attempts</th>
						<th>Avg Time</th>
						<th>Max Time</th>
					</tr>
				</thead>
				<tbody>
					${questionAnalysis.map(q => `
						<tr>
							<td>${q.question}</td>
							<td>${q.total_attempts}</td>
							<td>${this.formatTime(q.avg_time)}</td>
							<td>${this.formatTime(q.max_time_spent)}</td>
						</tr>
					`).join('')}
				</tbody>
			</table>
		`;
	}

	async loadBehaviorData() {
		const { answerHoverAnalysis, userBehavior } = this.analyticsData;
		
		this.updateEventDistributionChart();
		this.updateHoverAnalysisTable(answerHoverAnalysis);
		this.updateClickSpeedChart(userBehavior);
	}

	updateEventDistributionChart() {
		// This would need additional API call for event distribution
		// For now, showing a placeholder
		const ctx = document.getElementById('eventDistributionChart').getContext('2d');
		
		if (this.charts.eventDistribution) {
			this.charts.eventDistribution.destroy();
		}

		this.charts.eventDistribution = new Chart(ctx, {
			type: 'pie',
			data: {
				labels: ['Clicks', 'Hovers'],
				datasets: [{
					data: [65, 35],
					backgroundColor: ['#36A2EB', '#FF6384']
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false
			}
		});
	}

	updateHoverAnalysisTable(hoverAnalysis) {
		const container = document.getElementById('hoverAnalysisTable');
		
		if (!hoverAnalysis || hoverAnalysis.length === 0) {
			container.innerHTML = '<p>No hover data available</p>';
			return;
		}

		container.innerHTML = `
			<table class="data-table">
				<thead>
					<tr>
						<th>Answer</th>
						<th>Hover Count</th>
						<th>Avg Hover Time</th>
					</tr>
				</thead>
				<tbody>
					${hoverAnalysis.map(hover => `
						<tr>
							<td>${hover.answer}</td>
							<td>${hover.hover_count}</td>
							<td>${this.formatTime(hover.avg_hover_time)}</td>
						</tr>
					`).join('')}
				</tbody>
			</table>
		`;
	}

	updateClickSpeedChart(userBehavior) {
		const ctx = document.getElementById('clickSpeedChart').getContext('2d');
		
		if (this.charts.clickSpeed) {
			this.charts.clickSpeed.destroy();
		}

		const validClickSpeeds = userBehavior
			.filter(u => u.avg_click_speed)
			.map(u => parseFloat(u.avg_click_speed))
			.sort((a, b) => a - b);

		this.charts.clickSpeed = new Chart(ctx, {
			type: 'line',
			data: {
				labels: validClickSpeeds.map((_, i) => `User ${i + 1}`),
				datasets: [{
					label: 'Click Speed (seconds)',
					data: validClickSpeeds,
					borderColor: '#36A2EB',
					backgroundColor: 'rgba(54, 162, 235, 0.1)',
					fill: true
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: false
					}
				},
				scales: {
					y: {
						beginAtZero: true,
						title: {
							display: true,
							text: 'Time (seconds)'
						}
					}
				}
			}
		});
	}

	async loadResultsData() {
		const { characterResults, behaviorCharacterCorrelation } = this.analyticsData;
		
		this.updateCharacterResultsChart(characterResults);
		this.updateCharacterResultsTable(characterResults);
		this.updateCorrelationTable(behaviorCharacterCorrelation);
	}

	updateCharacterResultsChart(characterResults) {
		const ctx = document.getElementById('characterResultsChart').getContext('2d');
		
		if (this.charts.characterResults) {
			this.charts.characterResults.destroy();
		}

		this.charts.characterResults = new Chart(ctx, {
			type: 'bar',
			data: {
				labels: characterResults.map(r => r.answer_type || r.character),
				datasets: [{
					label: 'Number of Results',
					data: characterResults.map(r => r.result_count),
					backgroundColor: '#4BC0C0'
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: false
					}
				},
				scales: {
					y: {
						beginAtZero: true
					}
				}
			}
		});
	}

	updateCharacterResultsTable(characterResults) {
		const container = document.getElementById('characterResultsTable');
		container.innerHTML = `
			<table class="data-table">
				<thead>
					<tr>
						<th>Character</th>
						<th>Count</th>
						<th>Percentage</th>
					</tr>
				</thead>
				<tbody>
					${characterResults.map(result => `
						<tr>
							<td>${result.character}</td>
							<td>${result.result_count}</td>
							<td>${result.percentage}%</td>
						</tr>
					`).join('')}
				</tbody>
			</table>
		`;
	}

	updateCorrelationTable(correlation) {
		const container = document.getElementById('correlationTable');
		container.innerHTML = `
			<table class="data-table">
				<thead>
					<tr>
						<th>Character</th>
						<th>Avg Click Speed</th>
						<th>Avg Hover Duration</th>
						<th>Avg Answer Time</th>
						<th>User Count</th>
					</tr>
				</thead>
				<tbody>
					${correlation.map(corr => `
						<tr>
							<td>${corr.character}</td>
							<td>${this.formatTime(corr.avg_click_speed)}</td>
							<td>${this.formatTime(corr.avg_hover_duration)}</td>
							<td>${this.formatTime(corr.avg_answer_time)}</td>
							<td>${corr.user_count}</td>
						</tr>
					`).join('')}
				</tbody>
			</table>
		`;
	}

	async showUserDetail(userId) {
		try {
			const user = this.usersData.find(u => u.id === userId);
			if (!user) return;

			const modalContent = document.getElementById('userDetailContent');
			modalContent.innerHTML = `
				<div class="user-detail">
					<h4>${user.username}</h4>
					<p><strong>Email:</strong> ${user.email || 'N/A'}</p>
					<p><strong>Browser:</strong> ${user.browser || 'N/A'}</p>
					<p><strong>OS:</strong> ${user.os || 'N/A'}</p>
					<p><strong>Screen:</strong> ${user.screen_width || 'N/A'} x ${user.screen_height || 'N/A'}</p>
					<p><strong>Total Events:</strong> ${user.total_events || 0}</p>
					<p><strong>Click Count:</strong> ${user.click_count || 0}</p>
					<p><strong>Hover Count:</strong> ${user.hover_count || 0}</p>
					<p><strong>Answers Count:</strong> ${user.answers_count || 0}</p>
					<p><strong>Average Answer Time:</strong> ${this.formatTime(user.avg_answer_time)}</p>
					<p><strong>Total Time Spent:</strong> ${this.formatTime(user.total_time_spent)}</p>
					<p><strong>Member Since:</strong> ${new Date(user.created_at).toLocaleString()}</p>
				</div>
			`;

			document.getElementById('userDetailModal').style.display = 'block';
		} catch (error) {
			console.error('Error showing user detail:', error);
		}
	}

	closeModal() {
		document.getElementById('userDetailModal').style.display = 'none';
	}

	async applyUserFilters() {
		const startDate = document.getElementById('startDate').value;
		const endDate = document.getElementById('endDate').value;
		const browser = document.getElementById('browserFilter').value;
		const quizStatus = document.getElementById('quizStatusFilter').value;

		const params = new URLSearchParams();
		if (startDate) params.append('startDate', startDate);
		if (endDate) params.append('endDate', endDate);
		if (browser) params.append('browser', browser);
		if (quizStatus) params.append('completedQuiz', quizStatus);

		try {
			this.showLoading();
			const response = await fetch(`${this.apiBase}/admin/users?${params}`);
			const data = await response.json();
			this.usersData = data.users;
			this.updateUsersTable(data.users);
			this.updateUsersPagination(data.pagination);
		} catch (error) {
			console.error('Error applying filters:', error);
			this.showError('Failed to apply filters');
		} finally {
			this.hideLoading();
		}
	}

	clearUserFilters() {
		document.getElementById('startDate').value = '';
		document.getElementById('endDate').value = '';
		document.getElementById('browserFilter').value = '';
		document.getElementById('quizStatusFilter').value = '';
		
		this.loadUsersData();
	}

	async refreshData() {
		await this.loadInitialData();
		this.loadSectionData(this.currentSection);
	}

	logout() {
		// Clear any stored auth data
		localStorage.removeItem('authToken');
		localStorage.removeItem('user');
		
		// Redirect to main game
		window.location.href = 'index.html';
	}

	showLoading() {
		document.getElementById('loadingOverlay').style.display = 'flex';
	}

	hideLoading() {
		document.getElementById('loadingOverlay').style.display = 'none';
	}

	showError(message) {
		// Create error notification
		const errorDiv = document.createElement('div');
		errorDiv.className = 'error-notification';
		errorDiv.textContent = message;
		errorDiv.style.cssText = `
			position: fixed;
			top: 20px;
			right: 20px;
			background: #dc3545;
			color: white;
			padding: 1rem;
			border-radius: 6px;
			z-index: 3000;
			box-shadow: 0 4px 8px rgba(0,0,0,0.2);
		`;

		document.body.appendChild(errorDiv);

		// Remove after 3 seconds
		setTimeout(() => {
			if (errorDiv.parentNode) {
				errorDiv.parentNode.removeChild(errorDiv);
			}
		}, 3000);
	}

	formatTime(time) {
		if (!time || time === null) return 'N/A';
		const seconds = parseFloat(time);
		if (seconds < 60) {
			return `${seconds.toFixed(1)}s`;
		}
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = (seconds % 60).toFixed(1);
		return `${minutes}m ${remainingSeconds}s`;
	}
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
	window.dashboard = new AdminDashboard();
});