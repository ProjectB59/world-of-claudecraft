// Minimal AI pull-request reviewer. Sends the PR diff to an OpenRouter model (default:
// the free openrouter/owl-alpha stealth model) and posts the review as a single sticky
// comment on the PR. No new npm deps: Node 18+ global fetch + the GitHub REST API.
//
// It is best-effort and NON-BLOCKING: if OPENROUTER_API_KEY is absent (for example a
// fork PR that cannot read repo secrets) it prints a notice and exits 0, so it never
// gates a merge. The model is swappable via OPENROUTER_MODEL with zero workflow edits,
// which matters because owl-alpha is a free stealth model that can disappear at any time.
//
// PRIVACY: the free owl-alpha tier logs prompts to improve the model, so the diff you
// send is retained by a third party. Point OPENROUTER_MODEL at a non-logging / paid
// model (or a self-hosted one) before using this on code you cannot disclose.
//
// Env (set by the workflow):
//   OPENROUTER_API_KEY  OpenRouter key (repo secret); absent -> skip, exit 0
//   GITHUB_TOKEN        token with pull-requests:write (default Actions token)
//   GITHUB_REPOSITORY   owner/repo
//   PR_NUMBER           the pull request number
//   DIFF_FILE           path to a unified diff to review
//   OPENROUTER_MODEL    model id (default openrouter/owl-alpha)
//   MAX_DIFF_CHARS      cap on diff chars sent to the model (default 60000)
import fs from 'node:fs';
import { upsertStickyComment } from './gh_sticky_comment.mjs';

const MARKER = '<!-- pr-ai-review -->';
const MODEL = process.env.OPENROUTER_MODEL || 'openrouter/owl-alpha';
const MAX_DIFF_CHARS = Number(process.env.MAX_DIFF_CHARS || 60000);
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

const key = process.env.OPENROUTER_API_KEY;
const prNumber = process.env.PR_NUMBER;
const diffFile = process.env.DIFF_FILE;

if (!key) {
  console.log('[ai_review] OPENROUTER_API_KEY not set; skipping AI review (non-blocking).');
  process.exit(0);
}

let diff = '';
try {
  diff = fs.readFileSync(diffFile, 'utf8');
} catch {
  console.log(`[ai_review] could not read DIFF_FILE=${diffFile}; skipping.`);
  process.exit(0);
}
if (!diff.trim()) {
  console.log('[ai_review] empty diff; skipping.');
  process.exit(0);
}

let truncated = false;
if (diff.length > MAX_DIFF_CHARS) {
  diff = diff.slice(0, MAX_DIFF_CHARS);
  truncated = true;
}

const system = [
  'You are a concise senior code reviewer for World of ClaudeCraft, a TypeScript micro-MMO',
  'and reinforcement-learning environment built on one deterministic 20 Hz simulation core.',
  'Key invariants to watch for: src/sim/ must stay pure (no DOM/Three/render/ui/net imports);',
  'all randomness goes through the Rng helper, never Math.random/Date.now/performance.now; the',
  'server is authoritative and clients never decide outcomes; every player-visible string is a',
  't() key; no em dashes, en dashes, or emojis anywhere.',
  'Review ONLY the diff below. Be specific and brief. Group findings under: Correctness,',
  'Invariants, Tests, Nits. Tag each finding with severity (high/medium/low). If the change',
  'looks fine, say so in one line. Do not restate the diff. Output GitHub-flavored Markdown.',
].join(' ');

const user = `${truncated ? `Note: the diff was truncated to the first ${MAX_DIFF_CHARS} characters.\n\n` : ''}Unified diff to review:\n\n\`\`\`diff\n${diff}\n\`\`\``;

async function review() {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'X-Title': 'WoCC PR review',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenRouter HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content)
    throw new Error(`OpenRouter returned no content: ${JSON.stringify(data).slice(0, 500)}`);
  return content;
}

let reviewText;
try {
  reviewText = await review();
} catch (e) {
  // Non-blocking: a model/API failure leaves a short note rather than failing the job.
  console.log(`[ai_review] review failed (non-blocking): ${e.message}`);
  reviewText = `_The automated review could not run this time (\`${MODEL}\`). See the workflow logs._`;
}

const body = [
  `## AI review (\`${MODEL}\`)`,
  '',
  reviewText,
  truncated ? `\n<sub>Diff truncated to the first ${MAX_DIFF_CHARS} characters.</sub>` : '',
  '',
  '<sub>Automated and non-blocking. May be wrong; a human review still decides. The free owl-alpha tier logs prompts, so the diff is retained by a third party.</sub>',
].join('\n');

try {
  const result = await upsertStickyComment({ marker: MARKER, body, prNumber });
  console.log(`ai review comment: ${result ?? 'skipped'}`);
} catch (e) {
  console.log(`[ai_review] could not post comment (non-blocking): ${e.message}`);
}
