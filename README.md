# RoboComp Scoring System

Real-time scoring system for robotics competitions built with Flask and React.

## Features

- Live competition management and scoring
- Real-time updates via WebSocket
- Match timer and control
- Team and user management
- Penalty tracking
- Admin dashboard
- Judge interface

## Tech Stack

**Backend:**
- Flask + Flask-SocketIO
- PostgreSQL
- SQLAlchemy ORM
- JWT authentication

**Frontend:**
- React + Vite
- Socket.IO client
- Nginx (production)

## Quick Start

### Prerequisites

- Docker and Docker Compose

### Running with Docker

```bash
docker compose up -d
```

The application will be available at `http://localhost`

### Default Admin Login

- Username: `admin`
- Password: `admin123`

## Development

### Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Backend runs on `http://localhost:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

### Database

PostgreSQL connection string:
```
postgresql://postgres:postgres@localhost:5432/postgres
```

## Project Structure

```
scoring-system/
├── backend/           # Flask API
│   ├── app.py        # Main application
│   ├── models/       # Database models
│   ├── blueprints/   # API routes
│   └── auth/         # Authentication
├── frontend/         # React application
│   └── src/
│       ├── pages/    # Page components
│       ├── services/ # API and WebSocket
│       └── components/
├── sql/              # Database scripts
└── docker-compose.yml
```

## API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Competitions
- `GET /api/competitions` - List all competitions
- `GET /api/competitions/:id` - Get competition details
- `POST /api/competitions` - Create competition (admin)

### Matches
- `GET /api/matches` - List matches
- `POST /api/matches/:id/start` - Start match (admin/judge)
- `POST /api/matches/:id/pause` - Pause match

### Results & Penalties
- `GET /api/results` - Get match results
- `PUT /api/results/:id` - Update results (admin)
- `POST /api/penalties` - Add penalty (admin)

## Docker Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Rebuild after code changes
docker compose up --build -d
```

## License

MIT
