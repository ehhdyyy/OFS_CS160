````md
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

# ⚙️ Prerequisites

Install the following before setup:

### 1) Python
```bash
python --version
````

### 2) Node.js

```bash
node -v
npm -v
```

### 3) MySQL Server

* Install MySQL Workbench

---

# 🖥️ Backend Setup

Open a terminal in the project root (where `main.py` is located).

## Step 1 - Create virtual environment

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

### Mac/Linux

```bash
python3 -m venv venv
source venv/bin/activate
```

## Step 2 - Install Dependencies

```bash
pip install -r requirements.txt
```

## Step 3 - Create Root `.env` File

Create a file named `.env` in the project root directory:

```env
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ofs_db
JWT_SECRET=change-me-in-env
```

Replace `YOUR_MYSQL_PASSWORD` with your actual MySQL password.

## Step 4 - Run Backend

```bash
uvicorn main:app --reload --port 8000
```

Backend runs at:
`http://localhost:8000`

---

# 🌐 Frontend Setup (React + Vite)

Open a second terminal.

## Step 1 - Install Dependencies

```bash
cd frontend
npm install
```

## Step 2 - Create Frontend `.env` File

Create a file named `.env` inside the `frontend` folder:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
```

Replace `YOUR_GOOGLE_MAPS_API_KEY` with your Google Maps API key.

## Step 3 - Run Dev Server

```bash
npm run dev
```

Frontend runs at:
`http://localhost:5173`

---

# 🗄️ Database Setup

## Step 1 - Start MySQL Server (Windows)

Open Command Prompt as Administrator:

```bash
net start MySQL80
```

or start from:

```bash
services.msc
```

Then find `MySQL80` and click **Start**.

## Step 2 - Import Database Schema

Using MySQL Workbench:

1. Open Workbench
2. Connect to your local instance
3. Open `database/schema.sql`
4. Click Execute

## Step 3 - Seed the Database

Using MySQL Workbench:

1. Open `database/seed.sql`
2. Click Execute

---

# ▶️ Running the Full Application

You must run:

### 1. MySQL server

### 2. Backend

```bash
uvicorn main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm run dev
```

Then open:

```bash
http://localhost:5173
```

---

# Notes

* Root `.env` is for backend/server configuration.
* `frontend/.env` is for Vite frontend configuration.
* Frontend environment variables must start with `VITE_`.
* Restart the frontend dev server after changing `frontend/.env`.
* Restart the backend after changing the root `.env`.
* Do not commit real secrets or unrestricted API keys to GitHub.

```
```
