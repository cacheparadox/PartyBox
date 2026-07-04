import type { AISettings } from '../../../../shared/src/index';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: { content: string };
  }>;
}

async function callOpenRouter(
  settings: AISettings,
  messages: OpenRouterMessage[]
): Promise<string> {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://partybox.app',
      'X-Title': 'PartyBox',
    },
    body: JSON.stringify({
      model: settings.model,
      messages,
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = (await response.json()) as OpenRouterResponse;
  return data.choices[0]?.message?.content ?? '';
}

export interface GeneratedTriviaQuestion {
  question: string;
  answer: string;
  bluff: string;
}

export async function generateTriviaQuestion(
  settings: AISettings,
  category: string
): Promise<GeneratedTriviaQuestion | null> {
  try {
    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: `You are a trivia question generator for a party game. Generate creative, interesting questions that are not too obvious but not too obscure. Always respond with valid JSON only.`,
      },
      {
        role: 'user',
        content: `Generate a trivia question for the category "${category}". 
        Respond with JSON only in this exact format:
        {
          "question": "the trivia question",
          "answer": "the correct answer (1-5 words)",
          "bluff": "a plausible but wrong answer (1-5 words) that could fool players"
        }`,
      },
    ];

    const raw = await callOpenRouter(settings, messages);

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]) as GeneratedTriviaQuestion;
    return parsed;
  } catch (err) {
    console.error('AI trivia generation failed:', err);
    return null;
  }
}

export interface GeneratedIdentity {
  name: string;
  category: string;
  hintTags: string[];
  nationality: string;
  era: string;
}

export async function generateIdentity(
  settings: AISettings,
  category: string
): Promise<GeneratedIdentity | null> {
  try {
    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: `You are generating famous people identities for a party game called Reverse Guess Who. Generate real, widely-known famous people that a general audience would recognize.`,
      },
      {
        role: 'user',
        content: `Generate a famous person from the category "${category}".
        Respond with JSON only:
        {
          "name": "Full Name",
          "category": "${category}",
          "hintTags": ["tag1", "tag2", "tag3"],
          "nationality": "American",
          "era": "2000s"
        }`,
      },
    ];

    const raw = await callOpenRouter(settings, messages);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    return JSON.parse(jsonMatch[0]) as GeneratedIdentity;
  } catch (err) {
    console.error('AI identity generation failed:', err);
    return null;
  }
}
