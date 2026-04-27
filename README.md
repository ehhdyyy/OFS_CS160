# OFS - Full Stack App (FastAPI + React/Vite + MySQL)

Full Stack Web Application  
**Frontend:** React + Vite  
**Backend:** FastAPI (Python)  
**Database:** MySQL

---

# Overview

OFS is a new organic retailer in Downtown San Jose. OFS’s mission is to improve accessibility of quality foods by providing a reliable online ordering and home delivery service for organic groceries. OFS plans to use a fleet of self-driving robotic delivery vehicles to reduce the hassle of shopping in a dense, traffic-congested downtown area.

This project is a full-stack web application that allows users to register, login, and interact with the OFS system.

The system consists of:
- React frontend (served by Vite on port 5173)
- FastAPI backend (served on port 8000)
- MySQL Database (default port 3306)

---

# 🗃️ Dockerized Setup

This project is packaged with Docker so another user can run the application locally with minimal setup.

## ⚙️ Prerequisites

Install the following:

- Docker Desktop
- Git 
- MySQL Workbench


## 1. 📄 Clone the Repository

```bash
git clone https://github.com/ehhdyyy/OFS_CS160.git
cd OFS_CS160
```
## 2. 🌳 Create the Root `.env` File
Create a file name `.env` in the project root directory with the following:

`.env.example`:
```bash
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_HOST=host.docker.internal
DB_PORT=3306
DB_NAME=ofs_db
```
Replace `YOUR_MYSQL_PASSWORD` with your actual MYSQL password.

## 3. 🖥️ Create the Frontend `.env` File
Create a file name `.env` inside the `frontend` folder with the following:

`.env.example`:
```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
```
Replace `YOUR_GOOGLE_MAPS_API_KEY` with your actual Google Maps API key.


## 4. 📊 Start MYSQL Server
Make sure MYSQL server is running on your local machine.

**Windows**
```
net start MYSQL80
```
## 5. ⚡ Import Database Schema and Seed Data

Using MySQL Workbench:

1. Open Workbench
2. Connect to your local MySQL instance
3. Open `database/schema.sql`
4. Execute the script
5. Open `database/seed.sql`
6. Execute the script

Or via command line:

```bash
mysql -u root -p'YOUR_PASSWORD' < database/schema.sql
mysql -u root -p'YOUR_PASSWORD' < database/seed.sql
```

## 6. ⬆️ Run the Application with Docker Compose

From the project root directory, run:
```bash
docker compose up --build
```
This will build and start:

* the FastAPI backend
* the React/Vite frontend

## 7. ▶️ Open the Application

Frontend:
```
http://localhost:5173
```
Backend:
```
http://localhost:8000
```
API Docs:
```
http://localhost:8000/docs
```

## 8. 🛑 Stop the Application

In the same terminal, press:
```
Ctrl + C
```
To stop and remove containers, run:
```
docker compose down
```

# Project Structure
OFS_CS160/   
├── compose.yaml  
├── Dockerfile  
├── .env  
├── main.py  
├── requirements.txt  
├── frontend/  
│   ├── Dockerfile  
│   ├── .env  
│   ├── package.json  
│   └── src/  
└── database/  
    ├── schema.sql  
    └── seed.sql  

## ✏️ Notes
* Root `.env` is used by the backend container.
* `frontend/.env` is used by the Vite frontend.
* Frontend environment variables must start with `VITE_`.
* If you change Dockerfiles, dependencies, or environment variables, rebuild with:
```
docker compose up --build
```
* If you only stop the app and want to restart it later:
```
docker compose up
```

## Optional: Manual Local Development Setup
If you want to run without Docker, you can do so manually.

### Setting up virtual environment:
```bash
python -m venv venv
```

### Backend:
```bash
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend:
```bash
venv\Scripts\activate
cd frontend
npm install
npm run dev
```
