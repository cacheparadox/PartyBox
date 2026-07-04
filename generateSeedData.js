import fs from 'fs';
import https from 'https';

// --- Data Lists ---
const animals = ['Dog', 'Cat', 'Elephant', 'Tiger', 'Lion', 'Bear', 'Monkey', 'Giraffe', 'Zebra', 'Kangaroo', 'Penguin', 'Dolphin', 'Shark', 'Whale', 'Eagle', 'Hawk', 'Snake', 'Crocodile', 'Alligator', 'Frog', 'Toad', 'Turtle', 'Rabbit', 'Mouse', 'Rat', 'Squirrel', 'Deer', 'Moose', 'Elk', 'Fox', 'Wolf', 'Bear', 'Koala', 'Panda', 'Sloth', 'Rhino', 'Hippo', 'Camel', 'Llama', 'Alpaca', 'Sheep', 'Goat', 'Cow', 'Pig', 'Horse', 'Donkey', 'Chicken', 'Duck', 'Turkey', 'Goose', 'Ostrich', 'Emu', 'Peacock', 'Parrot', 'Pigeon', 'Crow', 'Raven', 'Owl', 'Bat', 'Butterfly', 'Moth', 'Bee', 'Wasp', 'Ant', 'Spider', 'Scorpion', 'Crab', 'Lobster', 'Shrimp', 'Squid', 'Octopus', 'Jellyfish', 'Starfish', 'Seahorse', 'Seal', 'Walrus', 'Manatee', 'Otter', 'Beaver', 'Raccoon', 'Skunk', 'Porcupine', 'Hedgehog', 'Mole', 'Badger', 'Wolverine', 'Weasel', 'Mink', 'Ferret', 'Guinea Pig', 'Hamster', 'Gerbil', 'Chinchilla', 'Platypus', 'Echidna', 'Armadillo', 'Anteater', 'Sloth', 'Tapir', 'Capybara', 'Lemur', 'Meerkat', 'Mongoose', 'Hyena', 'Cheetah', 'Leopard', 'Jaguar', 'Panther', 'Cougar', 'Lynx', 'Bobcat', 'Ocelot', 'Caracal', 'Serval', 'Puma'];
const foods = ['Pizza', 'Burger', 'Hot Dog', 'Taco', 'Burrito', 'Sushi', 'Pasta', 'Steak', 'Chicken', 'Fish', 'Shrimp', 'Crab', 'Lobster', 'Salad', 'Soup', 'Sandwich', 'Wrap', 'Pancake', 'Waffle', 'French Toast', 'Eggs', 'Bacon', 'Sausage', 'Ham', 'Cheese', 'Yogurt', 'Milk', 'Butter', 'Bread', 'Bagel', 'Croissant', 'Muffin', 'Donut', 'Cake', 'Pie', 'Cookie', 'Brownie', 'Ice Cream', 'Popsicle', 'Chocolate', 'Candy', 'Gum', 'Chips', 'Pretzel', 'Popcorn', 'Nuts', 'Seeds', 'Apple', 'Banana', 'Orange', 'Grape', 'Strawberry', 'Blueberry', 'Raspberry', 'Blackberry', 'Watermelon', 'Cantaloupe', 'Honeydew', 'Pineapple', 'Mango', 'Papaya', 'Kiwi', 'Peach', 'Plum', 'Cherry', 'Pear', 'Tomato', 'Potato', 'Carrot', 'Onion', 'Garlic', 'Pepper', 'Broccoli', 'Cauliflower', 'Spinach', 'Lettuce', 'Cabbage', 'Celery', 'Cucumber', 'Zucchini', 'Squash', 'Pumpkin', 'Corn', 'Peas', 'Beans', 'Lentils', 'Rice', 'Wheat', 'Oats', 'Barley', 'Quinoa', 'Mushroom', 'Olive', 'Avocado', 'Coconut', 'Lemon', 'Lime', 'Grapefruit', 'Pomegranate', 'Fig', 'Date', 'Apricot', 'Nectarine', 'Tangerine', 'Clementine', 'Cranberry', 'Raisin', 'Prune', 'Almond', 'Walnut', 'Pecan', 'Cashew', 'Pistachio', 'Macadamia', 'Peanut', 'Hazelnut', 'Chestnut', 'Sunflower Seed', 'Pumpkin Seed', 'Sesame Seed', 'Flax Seed', 'Chia Seed', 'Hemp Seed', 'Poppy Seed'];
const countries = ['USA', 'Canada', 'Mexico', 'Brazil', 'Argentina', 'Colombia', 'Peru', 'Chile', 'Ecuador', 'Venezuela', 'UK', 'France', 'Germany', 'Italy', 'Spain', 'Portugal', 'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Ireland', 'Greece', 'Turkey', 'Russia', 'Ukraine', 'Poland', 'Romania', 'Hungary', 'Czech Republic', 'Slovakia', 'Bulgaria', 'Serbia', 'Croatia', 'Bosnia', 'Albania', 'China', 'Japan', 'South Korea', 'India', 'Pakistan', 'Bangladesh', 'Indonesia', 'Philippines', 'Vietnam', 'Thailand', 'Malaysia', 'Singapore', 'Australia', 'New Zealand', 'Egypt', 'South Africa', 'Nigeria', 'Kenya', 'Ethiopia', 'Morocco', 'Algeria', 'Tunisia', 'Libya', 'Sudan', 'Ghana', 'Senegal', 'Cameroon', 'Ivory Coast', 'Tanzania', 'Uganda', 'Zimbabwe', 'Zambia', 'Angola', 'Mozambique', 'Madagascar', 'Saudi Arabia', 'Iran', 'Iraq', 'Syria', 'Jordan', 'Lebanon', 'Israel', 'UAE', 'Qatar', 'Kuwait', 'Oman', 'Yemen', 'Afghanistan'];
const famousPeople = [
  { name: 'Taylor Swift', category: 'Musicians' }, { name: 'Barack Obama', category: 'Politicians' }, { name: 'Elon Musk', category: 'Business' },
  { name: 'Leonardo DiCaprio', category: 'Actors' }, { name: 'Serena Williams', category: 'Athletes' }, { name: 'Gordon Ramsay', category: 'Chefs' },
  { name: 'Albert Einstein', category: 'Historical' }, { name: 'Beyoncé', category: 'Musicians' }, { name: 'Tom Cruise', category: 'Actors' },
  { name: 'LeBron James', category: 'Athletes' }, { name: 'Bill Gates', category: 'Business' }, { name: 'Oprah Winfrey', category: 'TV Personalities' },
  { name: 'Rihanna', category: 'Musicians' }, { name: 'Donald Trump', category: 'Politicians' }, { name: 'Mark Zuckerberg', category: 'Business' },
  { name: 'Brad Pitt', category: 'Actors' }, { name: 'Cristiano Ronaldo', category: 'Athletes' }, { name: 'Kim Kardashian', category: 'TV Personalities' },
  { name: 'Justin Bieber', category: 'Musicians' }, { name: 'Joe Biden', category: 'Politicians' }, { name: 'Jeff Bezos', category: 'Business' },
  { name: 'Dwayne Johnson', category: 'Actors' }, { name: 'Lionel Messi', category: 'Athletes' }, { name: 'Kylie Jenner', category: 'TV Personalities' },
  { name: 'Kanye West', category: 'Musicians' }, { name: 'Vladimir Putin', category: 'Politicians' }, { name: 'Warren Buffett', category: 'Business' },
  { name: 'Will Smith', category: 'Actors' }, { name: 'Michael Jordan', category: 'Athletes' }, { name: 'Ellen DeGeneres', category: 'TV Personalities' },
  { name: 'Ariana Grande', category: 'Musicians' }, { name: 'Hillary Clinton', category: 'Politicians' }, { name: 'Richard Branson', category: 'Business' },
  { name: 'Johnny Depp', category: 'Actors' }, { name: 'Tiger Woods', category: 'Athletes' }, { name: 'Simon Cowell', category: 'TV Personalities' },
  { name: 'Eminem', category: 'Musicians' }, { name: 'George W. Bush', category: 'Politicians' }, { name: 'Tim Cook', category: 'Business' },
  { name: 'Angelina Jolie', category: 'Actors' }, { name: 'Roger Federer', category: 'Athletes' }, { name: 'Jimmy Fallon', category: 'TV Personalities' },
  { name: 'Drake', category: 'Musicians' }, { name: 'Bill Clinton', category: 'Politicians' }, { name: 'Sundar Pichai', category: 'Business' },
  { name: 'Tom Hanks', category: 'Actors' }, { name: 'Rafael Nadal', category: 'Athletes' }, { name: 'Stephen Colbert', category: 'TV Personalities' },
  { name: 'Lady Gaga', category: 'Musicians' }, { name: 'Emmanuel Macron', category: 'Politicians' }, { name: 'Satya Nadella', category: 'Business' },
  { name: 'Jennifer Lawrence', category: 'Actors' }, { name: 'Novak Djokovic', category: 'Athletes' }, { name: 'Jimmy Kimmel', category: 'TV Personalities' },
  { name: 'Ed Sheeran', category: 'Musicians' }, { name: 'Angela Merkel', category: 'Politicians' }, { name: 'Jack Ma', category: 'Business' },
  { name: 'Meryl Streep', category: 'Actors' }, { name: 'Usain Bolt', category: 'Athletes' }, { name: 'Conan O\'Brien', category: 'TV Personalities' },
  { name: 'Adele', category: 'Musicians' }, { name: 'Justin Trudeau', category: 'Politicians' }, { name: 'Larry Page', category: 'Business' },
  { name: 'Denzel Washington', category: 'Actors' }, { name: 'Michael Phelps', category: 'Athletes' }, { name: 'David Letterman', category: 'TV Personalities' },
  { name: 'Bruno Mars', category: 'Musicians' }, { name: 'Boris Johnson', category: 'Politicians' }, { name: 'Sergey Brin', category: 'Business' },
  { name: 'Morgan Freeman', category: 'Actors' }, { name: 'Tom Brady', category: 'Athletes' }, { name: 'Jay Leno', category: 'TV Personalities' },
  { name: 'Katy Perry', category: 'Musicians' }, { name: 'Theresa May', category: 'Politicians' }, { name: 'Steve Jobs', category: 'Historical' },
  { name: 'Robert De Niro', category: 'Actors' }, { name: 'Peyton Manning', category: 'Athletes' }, { name: 'Jon Stewart', category: 'TV Personalities' },
  { name: 'Shawn Mendes', category: 'Musicians' }, { name: 'David Cameron', category: 'Politicians' }, { name: 'Henry Ford', category: 'Historical' },
  { name: 'Al Pacino', category: 'Actors' }, { name: 'Aaron Rodgers', category: 'Athletes' }, { name: 'Trevor Noah', category: 'TV Personalities' },
  { name: 'Camila Cabello', category: 'Musicians' }, { name: 'Tony Blair', category: 'Politicians' }, { name: 'Thomas Edison', category: 'Historical' },
  { name: 'Harrison Ford', category: 'Actors' }, { name: 'Drew Brees', category: 'Athletes' }, { name: 'John Oliver', category: 'TV Personalities' },
  { name: 'Dua Lipa', category: 'Musicians' }, { name: 'Winston Churchill', category: 'Historical' }, { name: 'Nikola Tesla', category: 'Historical' },
  { name: 'Samuel L. Jackson', category: 'Actors' }, { name: 'Patrick Mahomes', category: 'Athletes' }, { name: 'James Corden', category: 'TV Personalities' },
  { name: 'The Weeknd', category: 'Musicians' }, { name: 'Nelson Mandela', category: 'Historical' }, { name: 'Alexander Graham Bell', category: 'Historical' },
  { name: 'Matt Damon', category: 'Actors' }, { name: 'Lamar Jackson', category: 'Athletes' }, { name: 'Graham Norton', category: 'TV Personalities' },
  { name: 'Post Malone', category: 'Musicians' }, { name: 'Mahatma Gandhi', category: 'Historical' }, { name: 'Wright Brothers', category: 'Historical' },
  { name: 'Ben Affleck', category: 'Actors' }, { name: 'Russell Wilson', category: 'Athletes' }, { name: 'Seth Meyers', category: 'TV Personalities' },
  { name: 'Billie Eilish', category: 'Musicians' }, { name: 'Martin Luther King Jr.', category: 'Historical' }, { name: 'Marie Curie', category: 'Historical' },
  { name: 'Christian Bale', category: 'Actors' }, { name: 'Deshaun Watson', category: 'Athletes' }, { name: 'James Fallon', category: 'TV Personalities' },
  { name: 'Harry Styles', category: 'Musicians' }, { name: 'Abraham Lincoln', category: 'Historical' }, { name: 'Isaac Newton', category: 'Historical' },
  { name: 'Chris Hemsworth', category: 'Actors' }, { name: 'Kyler Murray', category: 'Athletes' }, { name: 'Stephen Colbert', category: 'TV Personalities' },
  { name: 'Zayn Malik', category: 'Musicians' }, { name: 'George Washington', category: 'Historical' }, { name: 'Galileo Galilei', category: 'Historical' },
  { name: 'Chris Evans', category: 'Actors' }, { name: 'Dak Prescott', category: 'Athletes' }, { name: 'Jimmy Kimmel', category: 'TV Personalities' },
  { name: 'Niall Horan', category: 'Musicians' }, { name: 'Thomas Jefferson', category: 'Historical' }, { name: 'Charles Darwin', category: 'Historical' },
  { name: 'Robert Downey Jr.', category: 'Actors' }, { name: 'Josh Allen', category: 'Athletes' }, { name: 'Conan O\'Brien', category: 'TV Personalities' },
  { name: 'Liam Payne', category: 'Musicians' }, { name: 'Theodore Roosevelt', category: 'Historical' }, { name: 'Stephen Hawking', category: 'Historical' },
  { name: 'Mark Ruffalo', category: 'Actors' }, { name: 'Baker Mayfield', category: 'Athletes' }, { name: 'David Letterman', category: 'TV Personalities' },
];
const everydayItems = ['Toothbrush', 'Toilet Paper', 'Soap', 'Shampoo', 'Towel', 'Sponge', 'Broom', 'Mop', 'Vacuum', 'Trash Can', 'Plate', 'Bowl', 'Cup', 'Glass', 'Mug', 'Fork', 'Knife', 'Spoon', 'Chopsticks', 'Napkin', 'Pan', 'Pot', 'Spatula', 'Whisk', 'Ladle', 'Cutting Board', 'Toaster', 'Blender', 'Microwave', 'Oven', 'Stove', 'Fridge', 'Freezer', 'Dishwasher', 'Sink', 'Faucet', 'Bed', 'Pillow', 'Blanket', 'Sheet', 'Mattress', 'Dresser', 'Closet', 'Hanger', 'Mirror', 'Lamp', 'Desk', 'Chair', 'Couch', 'Sofa', 'Table', 'Rug', 'Carpet', 'Curtain', 'Blind', 'Window', 'Door', 'Key', 'Lock', 'Doorknob', 'TV', 'Remote', 'Speaker', 'Phone', 'Laptop', 'Computer', 'Tablet', 'Charger', 'Cable', 'Battery', 'Pen', 'Pencil', 'Eraser', 'Marker', 'Highlighter', 'Crayon', 'Paper', 'Notebook', 'Folder', 'Binder', 'Stapler', 'Tape', 'Glue', 'Scissors', 'Ruler', 'Calculator', 'Book', 'Magazine', 'Newspaper', 'Wallet', 'Purse', 'Backpack', 'Bag', 'Suitcase', 'Umbrella', 'Glasses', 'Sunglasses', 'Hat', 'Cap', 'Scarf', 'Gloves', 'Mittens', 'Coat', 'Jacket', 'Sweater', 'Hoodie', 'Shirt', 'T-shirt', 'Pants', 'Jeans', 'Shorts', 'Skirt', 'Dress', 'Suit', 'Tie', 'Belt', 'Socks', 'Shoes', 'Boots', 'Sneakers', 'Sandals', 'Slippers', 'Watch', 'Ring', 'Necklace', 'Bracelet', 'Earrings'];

// Utility: pick random from array
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Generator functions
function generateWords() {
  const words = [];
  
  // Animal pairings
  for (let i = 0; i < animals.length - 1; i += 2) {
    words.push({ type: 'word-category', word: animals[i], moleWord: animals[i+1], category: 'Animals', difficulty: 1 });
  }
  // Food pairings
  for (let i = 0; i < foods.length - 1; i += 2) {
    words.push({ type: 'word-category', word: foods[i], moleWord: foods[i+1], category: 'Food', difficulty: 1 });
  }
  // Country pairings
  for (let i = 0; i < countries.length - 1; i += 2) {
    words.push({ type: 'word-category', word: countries[i], moleWord: countries[i+1], category: 'Countries', difficulty: 2 });
  }
  // Items pairings
  for (let i = 0; i < everydayItems.length - 1; i += 2) {
    words.push({ type: 'word-category', word: everydayItems[i], moleWord: everydayItems[i+1], category: 'Everyday Items', difficulty: 1 });
  }
  
  return words;
}

function generateTopics() {
  const topics = [];
  const categories = [
    { name: 'Types of Animals', arr: animals },
    { name: 'Foods', arr: foods },
    { name: 'Countries', arr: countries },
    { name: 'Household Items', arr: everydayItems },
    { name: 'Famous People', arr: famousPeople.map(p => p.name) }
  ];

  for (let i = 0; i < 300; i++) {
    const cat = pick(categories);
    const ex1 = pick(cat.arr);
    let ex2 = pick(cat.arr);
    while (ex2 === ex1) ex2 = pick(cat.arr);
    
    // We can also create synthetic topics
    const syntheticTopics = [
      `Things you find in a ${pick(['Kitchen', 'Bathroom', 'Bedroom', 'Garage', 'School', 'Hospital'])}`,
      `Words that start with the letter ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
      `Movies featuring ${pick(famousPeople.filter(p => p.category === 'Actors')).name}`,
      `Things you bring to the ${pick(['Beach', 'Mountains', 'Park', 'Office', 'Party'])}`,
      `Reasons to be late to work`,
      `Things you shouldn't say at a wedding`,
      `Superpowers you wish you had`,
      `Things you do on a Sunday`,
      `Excuses for not doing homework`,
      `Things that are the color ${pick(['Red', 'Blue', 'Green', 'Yellow', 'Black', 'White', 'Purple'])}`,
      `Things that smell ${pick(['good', 'bad', 'funny', 'like cheese'])}`
    ];

    if (i < 150) {
      topics.push({ type: 'topic', topic: cat.name, examples: [ex1, ex2], difficulty: 1 });
    } else {
      topics.push({ type: 'topic', topic: pick(syntheticTopics), examples: [], difficulty: 2 });
    }
  }
  
  // Deduplicate by topic string
  const uniqueTopicsMap = new Map();
  topics.forEach(t => uniqueTopicsMap.set(t.topic, t));
  return Array.from(uniqueTopicsMap.values());
}

function generatePhrases() {
  const templates = [
    "I really need a {item}",
    "Have you ever seen a {animal}?",
    "I can't stand {food}",
    "Did you know I went to {country}?",
    "I dropped my {item} in the toilet",
    "I had a dream about {person}",
    "I think {person} is overrated",
    "Where did you put the {item}?",
    "I'm craving some {food}",
    "I would love to visit {country}",
    "My spirit animal is a {animal}",
    "I smell like {food}",
    "I accidentally swallowed a {item}",
    "Do you think {person} is cute?",
    "I lost my {item} yesterday",
    "I'm allergic to {animal}s",
    "I've never tasted {food}",
    "I want to move to {country}",
    "I broke the {item}",
    "I saw {person} at the store",
    "I hate {animal}s",
    "I love eating {food}",
    "I was born in {country}",
    "I threw away the {item}",
    "I want to fight {person}",
    "I am secretly a {animal}",
    "I am addicted to {food}",
    "I am banned from {country}",
    "I stole a {item}",
    "I am friends with {person}"
  ];

  const phrases = [];
  for (let i = 0; i < 400; i++) {
    let text = pick(templates);
    text = text.replace('{item}', pick(everydayItems).toLowerCase());
    text = text.replace('{animal}', pick(animals).toLowerCase());
    text = text.replace('{food}', pick(foods).toLowerCase());
    text = text.replace('{country}', pick(countries));
    text = text.replace('{person}', pick(famousPeople).name);
    phrases.push({ type: 'phrase', phrase: text, difficulty: pick([1, 2, 3]) });
  }
  
  // Deduplicate
  const uniqueMap = new Map();
  phrases.forEach(p => uniqueMap.set(p.phrase, p));
  return Array.from(uniqueMap.values());
}

function generateIdentities() {
  const ids = [];
  famousPeople.forEach(p => {
    ids.push({ type: 'identity', name: p.name, category: p.category, era: '2000s', hintTags: [] });
  });
  
  // Add some generic ones to bulk up
  for (let i = 0; i < 200; i++) {
    const genericNames = [
      'Spider-Man', 'Batman', 'Superman', 'Wonder Woman', 'Iron Man', 'Captain America', 'Thor', 'Hulk', 'Black Widow', 'Wolverine',
      'Mickey Mouse', 'Donald Duck', 'Goofy', 'Bugs Bunny', 'Daffy Duck', 'Homer Simpson', 'Bart Simpson', 'SpongeBob SquarePants',
      'Mario', 'Luigi', 'Princess Peach', 'Bowser', 'Link', 'Zelda', 'Pikachu', 'Sonic the Hedgehog', 'Master Chief', 'Kratos',
      'Harry Potter', 'Ron Weasley', 'Hermione Granger', 'Voldemort', 'Albus Dumbledore', 'Frodo Baggins', 'Gandalf', 'Aragorn',
      'Luke Skywalker', 'Darth Vader', 'Han Solo', 'Princess Leia', 'Yoda', 'Chewbacca', 'Indiana Jones', 'James Bond', 'Sherlock Holmes',
      'Santa Claus', 'Easter Bunny', 'Tooth Fairy', 'Dracula', 'Frankenstein', 'Mummy', 'Werewolf', 'Zombie', 'Ghost', 'Alien'
    ];
    ids.push({ type: 'identity', name: pick(genericNames), category: 'Fictional Characters', era: 'Various', hintTags: [] });
  }

  const uniqueMap = new Map();
  ids.forEach(p => uniqueMap.set(p.name, p));
  return Array.from(uniqueMap.values());
}

// Fetch real trivia from OpenTDB
async function fetchTrivia() {
  return new Promise((resolve) => {
    const url = 'https://opentdb.com/api.php?amount=50&type=multiple';
    const trivia = [];
    
    // We'll fetch 50 at a time, maybe 4-5 times to get ~200 trivia items.
    let fetches = 0;
    const fetchBatch = () => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.results) {
              parsed.results.forEach(item => {
                // unescape html entities roughly
                let q = item.question.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&");
                let a = item.correct_answer.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&");
                trivia.push({ type: 'trivia', question: q, answer: a, category: item.category, difficulty: item.difficulty === 'easy' ? 1 : item.difficulty === 'medium' ? 2 : 3 });
              });
            }
          } catch (e) {}
          fetches++;
          if (fetches < 6) {
            setTimeout(fetchBatch, 2000); // 2 sec delay to avoid rate limiting
          } else {
            resolve(trivia);
          }
        });
      }).on('error', () => {
        resolve(trivia);
      });
    };
    
    fetchBatch();
  });
}

async function run() {
  console.log("Generating words...");
  const words = generateWords();
  console.log("Generating topics...");
  const topics = generateTopics();
  console.log("Generating phrases...");
  const phrases = generatePhrases();
  console.log("Generating identities...");
  const identities = generateIdentities();
  
  console.log("Fetching trivia...");
  const trivia = await fetchTrivia();

  // If trivia fails, add some synthetic trivia
  if (trivia.length === 0) {
    for (let i = 0; i < 200; i++) {
      trivia.push({ type: 'trivia', question: `What is the capital of ${pick(countries)}?`, answer: 'Unknown (Synthetic)', category: 'Geography', difficulty: 1 });
      trivia.push({ type: 'trivia', question: `What is a group of ${pick(animals)}s called?`, answer: 'A flock/herd (Synthetic)', category: 'Animals', difficulty: 2 });
    }
  }

  const allContent = [...words, ...topics, ...phrases, ...identities, ...trivia];
  
  // Deduplicate all by string representation just in case
  const uniqueContentMap = new Map();
  allContent.forEach(item => {
    const key = JSON.stringify(item);
    uniqueContentMap.set(key, item);
  });
  
  const finalArray = Array.from(uniqueContentMap.values());

  const fileContent = `import { ContentEntry } from '../../../shared/src/index';

export const DEFAULT_CONTENT: ContentEntry[] = ${JSON.stringify(finalArray, null, 2)};
`;

  fs.writeFileSync('./functions/src/services/DefaultContent.ts', fileContent);
  console.log("Successfully wrote " + finalArray.length + " items to DefaultContent.ts");
}

run();
