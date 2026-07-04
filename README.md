# 🎉 PARTYBOX

**The real-time multiplayer party game platform.** Play 6 games with 4–12 friends using phones as controllers and a shared screen as the game board.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS + Framer Motion |
| Real-time sync | Firebase Realtime Database |
| Server logic | Firebase Cloud Functions |
| Persistent data | Firestore |
| AI (optional) | OpenRouter API |

---

## Project Structure

```
PARTYBOX/
├── client/          # React app (Vite)
├── functions/       # Firebase Cloud Functions
├── shared/          # Shared TypeScript types
├── firebase.json    # Firebase config
├── firestore.rules  # Security rules
└── database.rules.json
```

---

## Quick Start

### Prerequisites
- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project (or use local emulators)

### 1. Clone & Install

```bash
# Install client dependencies
cd client && npm install

# Install function dependencies
cd ../functions && npm install
```

### 2. Configure Firebase

**Option A: Use Firebase Emulators (recommended for development)**

```bash
# Login to Firebase
firebase login

# Update .firebaserc with your project ID (or use demo-partybox for emulators)
# Client already has .env.local configured for emulators
```

**Option B: Use a real Firebase project**

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a project with **Firestore**, **Realtime Database**, and **Cloud Functions** enabled
3. Copy your project config to `client/.env.local`:

```bash
# Edit client/.env.local
VITE_FIREBASE_PROJECT_ID=your-actual-project-id
VITE_FIREBASE_API_KEY=your-api-key
# ... etc
VITE_USE_EMULATORS=false
```

4. Update `.firebaserc`:
```json
{ "projects": { "default": "your-actual-project-id" } }
```

### 3. Start Development

**Terminal 1 — Firebase Emulators:**
```bash
npx firebase emulators:start
```

**Terminal 2 — Client dev server:**
```bash
cd client
npm run dev
```

**Terminal 3 — Functions watch (optional, for real-time function edits):**
```bash
cd functions
npm run build:watch
```

App runs at: **http://localhost:5173/**

Players on the same WiFi can join at: **http://192.168.x.x:5173/**

---

## Games

| Game | Players | AI | Description |
|---|---|---|---|
| 🎯 Double Dare | 3–12 | No | Bid how many items you can name |
| 🤫 Slip It In | 4–12 | No | Secretly slip phrases into conversation |
| 🦎 Chameleon | 3–10 | No | One player has no secret word |
| 🕵️ Mole | 4–10 | No | One player has a subtly different word |
| 🎭 Build a Bluff | 3–12 | Yes | Fool others with fake trivia answers |
| 🌟 Reverse Guess Who | 3–12 | Yes | Guess who holds the secret identity |

---

## AI Setup (Optional)

For AI-powered games (Build a Bluff, Reverse Guess Who):

1. Get an API key from [OpenRouter](https://openrouter.ai)
2. In the lobby, click **🤖 AI Settings**
3. Paste your key and choose a model (e.g. `anthropic/claude-3-haiku`)

Games without AI always work using the curated content packs.

---

## Content Pack Admin

Visit `/admin` in the app to manage content packs.

Default password: `partybox-admin` (change via `VITE_ADMIN_PASSWORD` in `.env.local`)

---

## Deployment

### Frontend (Firebase Hosting)
```bash
cd client && npm run build
firebase deploy --only hosting
```

### Functions
```bash
cd functions && npm run build
firebase deploy --only functions
```

---

## Seeding Content Packs

Content packs are managed via the `/admin` UI or directly in Firestore.

Entry format examples:

```json
// word-category (Chameleon / Mole)
{ "type": "word-category", "word": "Elephant", "moleWord": "Mammoth", "category": "Animals", "difficulty": 1 }

// trivia (Build a Bluff)
{ "type": "trivia", "question": "Who wrote Hamlet?", "answer": "Shakespeare", "difficulty": 2, "category": "Literature" }

// identity (Reverse Guess Who)
{ "type": "identity", "name": "Elon Musk", "category": "Tech", "era": "2010s", "nationality": "American", "hintTags": ["Tesla", "SpaceX", "Twitter"] }

// phrase (Slip It In)
{ "type": "phrase", "phrase": "as a matter of fact", "difficulty": 1 }

// topic (Double Dare)
{ "type": "topic", "topic": "Types of cheese", "examples": ["Cheddar", "Brie", "Gouda"], "difficulty": 2 }
```
