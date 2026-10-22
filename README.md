# AI-Powered Smart Parking Management System

An AI-powered parking management system designed to detect parking slot occupancy using computer vision and provide a user-friendly interface for monitoring parking availability.

## Overview

This project combines computer vision, a Python backend, and a React frontend to support automated parking slot monitoring. The system uses YOLO-based object detection and OpenCV for visual processing, with backend components for handling application logic and parking-related data.

## Features

- **AI-Based Detection:** Uses YOLO and OpenCV for parking-related visual analysis.
- **Parking Slot Configuration:** Stores parking slot coordinate information for occupancy analysis.
- **Backend API:** Python backend built with FastAPI.
- **Interactive Frontend:** React-based interface for displaying parking information.
- **Database Integration:** Includes database-related components for managing application data.

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | React, JavaScript, Vite |
| Backend | Python, FastAPI |
| Computer Vision | OpenCV |
| Object Detection | YOLOv8 |
| Database | PostgreSQL *(if configured in the current version)* |

## Project Structure

```text
smart_parking/
├── backend/
│   ├── ai/
│   │   ├── detector.py
│   │   ├── find_coords.py
│   │   ├── occupancy_detector.py
│   │   └── slot_config.json
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   └── schemas.py
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── data/             # Local test videos; not tracked by Git
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- Python 3
- Node.js and npm
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Shoheb-rk/smart-parking-management-system.git
cd smart-parking-management-system
```

### 2. Set Up the Backend

Create and activate a Python virtual environment.

**Windows PowerShell:**

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Install the backend dependencies:

```powershell
pip install -r requirements.txt
```

If a `requirements.txt` file is not yet available, create one containing the project's actual Python dependencies before following this step.

Start the backend using the entry point configured by your application. For example, if `backend/main.py` exposes a FastAPI instance named `app`:

```powershell
uvicorn backend.main:app --reload
```

### 3. Set Up the Frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite in your terminal.

## Configuration

- Configure database connection settings using environment variables.
- Keep credentials and API keys out of source control.
- Obtain any required YOLO model weights separately; model files are excluded from this repository.
- Provide the required parking video or camera input locally.

## Future Improvements

- Improve parking slot occupancy detection and accuracy.
- Add real-time camera integration.
- Enhance parking availability visualization.
- Improve error handling and database integration.
- Add testing and deployment support.

## Author

**Shoheb Khanadal**

GitHub: [Shoheb-rk](https://github.com/Shoheb-rk)

---

*This project is being developed to explore computer vision and AI-assisted parking management.*
