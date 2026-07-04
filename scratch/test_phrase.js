const fs = require('fs');
const content = fs.readFileSync('./client/src/engine/services/DefaultContent.ts', 'utf8');

const arrayString = content.substring(content.indexOf('['));

let DEFAULT_CONTENT;
eval('DEFAULT_CONTENT = ' + arrayString);

const phrases = DEFAULT_CONTENT.filter(e => e.type === 'phrase');
console.log("Total phrases:", phrases.length);
if (phrases.length > 0) {
  const missing = phrases.filter(p => p.phrase === undefined);
  console.log("Missing .phrase:", missing.length);
  if (missing.length > 0) {
    console.log("Example missing:", missing[0]);
  }
}
