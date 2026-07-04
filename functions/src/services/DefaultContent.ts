import { ContentEntry } from '../../../shared/src/index';

export const DEFAULT_CONTENT: ContentEntry[] = [
  // ─── Word Categories (Chameleon & Mole) ───
  { type: 'word-category', word: 'Apple', moleWord: 'Pear', category: 'Fruits', difficulty: 1 },
  { type: 'word-category', word: 'Lion', moleWord: 'Tiger', category: 'Animals', difficulty: 1 },
  { type: 'word-category', word: 'New York', moleWord: 'Chicago', category: 'Cities', difficulty: 1 },
  { type: 'word-category', word: 'Guitar', moleWord: 'Bass', category: 'Instruments', difficulty: 1 },
  { type: 'word-category', word: 'Pizza', moleWord: 'Calzone', category: 'Food', difficulty: 1 },
  { type: 'word-category', word: 'Football', moleWord: 'Rugby', category: 'Sports', difficulty: 1 },
  { type: 'word-category', word: 'Batman', moleWord: 'Iron Man', category: 'Superheroes', difficulty: 1 },
  { type: 'word-category', word: 'Subway', moleWord: 'Train', category: 'Transportation', difficulty: 1 },
  { type: 'word-category', word: 'Netflix', moleWord: 'Hulu', category: 'Streaming', difficulty: 1 },
  { type: 'word-category', word: 'Coffee', moleWord: 'Tea', category: 'Drinks', difficulty: 1 },
  
  // ─── Topics (Double Dare) ───
  { type: 'topic', topic: 'Types of Cheese', examples: ['Cheddar', 'Swiss', 'Brie'], difficulty: 1 },
  { type: 'topic', topic: 'Fast Food Chains', examples: ['McDonalds', 'Wendy\'s'], difficulty: 1 },
  { type: 'topic', topic: 'Movies with aliens', examples: ['E.T.', 'Alien'], difficulty: 1 },
  { type: 'topic', topic: 'US Presidents', examples: ['Lincoln', 'Washington'], difficulty: 2 },
  { type: 'topic', topic: 'Colors in the rainbow', examples: ['Red', 'Blue'], difficulty: 1 },
  { type: 'topic', topic: 'Olympic sports', examples: ['Swimming', 'Gymnastics'], difficulty: 2 },
  { type: 'topic', topic: 'Car brands', examples: ['Ford', 'Toyota'], difficulty: 1 },
  { type: 'topic', topic: 'Things you pack for a vacation', examples: ['Sunscreen', 'Swimsuit'], difficulty: 1 },
  { type: 'topic', topic: 'Superheroes without superpowers', examples: ['Batman', 'Iron Man'], difficulty: 3 },
  { type: 'topic', topic: 'Programming languages', examples: ['JavaScript', 'Python'], difficulty: 3 },

  // ─── Phrases (Slip It In) ───
  { type: 'phrase', phrase: 'I need to use the bathroom', difficulty: 1 },
  { type: 'phrase', phrase: 'That reminds me of my ex', difficulty: 2 },
  { type: 'phrase', phrase: 'Did you hear that noise?', difficulty: 1 },
  { type: 'phrase', phrase: 'I completely disagree', difficulty: 1 },
  { type: 'phrase', phrase: 'To be honest, I am starving', difficulty: 1 },
  { type: 'phrase', phrase: 'Is it hot in here or is it just me?', difficulty: 1 },
  { type: 'phrase', phrase: 'I had a weird dream last night', difficulty: 1 },
  { type: 'phrase', phrase: 'My back is killing me', difficulty: 1 },
  { type: 'phrase', phrase: 'I think we are being watched', difficulty: 3 },
  { type: 'phrase', phrase: 'Let\'s change the subject', difficulty: 2 },

  // ─── Identities (Reverse Guess Who) ───
  { type: 'identity', name: 'Taylor Swift', category: 'Musicians', era: '2010s', hintTags: ['Pop', 'Country', 'Singer'] },
  { type: 'identity', name: 'Barack Obama', category: 'Politicians', era: '2000s', hintTags: ['President', 'USA'] },
  { type: 'identity', name: 'Elon Musk', category: 'Business', era: '2020s', hintTags: ['Tesla', 'SpaceX'] },
  { type: 'identity', name: 'Leonardo DiCaprio', category: 'Actors', era: '1990s', hintTags: ['Titanic', 'Inception'] },
  { type: 'identity', name: 'Serena Williams', category: 'Athletes', era: '2000s', hintTags: ['Tennis', 'Olympics'] },
  { type: 'identity', name: 'Gordon Ramsay', category: 'Chefs', era: '2010s', hintTags: ['Cooking', 'Hell\'s Kitchen'] },
  { type: 'identity', name: 'Albert Einstein', category: 'Historical', era: '1900s', hintTags: ['Science', 'Physics'] },
  { type: 'identity', name: 'Beyoncé', category: 'Musicians', era: '2000s', hintTags: ['Singer', 'Destiny\'s Child'] },

  // ─── Trivia (Build a Bluff) ───
  { type: 'trivia', question: 'What is a group of flamingos called?', answer: 'A flamboyance', category: 'Animals', difficulty: 2 },
  { type: 'trivia', question: 'What was the first toy to be advertised on television?', answer: 'Mr. Potato Head', category: 'History', difficulty: 2 },
  { type: 'trivia', question: 'What is the fear of long words called?', answer: 'Hippopotomonstrosesquippedaliophobia', category: 'Words', difficulty: 3 },
  { type: 'trivia', question: 'Before it was called "Google", what was the search engine called?', answer: 'BackRub', category: 'Tech', difficulty: 2 },
  { type: 'trivia', question: 'What was the original color of the Statue of Liberty?', answer: 'Copper/Brown', category: 'History', difficulty: 1 },
  { type: 'trivia', question: 'Which animal has fingerprints so indistinguishable from humans that they have been confused at crime scenes?', answer: 'Koala', category: 'Animals', difficulty: 2 },
];
