// This file contains a massive built-in dataset to populate the games.
// The user can inject these into Firestore via the Admin UI.

export const SEED_DATA = [
  // ─── CHAMELEON / MOLE (Categories) ───
  {
    type: 'word-category',
    category: 'Fast Food Chains',
    difficulty: 1,
    word: 'McDonalds',
    moleWord: 'Burger King'
  },
  {
    type: 'word-category',
    category: 'Fast Food Chains',
    difficulty: 1,
    word: 'Taco Bell',
    moleWord: 'Chipotle'
  },
  {
    type: 'word-category',
    category: 'Superheroes',
    difficulty: 1,
    word: 'Batman',
    moleWord: 'Iron Man'
  },
  {
    type: 'word-category',
    category: 'Superheroes',
    difficulty: 2,
    word: 'Spider-Man',
    moleWord: 'Deadpool'
  },
  {
    type: 'word-category',
    category: 'Animals',
    difficulty: 1,
    word: 'Dolphin',
    moleWord: 'Shark'
  },
  {
    type: 'word-category',
    category: 'Animals',
    difficulty: 2,
    word: 'Platypus',
    moleWord: 'Beaver'
  },
  {
    type: 'word-category',
    category: 'Countries',
    difficulty: 1,
    word: 'Japan',
    moleWord: 'China'
  },
  {
    type: 'word-category',
    category: 'Kitchen Appliances',
    difficulty: 1,
    word: 'Toaster',
    moleWord: 'Microwave'
  },
  {
    type: 'word-category',
    category: 'School Subjects',
    difficulty: 1,
    word: 'History',
    moleWord: 'Geography'
  },

  // ─── BUILD A BLUFF (Trivia) ───
  {
    type: 'trivia',
    category: 'History',
    difficulty: 2,
    question: 'The shortest war in history lasted approximately how many minutes?',
    answer: '38 minutes'
  },
  {
    type: 'trivia',
    category: 'Science',
    difficulty: 2,
    question: 'What animal has the highest blood pressure?',
    answer: 'Giraffe'
  },
  {
    type: 'trivia',
    category: 'Geography',
    difficulty: 1,
    question: 'What is the only country that does not have a rectangular flag?',
    answer: 'Nepal'
  },
  {
    type: 'trivia',
    category: 'Pop Culture',
    difficulty: 2,
    question: 'What was the first music video played on MTV?',
    answer: 'Video Killed the Radio Star'
  },
  {
    type: 'trivia',
    category: 'Animals',
    difficulty: 2,
    question: 'A group of flamingos is called a what?',
    answer: 'Flamboyance'
  },

  // ─── REVERSE GUESS WHO (Identities - Famous People only) ───
  {
    type: 'identity',
    category: 'Actors',
    name: 'Leonardo DiCaprio',
    era: '1990s-Present',
    nationality: 'American',
    hintTags: ['Titanic', 'Oscar winner', 'Wolf of Wall Street', 'Environmentalist']
  },
  {
    type: 'identity',
    category: 'Tech',
    name: 'Elon Musk',
    era: '2000s-Present',
    nationality: 'South African / American',
    hintTags: ['Tesla', 'SpaceX', 'Twitter/X', 'Mars']
  },
  {
    type: 'identity',
    category: 'Musicians',
    name: 'Taylor Swift',
    era: '2000s-Present',
    nationality: 'American',
    hintTags: ['Eras Tour', 'Country to Pop', '1989', 'Cats']
  },
  {
    type: 'identity',
    category: 'Historical',
    name: 'Albert Einstein',
    era: '1900s-1950s',
    nationality: 'German',
    hintTags: ['Physics', 'E=mc2', 'Crazy hair', 'Genius']
  },
  {
    type: 'identity',
    category: 'Fictional Characters',
    name: 'Harry Potter',
    era: '1990s-2000s',
    nationality: 'British',
    hintTags: ['Wizard', 'Scar', 'Glasses', 'Hogwarts']
  },
  {
    type: 'identity',
    category: 'Athletes',
    name: 'Michael Jordan',
    era: '1980s-1990s',
    nationality: 'American',
    hintTags: ['Basketball', 'Bulls', 'Space Jam', 'Jumpman']
  },

  // ─── SLIP IT IN (Phrases) ───
  { type: 'phrase', difficulty: 1, phrase: 'To be honest' },
  { type: 'phrase', difficulty: 1, phrase: 'At the end of the day' },
  { type: 'phrase', difficulty: 2, phrase: 'Not gonna lie' },
  { type: 'phrase', difficulty: 2, phrase: 'If I recall correctly' },
  { type: 'phrase', difficulty: 3, phrase: 'That is exactly what my mom said' },
  { type: 'phrase', difficulty: 3, phrase: 'I had a dream about this once' },
  { type: 'phrase', difficulty: 1, phrase: 'As a matter of fact' },
  { type: 'phrase', difficulty: 2, phrase: 'Speaking of which' },

  // ─── DOUBLE DARE (Topics) ───
  {
    type: 'topic',
    difficulty: 1,
    topic: 'Types of Pizza Toppings',
    examples: ['Pepperoni', 'Mushrooms', 'Onions']
  },
  {
    type: 'topic',
    difficulty: 1,
    topic: 'Streaming Services',
    examples: ['Netflix', 'Hulu', 'Disney+']
  },
  {
    type: 'topic',
    difficulty: 2,
    topic: 'Periodic Table Elements',
    examples: ['Oxygen', 'Gold', 'Helium']
  },
  {
    type: 'topic',
    difficulty: 2,
    topic: 'US State Capitals',
    examples: ['Austin', 'Sacramento', 'Albany']
  },
  {
    type: 'topic',
    difficulty: 3,
    topic: 'Oscar Best Picture Winners',
    examples: ['Titanic', 'Gladiator', 'Parasite']
  }
];
