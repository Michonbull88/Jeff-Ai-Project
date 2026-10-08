export type WebLesson = {
  id: string;
  order: number;
  title: string;
  group: string;
  keywords: string[];
  goal: string;
  explanation: string[];
  code: string;
  language: string;
  exercise: string;
  hint: string;
  quiz: {
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  };
  reference: { title: string; url: string };
};
export type KnowledgeSource = { id: string; title: string; url: string };
export type WebReply = {
  cached?: boolean;
  memorySaved?: boolean;
  content: string;
  sources: KnowledgeSource[];
  grounded: boolean;
  live: false;
};
