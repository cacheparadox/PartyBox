const fs = require('fs');

const content = fs.readFileSync('./client/src/engine/services/DefaultContent.ts', 'utf8');

// Strip out the export part to make it valid JSON or eval-able
const arrayString = content.substring(content.indexOf('['));

// It might have trailing semicolons or typescript stuff. Let's just eval it in a safe context
let DEFAULT_CONTENT;
eval('DEFAULT_CONTENT = ' + arrayString);

const topics = DEFAULT_CONTENT.filter(e => e.type === 'topic');
console.log("Total topics:", topics.length);
if (topics.length > 0) {
  console.log("First topic:", topics[0]);
  console.log("Random topic:", topics[Math.floor(Math.random() * topics.length)]);
  
  // Find topics missing a .topic property
  const missing = topics.filter(t => t.topic === undefined);
  console.log("Missing .topic:", missing.length);
  if (missing.length > 0) {
    console.log("Example missing:", missing[0]);
  }
}
