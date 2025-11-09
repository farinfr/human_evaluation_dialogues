# Dialogue Evaluation System

A full-stack web application for evaluating AI-generated dialogues. Users can sign in, view randomly generated dialogues, and rate them on multiple metrics (reality, user-friendly, helpfulness, naturalness, and overall).

## Features

- **User Authentication**: Sign up and sign in functionality
- **Random Dialogue Display**: View randomly generated dialogues from the dataset
- **Multi-Metric Rating**: Rate dialogues on 5 different metrics (1-5 scale):
  - Reality
  - User-Friendly
  - Helpfulness
  - Naturalness
  - Overall
- **Rating History**: View all your previous ratings with dialogue details

## Project Structure

```
human-evaluation-dialougue/
├── backend/          # Node.js/Express backend
│   ├── server.js     # Main server file
│   └── package.json  # Backend dependencies
├── frontend/         # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── context/      # Auth context
│   │   └── App.js        # Main app component
│   └── package.json      # Frontend dependencies
└── llm_generated_dialogues/  # Dialogue dataset
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (optional, defaults are provided):
```
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

4. Start the server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (optional):
```
REACT_APP_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Usage

1. **Sign Up/Sign In**: Create an account or sign in with existing credentials
2. **View Dialogue**: The dashboard displays a random dialogue that you haven't rated yet
3. **Rate Dialogue**: Use the star ratings to rate the dialogue on each metric
4. **Submit Rating**: Click "Submit Rating" to save your evaluation
5. **View History**: Navigate to "Rating History" to see all your previous ratings

## API Endpoints

### Authentication
- `POST /api/register` - Register a new user
- `POST /api/login` - Login user

### Dialogues
- `GET /api/dialogue/random` - Get a random unrated dialogue
- `GET /api/dialogue/:dialogueId` - Get a specific dialogue

### Ratings
- `POST /api/rating` - Submit a rating for a dialogue
- `GET /api/ratings/history` - Get all ratings by the current user
- `GET /api/ratings/:dialogueId` - Get rating for a specific dialogue

## Technologies Used

### Backend
- Node.js
- Express.js
- SQLite3 (database)
- JWT (authentication)
- bcryptjs (password hashing)

### Frontend
- React
- React Router
- Axios (HTTP client)

## Database Schema

- **users**: User accounts
- **dialogues**: Dialogue data loaded from JSON files
- **ratings**: User ratings for dialogues

## Notes

- The backend automatically loads dialogues from the `llm_generated_dialogues` directory on startup
- Each user can only rate each dialogue once (ratings can be updated)
- The system prioritizes showing unrated dialogues to users

