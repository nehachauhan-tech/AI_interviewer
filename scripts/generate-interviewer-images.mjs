/**
 * Generates 2K (2048) portrait images for each AI interviewer
 * using Gemini gemini-3.1-flash-image-preview and saves to public/interviewers/
 *
 * Usage:  node scripts/generate-interviewer-images.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/* ── Load .env.local ─────────────────────────────────────────── */
const envPath = path.join(ROOT, ".env.local");
const envLines = fs.readFileSync(envPath, "utf8").split("\n");
const env = {};
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
}

const API_KEY = env["GOOGLE_GEMINI_API_KEY"];
if (!API_KEY) {
  console.error("ERROR: GOOGLE_GEMINI_API_KEY not found in .env.local");
  process.exit(1);
}

/* ── Model + output config ───────────────────────────────────── */
const MODEL   = "gemini-3.1-flash-image-preview";
const OUT_DIR = path.join(ROOT, "public", "interviewers");
fs.mkdirSync(OUT_DIR, { recursive: true });

/* ── Interviewer definitions ─────────────────────────────────── */
const INTERVIEWERS = [
  {
    slug: "arjun-sharma",
    name: "Arjun Sharma",
    title: "Senior Software Engineer",
    company: "Google",
    personality: "Strict",
    prompt: `Ultra-realistic professional corporate headshot portrait of a male Indian software
      engineer named Arjun Sharma, early 30s, wearing a crisp dark navy business shirt,
      confident serious expression, short neat black hair, clean-shaven, sharp intelligent eyes,
      neutral light grey studio background with subtle gradient, professional studio lighting
      with soft key light and fill light, shallow depth of field, photorealistic, highly detailed,
      no text, no watermark, centered head-and-shoulders composition.`,
  },
  {
    slug: "priya-mehta",
    name: "Priya Mehta",
    title: "HR Manager",
    company: "Infosys",
    personality: "Friendly",
    prompt: `Ultra-realistic professional corporate headshot portrait of a female Indian HR manager
      named Priya Mehta, late 20s, warm friendly smile, wearing a professional light blue formal
      blazer over white blouse, neat long black hair tied back, approachable confident expression,
      subtle makeup, soft warm studio background with off-white gradient, professional three-point
      studio lighting, photorealistic, highly detailed, no text, no watermark,
      centered head-and-shoulders composition.`,
  },
  {
    slug: "rahul-verma",
    name: "Rahul Verma",
    title: "Tech Lead",
    company: "Microsoft",
    personality: "Analytical",
    prompt: `Ultra-realistic professional corporate headshot portrait of a male Indian tech lead
      named Rahul Verma, mid 30s, wearing rectangular black-rimmed glasses and dark charcoal grey
      formal shirt, thoughtful analytical expression, medium length neatly styled black hair,
      slight beard, calm intelligent demeanor, clean dark gradient studio background,
      professional studio lighting with cool tone highlights, photorealistic, highly detailed,
      no text, no watermark, centered head-and-shoulders composition.`,
  },
  {
    slug: "sara-chen",
    name: "Sara Chen",
    title: "Frontend Engineer",
    company: "Meta",
    personality: "Encouraging",
    prompt: `Ultra-realistic professional corporate headshot portrait of a female East Asian frontend
      engineer named Sara Chen, late 20s, wearing a stylish dark turtleneck sweater,
      warm encouraging smile, straight black hair shoulder-length with side part,
      bright expressive eyes, modern tech aesthetic, clean minimal light grey studio background,
      professional natural studio lighting, photorealistic, highly detailed,
      no text, no watermark, centered head-and-shoulders composition.`,
  },
  {
    slug: "david-okafor",
    name: "David Okafor",
    title: "Engineering Manager",
    company: "Amazon",
    personality: "Direct",
    prompt: `Ultra-realistic professional corporate headshot portrait of a male African engineering
      manager named David Okafor, late 30s, wearing a sharp well-fitted white formal shirt
      with dark tie, confident direct expression, short well-groomed hair,
      strong professional presence, clean neutral warm-toned studio background,
      professional corporate studio lighting, photorealistic, highly detailed,
      no text, no watermark, centered head-and-shoulders composition.`,
  },
  {
    slug: "neha-gupta",
    name: "Neha Gupta",
    title: "Data Scientist",
    company: "Flipkart",
    personality: "Relaxed",
    prompt: `Ultra-realistic professional corporate headshot portrait of a female Indian data scientist
      named Neha Gupta, early 30s, wearing a casual-professional dark burgundy blazer,
      relaxed calm smile, long wavy black hair, intelligent approachable expression,
      subtle modern jewelry, warm neutral studio background with soft gradient,
      professional natural studio lighting, photorealistic, highly detailed,
      no text, no watermark, centered head-and-shoulders composition.`,
  },
];

/* ── Call Gemini image generation API ───────────────────────── */
async function generateImage(interviewer) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  const body = {
    contents: [{ parts: [{ text: interviewer.prompt }] }],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "2K",           // 2048 × 2048
      },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err.slice(0, 400)}`);
  }

  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts ?? [];

  for (const part of parts) {
    if (part.inlineData?.data) return part.inlineData.data; // base64 PNG
  }

  throw new Error(`No image in response:\n${JSON.stringify(json, null, 2).slice(0, 500)}`);
}

/* ── Main ────────────────────────────────────────────────────── */
async function main() {
  console.log(`\n🎨  AI Interviewer — Portrait Generator`);
  console.log(`    Model  : ${MODEL}`);
  console.log(`    Size   : 2K (2048 × 2048)`);
  console.log(`    Output : ${OUT_DIR}\n`);

  const results = [];

  for (const iv of INTERVIEWERS) {
    const outFile = path.join(OUT_DIR, `${iv.slug}.png`);

    if (fs.existsSync(outFile)) {
      console.log(`⏭   Skipping ${iv.name} — already exists`);
      results.push({ ...iv, status: "skipped" });
      continue;
    }

    process.stdout.write(`⏳  Generating ${iv.name} (${iv.personality})… `);

    try {
      const b64 = await generateImage(iv);
      const buf  = Buffer.from(b64, "base64");
      fs.writeFileSync(outFile, buf);
      console.log(`✅  saved  (${(buf.length / 1024).toFixed(0)} KB)`);
      results.push({ ...iv, status: "ok", sizeKB: Math.round(buf.length / 1024) });

      // 2 s between requests to stay within rate limits
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      console.log(`❌  FAILED`);
      console.error(`    ${err.message}\n`);
      results.push({ ...iv, status: "error", error: err.message });
    }
  }

  /* ── Summary ──────────────────────────────────────────────── */
  console.log("\n── Summary ──────────────────────────────────────────");
  for (const r of results) {
    const icon   = r.status === "ok" ? "✅" : r.status === "skipped" ? "⏭ " : "❌";
    const detail = r.status === "ok"
      ? `${r.sizeKB} KB`
      : r.status === "error"
      ? r.error.slice(0, 80)
      : "already present";
    console.log(`${icon}  ${r.name.padEnd(20)}  ${detail}`);
  }

  /* ── Supabase SQL snippet ─────────────────────────────────── */
  const done = results.filter((r) => r.status === "ok" || r.status === "skipped");
  if (done.length > 0) {
    console.log("\n── Supabase SQL — paste into SQL editor ─────────────");
    for (const r of done) {
      console.log(
        `UPDATE interviewers SET avatar_url = '/interviewers/${r.slug}.png' WHERE name = '${r.name}';`
      );
    }
    console.log("");
  }
}

main().catch((err) => {
  console.error("\nFatal:", err);
  process.exit(1);
});
