export interface Starter {
  id: string;
  label: string;
  /** Seed goal written into the input when the user taps the chip. */
  goal: string;
  tagline: string;
}

export const STARTERS: Starter[] = [
  {
    id: 'summarize-paper',
    label: 'Summarize a paper',
    goal: 'Summarize a research paper for someone who is smart but not in the field.',
    tagline: 'turn dense research into a paragraph a friend could follow',
  },
  {
    id: 'draft-email',
    label: 'Draft an email',
    goal: 'Draft a polite but firm email replying to a tricky situation.',
    tagline: 'write a message with the right tone on the first try',
  },
  {
    id: 'review-code',
    label: 'Review my code',
    goal: 'Review a code diff and flag the three most important risks with reasoning.',
    tagline: 'get thoughtful feedback, not a rubber stamp',
  },
  {
    id: 'explain-concept',
    label: 'Explain a concept',
    goal: 'Explain a technical concept to a specific audience with one good analogy.',
    tagline: 'teach one idea clearly, for the person you have in mind',
  },
  {
    id: 'interview-answer',
    label: 'Prep an answer',
    goal: 'Help me prepare an answer to a behavioural interview question with a STAR structure.',
    tagline: 'rehearse a sharp, structured reply',
  },
  {
    id: 'brainstorm',
    label: 'Brainstorm ideas',
    goal: 'Brainstorm a diverse set of ideas for a specific problem, with reasoning for each.',
    tagline: 'get ten options instead of one',
  },
];
