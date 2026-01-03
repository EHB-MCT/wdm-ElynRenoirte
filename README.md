# Marvel Personality Quiz

A web application where users can find out which marvel character they look most like based on personality questions. An admin has insight on the admin dashboard whether clicks and hovers contribute to someone getting a specific character as those are being tracked (as seen in the console when you are making the quiz).

# Features

Quiz:

- a UID gets assigned everytime a user starts the quiz, each user is stored in a database
- tracking of mouse clicks, hovers, time spent, their answers on each question, what character each user gets
- all this data gets stored in the database

Admin dashboard:

- charts to visualize the user's answers and their clicks & hovers
- different pages to keep it clean:
      - overview: how many users completed the quiz, what their most selected answers are etc
      - users: clear overview of all users who have competed the quiz and details about each of them like their hovers and clicks, filtering the users in a timeframe
      - analytics: user performance analysis, question difficulty (how long t took to complete questions)
      - behavior: information about hovers and clicks
      - results: which marvel characters users got the most as a result when completing the quiz, behavior vs character correlation
- charts are interactive and responsive

# Technology Stack

Backend:

- Node.js / Express: Backend API
- MySQL: Database to store users and their hovers, clicks and results
- Docker: Containerized backend and database setup

Frontend:

- HTML, CSS, JavaScript: Quiz and Admin Dashboard
- Chart.js: charts on dashboard for datavisualization

# Quick start of the application

1. clone the repository
2. run Docker in the terminal: docker compose up --build, make sure to open the desktop app too
3. open index.html with live server or with this: http://127.0.0.1:5500/frontend/index.html and then make the quiz (in the console you can see hovers, clicks etc being tracked)
4. open admin-dashboard.html with live server or with this: http://127.0.0.1:5500/frontend/admin-dashboard.html now you can see all the data that was stored in the database visualized
5. (the written report is also submitted in the comments in canvas if it can't be opened here)

# Sources

- videos on canvas to undestand docker
- chatgpt: helping with project setup and fixing errors https://chatgpt.com/share/695981c6-85f4-8003-b6e1-a5d87b0d7554
- opencode: helping with creating the dashboard and debugging https://opncd.ai/share/HhQg80IG
- opencode: fixing errors and helping to make better charts https://opncd.ai/share/7ZfnyWrL
- opencode: fixing errors and helping to make better charts https://opncd.ai/share/tVkPJ96I
