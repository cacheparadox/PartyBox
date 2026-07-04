const entries = [];
const topic = entries.length > 0 ? entries[0] : { topic: 'Animals', difficulty: 1 };

const state = {
  phase: 'instructions',
  gameId: 'double-dare',
  topic: topic.topic,
  difficulty: topic.difficulty ?? 1,
};

console.log(state);
