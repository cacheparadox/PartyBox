# PartyBox Game Summary & Architecture

This document outlines the architecture, UI/UX philosophy, and detailed summaries of the 6 existing games in the **PartyBox** platform. You can use this as context to brainstorm new game ideas that fit seamlessly into the platform's ecosystem.

---

## 🏗 Platform Architecture

### Tech Stack
- **Frontend**: React (Vite), TypeScript, Tailwind CSS.
- **Backend/State**: Firebase Realtime Database (RTDB) for live sync, Firebase Cloud Functions for AI generation (Gemini integration).
- **Hosting**: Firebase Hosting.
- **State Management**: Zustand for local client state (`useRoomStore`).

### The Game Engine
PartyBox operates on a strictly **State Machine** driven engine. 
- The central truth is the `GameState` object in Firebase RTDB.
- Games are implemented as "Plugins" (`GamePlugin` interface) that define:
  1. `setup()`: How to initialize the base state for a new round.
  2. `handleAction()`: How to process a player's action (e.g., submitting a clue, voting, guessing) and transition to a new state.
  3. `handleTimeout()`: What happens when a phase timer hits 0.

### Universal Game Phases
Most games follow a standard phase progression:
1. `instructions`: Shows the rules and a "Start" button for the host.
2. `gameplay`: The core action (submitting answers, bidding, drawing).
3. `voting` / `judging`: Players evaluate each other's submissions.
4. `scoring`: The round ends, answers are revealed, and points are distributed.
5. `winner`: The final game-over screen showing the podium.

---

## 📱 UI/UX Philosophy

- **Mobile-First (No "TV Screen" Required)**: Every player's phone is a complete portal. There is no separate "Spectator Board" or "Host TV Screen" (like Jackbox). Everything happens on the phones (like *Among Us* or *Spaceteam*).
- **Vibrant & Punchy**: Dark backgrounds (`#0B0B0B`) paired with high-contrast neon accents (Magenta, Cyan, Lime, Yellow).
- **Typography**: Blocky, aggressive fonts for headers (`Bebas Neue`, `Permanent Marker`) and clean sans-serif for body text (`Space Grotesk`).
- **Tactile Feedback**: Heavy use of animations (`animate-pop-in`, `animate-jitter`, `animate-float`) and drop-shadow styling that looks like spray paint (`shadow-magenta`, `shadow-cyan`).

---

## 🎮 Existing Games

### 1. Slip It In
- **Genre**: Social Deception / Hidden Phrase
- **Vibe**: Sneaky, Conversational.
- **Mechanic**: Every player gets a ridiculous phrase (e.g., "I once ate a whole stick of butter") except for one player (the odd one out) who gets nothing or a different phrase. Players converse out loud for 3-5 minutes, trying to seamlessly drop their secret phrase into the conversation without being noticed.
- **App Role**: The app acts as the prompt deliverer and timer. When the timer ends, the app handles the voting phase where players vote on who they think successfully "slipped it in" or who the odd one out was.
- **UI Element**: Massive countdown timers, neon cards holding secret phrases.

### 2. Chameleon
- **Genre**: Social Deduction / Word Association
- **Vibe**: Tense, Cryptic.
- **Mechanic**: Everyone receives a category (e.g., "Fast Food") and a specific secret word (e.g., "Wendy's"). However, one player is the **Chameleon** and only sees the category. Players take turns saying one word out loud (and typing it into the app) to prove they know the secret word. The Chameleon must blend in.
- **App Role**: Generates the word via AI, assigns the Chameleon, tracks the clues submitted by everyone in a grid, and handles the voting phase where players try to catch the Chameleon. If caught, the Chameleon gets one chance to guess the secret word.
- **UI Element**: Grid of submitted clues, bright voting tickets, a dramatic "Chameleon Caught" reveal screen.

### 3. Mole
- **Genre**: Social Deduction / Word Association
- **Vibe**: Subtle, Confusing.
- **Mechanic**: Very similar to Chameleon, but instead of knowing *nothing*, the **Mole** receives a *slightly different* but related word (e.g., Real Word: "Ocean", Mole Word: "Pool"). Everyone thinks they have the same word until the clues start clashing.
- **App Role**: Uses AI to generate a closely related pair of words. Collects clues, manages voting, and handles scoring based on whether the Mole was caught or escaped.
- **UI Element**: Almost identical to Chameleon, but with a different color scheme and thematic emojis (🕵️).

### 4. Build A Bluff (Fibbage style)
- **Genre**: Trivia / Bluffing
- **Vibe**: Creative, Deceptive.
- **Mechanic**: The app generates a bizarre, obscure trivia question (e.g., "In 1800s London, you could buy a ticket to the zoo by bringing a ____"). Players type in a convincing fake answer (a bluff). The app mixes the real answer with the players' bluffs. Everyone then votes on which answer they think is the truth.
- **App Role**: Generates the trivia via AI, collects bluffs, mixes them, handles the voting board, and calculates scores (points for guessing the truth, points for every player you fooled).
- **UI Element**: Text inputs for bluffs, a massive list of randomized answers for voting, and a dramatic scoring reveal showing who wrote which fake answer.

### 5. Double Dare
- **Genre**: Bidding / Performance
- **Vibe**: High-Energy, Pressure, Loud.
- **Mechanic**: A topic appears (e.g., "Breakfast Cereals"). Players bid on how many items they can name in that category in 15 seconds (e.g., "I can name 5!"). A bidding war ensues until someone says "Pass" or clicks the **Double Dare** button. The highest bidder must then name that many items out loud.
- **App Role**: Tracks the escalating bid numbers. When the performance starts, the bidder types/speaks their answers, and the Host clicks "Valid" or "Invalid" for each answer. 
- **UI Element**: Giant plus/minus bidding controls, a live tracker of "Target vs Given" answers, and big thumbs-up/thumbs-down judging buttons.

### 6. Reverse Guess Who (Heads-Up style)
- **Genre**: Charades / 20 Questions
- **Vibe**: Chaotic, Fast-paced.
- **Mechanic**: A 10-second countdown gives players time to put their phones on their foreheads facing outward. The app displays a secret celebrity identity on the screen. The player cannot see their own screen, but everyone else can. Players verbally ask Yes/No questions to the room to figure out who they are.
- **App Role**: The app acts strictly as the dealer and tracker. It assigns identities, displays them in massive, optimized text, and provides two giant buttons for the player to blind-tap: "I GUESSED IT" or "PASS".
- **UI Element**: Massive full-screen text for forehead display, giant tap-targets for blind guessing.
