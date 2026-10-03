# Writing the explanations

Every step of every topic has an "Explain this step" panel, and a one-sentence note on the left card. This is how to write them. The goal is that a reader who has never met the idea understands it after reading the panel while looking at the screen, and that it reads like a person who knows the subject talking at a bench, not like generated filler.

## Start from the level on the card

- **Beginner:** assume nothing. Define every term the first time it appears, in plain words. No formulas unless the formula is the point, and then explain each symbol. One idea per step.
- **Intermediate:** assume school-level maths and science. Name the real terms, give the formula, and say what each part means.
- **Advanced:** assume the field's basics, and spend the words on the subtle part.

If a topic cannot be made to fit its level, change the level in `topics.json`. Do not leave a Beginner label on something that is not.

## Structure of a panel

```js
explain: {
  title: 'Each column is worth ten times the one to its right',   // a plain statement of the idea, not a hook
  sections: [
    { h: 'What you see',   p: ['…', '…'] },                       // what is on the screen, named the way the screen names it
    { h: 'How it works',   p: ['…'] },                            // the reason, with a real example and real numbers
    { h: 'In real life',   p: ['…'] },                            // optional: where this shows up outside the page
    { h: 'Common mix-up',  p: ['…'] }                             // optional: one wrong idea people really have, and the fix
  ],
  tryit: ['Drag the slider to 5% and watch the call turn into noise.']   // one or two concrete actions and what happens
}
```

The page renders each section as a small heading and its paragraphs, then the "Try this" box. Use only the sections that earn their place. A panel is about 150 to 220 words in total, and no section has more than three short paragraphs.

The note on the left card is one plain sentence about what to look at. It does not summarise the panel.

## Voice

- Plain, concrete and calm. Short sentences. Active verbs. Say the thing.
- Start with what is on the screen ("The orange bar is…"), then why, then what to try.
- Use real examples with real numbers and units ("7 + 1 = 8, which is 1000 in binary"), and name real things (the RISC-V `add` instruction, the GRCh38 reference genome).
- Define a term once, where it first matters. Do not define it again.
- Mark simplifications where they happen: "simplified here", "about", "typically". Use `~` for approximate numbers.
- Say what is not shown if it would mislead.

## What to avoid

These make text read as machine-written. Cut them.

- Openers and fillers: "Let's dive in", "Imagine…", "Picture this", "Here's the thing", "It's worth noting", "Essentially", "In essence", "Simply put", "At its core", "Crucially", "Remember that".
- Hype words: fascinating, powerful, magic, seamless, unlock, journey, game-changer, elegant, beautiful, incredible.
- The "not X, but Y" contrast and its relatives used for rhythm ("It isn't just…, it's…").
- Three-item lists written for cadence, rhetorical questions, and exclamation marks.
- Em dashes. Use a comma, a colon or a full stop.
- Stacked metaphors. One analogy is allowed when it does real work: label it as an analogy and say where it stops being true.
- Praise or reassurance aimed at the reader ("Don't worry", "It's easier than it looks").
- Vague claims ("many", "a lot", "very fast") when a number is known.

## Accuracy

Everything follows [CONTENT_POLICY.md](CONTENT_POLICY.md). Check every number and every statement against a source you trust. If you simplify, say so in the panel. A short, correct panel beats a long one that is nearly right.
