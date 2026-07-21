# PixelPeek

PixelPeek is a real-time multiplayer image guessing game where one player uploads an image and selects a crop while everyone else tries to guess the hidden word. The image is progressively revealed over time through crop expansion and letter hints, while AI validation prevents unrelated image-answer pairs.

## Features

- Real-time multiplayer gameplay using Socket.IO
- Progressive image reveal system
- Interactive crop selection
- AI-based image-answer validation using OpenCLIP
- NSFW image detection
- Live chat with automatic answer detection
- Dynamic scoring system
- Automatic player reconnection
- End-game image gallery
- Dockerized backend with CI/CD deployment

## Tech Stack

### Frontend
- React
- Vite
- Socket.IO Client

### Backend
- Node.js
- Express
- Socket.IO
- Sharp

### AI
- Transformers.js (OpenCLIP)
- NSFWJS

### Deployment
- AWS EC2
- Docker
- GitHub Actions
- Vercel

---

## Game Flow

### Room

- Host creates a room.
- Players join using a room code.
- Each player receives a UUID stored in `localStorage` for reconnection.
- Room state exists entirely in memory without a database.

### Picking Phase

The picker:

- Uploads or pastes an image.
- Passes an NSFW check.
- Enters the hidden answer.
- Selects the initial crop.

Only crop coordinates are sent to the server.

### Guessing Phase

Players see only the cropped portion of the image.

During the round:

- Players submit guesses through chat.
- Correct guesses are detected automatically.
- Players receive points immediately.
- The picker cannot provide textual hints.

### Progressive Reveal

The image becomes easier over time.

- Crop expansion reveals larger portions of the image.
- Random letters from the hidden answer are revealed periodically.

### AI Validation

Before the round starts, OpenCLIP compares the uploaded image with the submitted answer.

If the similarity score is below the configured threshold:

- Round is cancelled.
- Picker is penalized.
- Other players receive a consolation bonus.
- Next turn begins automatically.

### Round End

At the end of each round:

- Full image is revealed.
- Correct answer is shown.
- Scores are calculated.
- Next picker begins.

### Reconnection

Disconnected players can reconnect using their stored UUID and continue with their previous score.

### Game End

After the configured number of rounds:

- Final leaderboard is displayed.
- Gallery of every submitted image is shown.
- Images are automatically deleted through storage lifecycle rules.

---

## Scoring

### Guesser Score

```
Points =
BASE × Time × Reveal × Hint × Rank
```

| Factor | Description |
|---------|-------------|
| Time | Earlier guesses receive more points |
| Reveal | Less image revealed results in higher points |
| Hint | Fewer revealed letters increase the score |
| Rank | Earlier correct guessers receive higher rewards |

### Picker Score

```
Picker Points =
Average(Guesser Points)
+
(Correct Guessers / Total Guessers) × 20
```

### Penalties

| Event | Picker | Other Players |
|------|--------|---------------|
| Image and answer mismatch | −5% of total score | +5% of total score |
| Image not submitted before timeout | −1% of total score | +1% of total score |

---

## Running Locally

### Clone

```bash
git clone https://github.com/Ayaan9421/PixelPeek.git
cd PixelPeek
```

### Backend

```bash
cd server
npm install
node src/index.js
```

### Frontend

```bash
cd client
npm install
npm run dev
```

---

## Environment Variables

### Server

```env
PORT=
CLIENT_ORIGIN=
NODE_ENV=
IMAGE_TOKEN_SECRET=
```

### Client

```env
VITE_API_URL=
```

---

## Deployment

Frontend is deployed on Vercel.

Backend is deployed on AWS EC2 using Docker.

GitHub Actions automatically builds and deploys the backend on every push to the `main` branch.

---