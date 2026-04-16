/**
 * Generates 2K portrait ID-card images for the real AI interviewers
 * using gemini-3.1-flash-image-preview and saves to public/interviewers/
 *
 * Usage:  node scripts/generate-interviewer-images.mjs
 * Pass --force to regenerate even if file already exists
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");
const FORCE     = process.argv.includes("--force");

/* ── Load .env.local ─────────────────────────────────────────── */
const envLines = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split("\n");
const env = {};
for (const line of envLines) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
}

const API_KEY = env["GOOGLE_GEMINI_API_KEY"];
if (!API_KEY) { console.error("ERROR: GOOGLE_GEMINI_API_KEY missing"); process.exit(1); }

const MODEL   = "gemini-3.1-flash-image-preview";
const OUT_DIR = path.join(ROOT, "public", "interviewers");
fs.mkdirSync(OUT_DIR, { recursive: true });

/* ── Real interviewer data from Supabase DB ──────────────────── */
const INTERVIEWERS = [
  {
    id: "cf20f0e0-7c37-47fe-a73f-520eac9cab20",
    slug: "aria-singh",
    name: "Aria Singh",
    title: "HR Manager",
    company: "TechCorp",
    personality: "Friendly",
    experience: "8 years",
    specialties: ["Behavioral", "Culture Fit", "Soft Skills", "Salary Negotiation"],
    bio: "Focuses on culture-fit, behavioural questions, and soft skills.",
    appearance: `warm and approachable Indian woman in her early 30s, professional light blue blazer
      over white blouse, neat long black hair, friendly warm smile, subtle makeup`,
  },
  {
    id: "b202fc41-6918-4454-9e88-43da0a5d80ec",
    slug: "marcus-chen",
    name: "Marcus Chen",
    title: "Senior Software Engineer",
    company: "FAANG",
    personality: "Strict",
    experience: "12 years",
    specialties: ["DSA", "Problem Solving", "Complexity Analysis", "Coding"],
    bio: "Asks deep algorithm and data-structure questions with a rigorous style.",
    appearance: `serious and focused East Asian man in his mid 30s, dark navy technical shirt,
      short neat black hair, sharp intelligent expression, rectangular black-rimmed glasses`,
  },
  {
    id: "f56eb65a-216e-4907-b60e-c7010baf6e03",
    slug: "priya-kapoor",
    name: "Priya Kapoor",
    title: "Tech Lead",
    company: "Unicorn Startup",
    personality: "Analytical",
    experience: "10 years",
    specialties: ["System Design", "Architecture", "Leadership", "Scalability"],
    bio: "Combines architecture questions with team-dynamics and leadership scenarios.",
    appearance: `thoughtful and composed Indian woman in her early 30s, dark charcoal blazer,
      long wavy black hair, calm analytical expression, confident posture`,
  },
  {
    id: "ddceb844-2557-4289-81e4-6917a047e2b4",
    slug: "leo-russo",
    name: "Leo Russo",
    title: "Full-Stack Engineer",
    company: "Product Studio",
    personality: "Relaxed",
    experience: "7 years",
    specialties: ["React", "Node.js", "Databases", "Full Stack", "APIs"],
    bio: "Covers frontend, backend, databases and deployment in a conversational style.",
    appearance: `casual and friendly Italian-looking man in his late 20s, open-collar dark shirt,
      slightly messy brown hair, easy relaxed smile, modern creative-agency vibe`,
  },
  {
    id: "ff445d03-62d8-4a75-ab79-48fa512b7f59",
    slug: "zara-ahmed",
    name: "Zara Ahmed",
    title: "Campus Recruiter",
    company: "MNC",
    personality: "Encouraging",
    experience: "5 years",
    specialties: ["Basics", "Campus Prep", "Entry Level", "First Job"],
    bio: "Helps freshers and interns prepare for their very first job interview.",
    appearance: `bright and encouraging South Asian woman in her late 20s, colourful violet blazer,
      modern hijab or open hair, warm encouraging smile, youthful energetic expression`,
  },
  {
    id: "5a9a8fda-f446-43b3-968c-053b3971f7ee",
    slug: "victor-nwosu",
    name: "Victor Nwosu",
    title: "Engineering Manager",
    company: "Scale-up",
    personality: "Direct",
    experience: "14 years",
    specialties: ["System Design", "Leadership", "Team Management", "Estimation"],
    bio: "Evaluates both technical depth and people-management ability.",
    appearance: `confident and authoritative West African man in his late 30s, sharp white formal
      shirt with dark tie, well-groomed short hair, direct composed expression, strong presence`,
  },
];

/* ── Build the detailed prompt for each interviewer ──────────── */
function buildPrompt(iv) {
  return `
Create a ultra-realistic professional AI interviewer ID card portrait image.

Subject: ${iv.appearance}

The image should look like a premium professional corporate headshot / ID card portrait:
- Person: ${iv.name}, ${iv.title} at ${iv.company}
- Style: ${iv.personality} interview personality
- Experience: ${iv.experience} in their field
- Expert in: ${iv.specialties.join(", ")}

Photography style:
- Clean neutral dark studio background (#0d1117 dark navy gradient)
- Professional three-point studio lighting, soft shadows
- Head and upper shoulders centered composition
- Photorealistic, highly detailed, 8K quality
- Shallow depth of field, sharp face
- No text overlays, no watermarks, no borders
- The person looks directly at the camera with an expression that matches their ${iv.personality} personality

Make the portrait feel like a real professional LinkedIn headshot for a tech industry interviewer.
`.trim();
}

/* ── Call Gemini image generation API ───────────────────────── */
async function generateImage(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "2K",        // 2048 × 2048
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err.slice(0, 400)}`);
  }

  const json  = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) return part.inlineData.data;
  }
  throw new Error(`No image in response:\n${JSON.stringify(json).slice(0, 400)}`);
}

/* ── Main ────────────────────────────────────────────────────── */
async function main() {
  console.log(`\n🎨  AI Interviewer — Portrait Generator`);
  console.log(`    Model  : ${MODEL}`);
  console.log(`    Size   : 2K (2048 × 2048)`);
  console.log(`    Output : ${OUT_DIR}`);
  console.log(`    Force  : ${FORCE ? "yes (regenerating all)" : "no (skip existing)"}\n`);

  const results = [];

  for (const iv of INTERVIEWERS) {
    const outFile = path.join(OUT_DIR, `${iv.slug}.png`);

    if (!FORCE && fs.existsSync(outFile)) {
      console.log(`⏭   Skipping ${iv.name} — already exists`);
      results.push({ ...iv, status: "skipped" });
      continue;
    }

    process.stdout.write(`⏳  Generating ${iv.name} (${iv.personality}, ${iv.experience})… `);

    try {
      const b64 = await generateImage(buildPrompt(iv));
      const buf  = Buffer.from(b64, "base64");
      fs.writeFileSync(outFile, buf);
      console.log(`✅  ${(buf.length / 1024).toFixed(0)} KB`);
      results.push({ ...iv, status: "ok", sizeKB: Math.round(buf.length / 1024) });
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      console.log(`❌  FAILED`);
      console.error(`    ${err.message}\n`);
      results.push({ ...iv, status: "error", error: err.message });
    }
  }

  /* ── Summary ──────────────────────────────────────────────── */
  console.log("\n── Summary ──────────────────────────────────────────────");
  for (const r of results) {
    const icon   = r.status === "ok" ? "✅" : r.status === "skipped" ? "⏭ " : "❌";
    const detail = r.status === "ok"
      ? `${r.sizeKB} KB`
      : r.status === "error" ? r.error.slice(0, 80) : "already present";
    console.log(`${icon}  ${r.name.padEnd(22)} ${detail}`);
  }

  /* ── Supabase SQL ─────────────────────────────────────────── */
  const done = results.filter((r) => r.status === "ok" || r.status === "skipped");
  if (done.length > 0) {
    console.log("\n── Supabase SQL (paste into SQL editor) ─────────────────");
    for (const r of done) {
      console.log(
        `UPDATE interviewers SET avatar_url = '/interviewers/${r.slug}.png' WHERE id = '${r.id}';`
      );
    }
    console.log("");
  }
}

main().catch((err) => { console.error("\nFatal:", err); process.exit(1); });
