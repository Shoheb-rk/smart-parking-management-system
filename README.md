# AI-Powered Smart Parking Management System

A smart parking management system that uses computer vision to detect vehicles and monitor parking-space occupancy. The project combines YOLOv8 and OpenCV with a React dashboard and FastAPI backend to display parking availability and slot status.

## Project Showcase

### Live Parking Dashboard

![Live Parking Dashboard](screenshots/live-map.png)

### Computer Vision — Vehicle Detection

![Vehicle and Parking-Slot Detection](screenshots/ai-detection.png)

## Features

- **Vehicle Detection:** Uses YOLOv8 to detect vehicles in parking-lot footage.
- **Hybrid Occupancy Detection:** Combines vehicle detection, background subtraction (MOG2), and frame differencing to analyze parking-space occupancy.
- **Occupancy Persistence:** Uses persistence logic to reduce flickering in parking-slot status between frames.
- **Parking-Slot Monitoring:** Tracks free, occupied, and reserved spaces.
- **Live Dashboard:** Displays total capacity, available spaces, occupied spaces, reserved spaces, and occupancy percentage.
- **WebSocket Updates:** Supports real-time communication between the backend and frontend.
- **Parking Kiosk:** Provides an interface for parking-related user interactions.
- **PostgreSQL Integration:** Stores application data in a relational database.
- **QR-Code Generation:** Supports QR-code generation for the payment workflow.

## Computer Vision Pipeline

The system combines vehicle detection with background and frame-change information to determine parking-space occupancy.

```text
Parking-Lot Video
        |
        v
   Frame Extraction
        |
        v
   OpenCV Processing
        |
        +-------------------+
        |                   |
        v                   v
      YOLOv8          Background Subtraction
 Vehicle Detection          (MOG2)
        |                   |
        |             Frame Differencing
        |                   |
        +---------+---------+
                  |
                  v
       Parking-Slot Occupancy
              Analysis
                  |
                  v
         Persistence Logic
                  |
                  v
       Free / Occupied Status
                  |
                  v
        FastAPI + WebSocket
                  |
                  v
         React Dashboard
```

## Tech Stack

| Layer | Technologies |
|---|---|
| Programming Languages | Python, JavaScript |
| Computer Vision | OpenCV, YOLOv8 |
| Backend | FastAPI, Uvicorn |
| Frontend | React, Vite, CSS |
| Database | PostgreSQL |
| Real-Time Communication | WebSockets |
| Database Access | SQLAlchemy, Psycopg2 |
| QR-Code Generation | `qrcode`, Pillow |

## Project Structure

```text
smart-parking-management-system/
├── backend/
│   ├── ai/
│   │   ├── detector.py
│   │   ├── occupancy_detector.py
│   │   ├── find_coords.py
│   │   └── slot_config.json
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   └── schemas.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── KioskView.jsx
│   │   │   └── ParkingGrid.jsx
│   │   ├── App.jsx
│   │   └── config.js
│   └── package.json
├── screenshots/
│   ├── live-map.png
│   └── ai-detection.png
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.13
- Node.js and npm
- PostgreSQL
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Shoheb-rk/smart-parking-management-system.git
cd smart-parking-management-system
```

### 2. Configure PostgreSQL

Create a PostgreSQL database named `spm` if it does not already exist.

In PowerShell, set the database connection string:

```powershell
$env:DATABASE_URL = "postgresql://postgres:YOUR_PASSWORD@localhost:5432/spm"
```

Replace `YOUR_PASSWORD` with your local PostgreSQL password. Do not commit database credentials to Git.

### 3. Set Up the Python Environment

From the project root, create and activate a virtual environment:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Install the backend dependencies required by the project. If you add a `requirements.txt` file, use it to install the dependencies.

The computer-vision pipeline also requires the YOLOv8 model weights and the relevant parking-slot configuration and video inputs.

### 4. Start the Backend

From the project root:

```powershell
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Open the API documentation at:

[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

Keep the backend terminal running.

### 5. Start the Frontend

Open a second terminal from the project root:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite.

To make the frontend accessible from other devices on the same network, run:

```powershell
npm run dev -- --host 0.0.0.0
```

Ensure the frontend API configuration points to the correct backend address for your environment.

## Configuration and Security

- Set `DATABASE_URL` through an environment variable.
- Do not commit database passwords, API keys, or other secrets.
- Keep virtual environments, dependency folders, and large local video or model files out of Git.
- Configure the backend and frontend appropriately for the environment in which they run.

## Future Improvements

- License-plate recognition.
- Automated vehicle entry and exit tracking.
- Improved shadow handling and detection accuracy.
- Historical occupancy analytics and usage reports.
- Integration with a production payment gateway.
- Cloud deployment for remote parking management.

## Author

**Shoheb** — [GitHub Profile](https://github.com/Shoheb-rk)
