// Autonomous follow-up chaining — detect skill invocations in Claude output
// and auto-execute them in the same thread.

const SKILL_PATTERNS = [
  // "I'd recommend running /daily-brief"
  // "you could run /process-inbox"
  // "try running /process-meeting"
  // "Let me run /digest"
  /(?:recommend|suggest|could|should|try|let me|going to|want to)\s+(?:run|running|execute|invoke)\s+(\/\S+)/i,
  // "run /process-inbox to ..."
  /\brun\s+(\/\S+)\b/i,
  // "invoke /daily-brief"
  /\binvoke\s+(\/\S+)\b/i,
];

// Skills that are safe to auto-chain (whitelist for safety)
// Add your own skill names here
const CHAINABLE_SKILLS = new Set([
  "/sleep",
  "/maintain",
  "/digest",
  "/independent-work",
  "/daily-brief",
  "/process-meeting",
  "/prep-meeting",
  "/writing-slack",
]);

const MAX_CHAIN_DEPTH = 2;

export function detectFollowup(text) {
  for (const pattern of SKILL_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const skill = match[1].split(/[\s,.)]+/)[0]; // trim trailing punctuation
      if (CHAINABLE_SKILLS.has(skill)) {
        return skill;
      }
    }
  }
  return null;
}

export function shouldChain(depth) {
  return depth < MAX_CHAIN_DEPTH;
}

export { MAX_CHAIN_DEPTH };
