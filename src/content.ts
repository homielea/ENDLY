// All guided content in Endly is prepared in advance. Nothing here is generated
// live, and nothing here is legal, medical, or financial advice.

export type PathId = 'family' | 'legacy' | 'succession';

export interface Step {
  id: string;
  title: string;
  /** The one main question shown for this step. */
  question: string;
  /** A practical sentence someone could actually say out loud. */
  starter: string;
  /** Optional gentle prompts. Never required. */
  consider: string[];
  /** Optional caution shown under the question. */
  note?: string;
}

export interface GuidedPath {
  id: PathId;
  title: string;
  forWhom: string;
  description: string;
  steps: Step[];
}

export const PATHS: GuidedPath[] = [
  {
    id: 'family',
    title: 'Family conversations',
    forWhom: 'For adult children and parents',
    description:
      'Prepare for a conversation with a parent or relative about getting older, care, and the future.',
    steps: [
      {
        id: 'prepare',
        title: 'Prepare the conversation',
        question:
          'What do you hope this conversation could make easier, for them and for you?',
        starter:
          '“I’ve been thinking about the future, and I’d like to understand what matters to you. Could we talk about it a little? We don’t need to decide anything today.”',
        consider: [
          'When and where might they feel most at ease?',
          'Who else should be part of this, now or later?',
          'What will you do if they say they aren’t ready? That is a real answer, and it can change.',
        ],
      },
      {
        id: 'values',
        title: 'Explore values',
        question:
          'What does a good life look like to them now, and what would they want to protect as things change?',
        starter:
          '“When you think about the years ahead, what would you most want to stay the same?”',
        consider: [
          'Independence, staying at home, closeness to family, faith, routines, pets, a garden.',
          'What have they said in the past about how other people were cared for?',
          'Where might your values and theirs be different?',
        ],
      },
      {
        id: 'feelings',
        title: 'Discuss difficult feelings',
        question:
          'What feelings might come up, for them, for you, or for others in the family, and how could you make room for them?',
        starter:
          '“This isn’t easy to talk about, and it’s fine if it feels uncomfortable. We can stop whenever you like.”',
        consider: [
          'Fear, grief, guilt, relief, old family tensions. All of these are normal.',
          'What helps when a conversation gets heavy? A pause, a walk, a cup of tea, another day?',
          'Is there anything that should not be said in front of everyone?',
        ],
      },
      {
        id: 'next-steps',
        title: 'Record next steps',
        question: 'What, if anything, would be a small and kind next step?',
        starter:
          '“Would it help if we came back to this in a few weeks? Is there one thing you’d like me to find out about?”',
        consider: [
          'A next step can simply be “talk again later”.',
          'Who will do what? Does everyone involved actually agree, or is it still one person’s idea?',
          'What can stay undecided for now?',
        ],
      },
    ],
  },
  {
    id: 'legacy',
    title: 'Life, legacy, and goodbyes',
    forWhom: 'For anyone documenting their own wishes',
    description:
      'Reflect on what has mattered in your life, how you would like to be cared for, and what you want to leave behind.',
    steps: [
      {
        id: 'what-matters',
        title: 'Explore what matters in life',
        question: 'Looking back and looking ahead, what has given your life meaning?',
        starter: '“One thing I’d like you to know about my life is…”',
        consider: [
          'People, places, work, beliefs, small daily pleasures.',
          'Moments you are proud of, or grateful for.',
          'What you would still like to do, see, or say.',
        ],
      },
      {
        id: 'support-care',
        title: 'Discuss support and care questions',
        question:
          'If you needed more care one day, what would help you feel safe, respected, and like yourself?',
        starter: '“If I ever need more help, here is what would matter most to me…”',
        consider: [
          'Where you would like to be, if there is a choice.',
          'Who you would want to speak for you if you could not speak for yourself.',
          'Things that would comfort you, and things you would rather avoid.',
        ],
        note:
          'These are notes for conversation. Formal care or health directives are separate documents. A qualified professional where you live can explain what applies to you.',
      },
      {
        id: 'remembrance',
        title: 'Record funeral and remembrance wishes',
        question: 'How would you like to be remembered, and how would you like people to say goodbye?',
        starter: '“When the time comes, it would comfort me to know that…”',
        consider: [
          'Music, readings, a place that means something, flowers or none.',
          'A quiet gathering, a celebration, or something else entirely.',
          'It is completely fine to write “I’d like my family to decide.”',
        ],
      },
      {
        id: 'legacy-notes',
        title: 'Write personal legacy notes',
        question: 'What would you like the people you love to know, keep, or carry forward?',
        starter: '“Something I’ve never quite said out loud is…”',
        consider: [
          'Stories, recipes, lessons, a thank-you, an apology, forgiveness.',
          'Objects with a story behind them, and who might treasure them.',
          'Endly never sends these notes to anyone. You decide if, when, and how to share them.',
        ],
      },
    ],
  },
  {
    id: 'succession',
    title: 'Family-business succession',
    forWhom: 'For families who own a business together',
    description:
      'Talk through what the business means to each generation and how responsibility might pass on gradually.',
    steps: [
      {
        id: 'generations',
        title: 'Hear each generation',
        question:
          'What does the business mean to each generation, and what does each person hope for?',
        starter:
          '“Before we talk about plans, I’d like to hear what this business means to you, and what you’d want for it.”',
        consider: [
          'Pride, identity, security, worry, freedom.',
          'Does anyone in the next generation feel obliged rather than willing?',
          'Whose voice is usually missing from these conversations?',
        ],
      },
      {
        id: 'roles',
        title: 'Distinguish family, management, and ownership roles',
        question:
          'Who is family, who manages the business, and who owns it? Where do these roles overlap or get confused?',
        starter:
          '“Could we look at three separate questions: who is family, who runs the business day to day, and who owns it?”',
        consider: [
          'Being family does not automatically mean managing.',
          'Owning a share does not have to mean working in the business.',
          'Where do non-family managers or partners fit?',
        ],
      },
      {
        id: 'fairness',
        title: 'Explore fairness',
        question: 'What would feel fair to each person, and is “fair” the same as “equal” here?',
        starter:
          '“I want everyone to feel treated fairly, even if that doesn’t mean everything is the same. What would fair look like to you?”',
        consider: [
          'Family members who do not work in the business.',
          'Past contributions, sacrifices, or promises people remember.',
          'What would make someone feel overlooked?',
        ],
      },
      {
        id: 'handover',
        title: 'Plan a gradual handover',
        question: 'What could a gradual handover look like, one step at a time?',
        starter:
          '“What if we didn’t decide everything at once, and instead tried one small handover and looked at how it went together?”',
        consider: [
          'Which responsibilities could pass on first?',
          'A rough timeline is an intention, not a promise.',
          'Which advisers should be involved before anything formal happens?',
        ],
        note:
          'Ownership and handover usually involve legal, tax, and financial questions. Talk to qualified advisers before acting.',
      },
    ],
  },
];

export const NOTE_FIELDS = [
  {
    key: 'reflection',
    label: 'My own reflections',
    hint: 'Your private thoughts. Nobody else has agreed to these.',
  },
  {
    key: 'agreed',
    label: 'What we agreed together',
    hint: 'Only write things everyone involved actually agreed to. Leaving this empty is fine.',
  },
  {
    key: 'unresolved',
    label: 'Still open, to revisit',
    hint: 'Questions without an answer yet. That is normal.',
  },
] as const;

export type NoteKey = (typeof NOTE_FIELDS)[number]['key'];

export const WISH_FIELDS = [
  {
    key: 'mattersMost',
    label: 'What matters most to me',
    hint: 'Values, comforts, and the things that make you feel like yourself.',
  },
  {
    key: 'people',
    label: 'People I want involved',
    hint: 'Who you would like to be part of decisions or conversations, and in what way.',
  },
  {
    key: 'funeral',
    label: 'Funeral and remembrance preferences',
    hint: 'Music, readings, places, tone. “I’d like my family to decide” is a fine answer.',
  },
  {
    key: 'lovedOnes',
    label: 'Notes for people I love',
    hint: 'Messages, stories, or thanks. Endly never sends these anywhere.',
  },
  {
    key: 'revisit',
    label: 'Questions to revisit',
    hint: 'Things you are unsure about or want to think over again later.',
  },
] as const;

export type WishKey = (typeof WISH_FIELDS)[number]['key'];

export const PREP_CATEGORIES = [
  { key: 'will', label: 'Will', hint: 'Where a will is kept, and who has a copy.' },
  {
    key: 'careDirective',
    label: 'Care and health directives',
    hint: 'Where any care or health wishes documents are kept.',
  },
  {
    key: 'property',
    label: 'Property, accounts, and insurance',
    hint: 'Which institutions to contact and where paperwork is filed. No account numbers.',
  },
  {
    key: 'advisers',
    label: 'Key advisers',
    hint: 'For example a lawyer, notary, accountant, financial adviser, or doctor.',
  },
  {
    key: 'business',
    label: 'Business succession',
    hint: 'Shareholder agreements, succession plans, and who holds them.',
  },
] as const;

export type PrepKey = (typeof PREP_CATEGORIES)[number]['key'];

export const PREP_FIELDS = [
  { key: 'location', label: 'Where it is kept' },
  { key: 'contact', label: 'Who knows about it or can help' },
  { key: 'notes', label: 'Other notes' },
] as const;

export type PrepField = (typeof PREP_FIELDS)[number]['key'];

export function getPath(id: string): GuidedPath | undefined {
  return PATHS.find((p) => p.id === id);
}
