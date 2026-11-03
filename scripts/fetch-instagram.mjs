// Pulls recent posts from Instagram and saves them for the website gallery.
//
// Usage:  IG_ACCESS_TOKEN=xxxx node scripts/fetch-instagram.mjs
//
// - Uses the Instagram API with Instagram Login (graph.instagram.com).
// - Downloads each image into assets/instagram/ because Instagram's CDN
//   URLs expire after a few days.
// - Writes data/instagram.json, which js/main.js reads to render the feed.
// - Refreshes the long-lived token so it doesn't expire (60-day lifetime).

import { writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import path from "node:path";

const TOKEN = process.env.IG_ACCESS_TOKEN;
const LIMIT = Number(process.env.IG_LIMIT || 36);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const IMG_DIR = path.join(ROOT, "assets", "instagram");
const DATA_FILE = path.join(ROOT, "data", "instagram.json");
const API = "https://graph.instagram.com";

if (!TOKEN) {
  console.error("Missing IG_ACCESS_TOKEN environment variable. See INSTAGRAM_SETUP.md");
  process.exit(1);
}

async function getJson(url) {
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok || body.error) throw new Error(`Instagram API error: ${JSON.stringify(body.error || body)}`);
  return body;
}

async function refreshToken() {
  try {
    const r = await getJson(`${API}/refresh_access_token?grant_type=ig_refresh_token&access_token=${TOKEN}`);
    console.log(`Token refreshed; valid for ~${Math.round(r.expires_in / 86400)} more days.`);
  } catch (err) {
    // Tokens can only be refreshed once they are 24h old, so this is non-fatal.
    console.warn("Token refresh skipped:", err.message);
  }
}

async function fetchPosts() {
  const fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
  let url = `${API}/me/media?fields=${fields}&limit=50&access_token=${TOKEN}`;
  const posts = [];
  while (url && posts.length < LIMIT) {
    const page = await getJson(url);
    posts.push(...page.data);
    url = page.paging?.next;
  }
  return posts.slice(0, LIMIT);
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status} for ${url}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

await refreshToken();
await mkdir(IMG_DIR, { recursive: true });

const raw = await fetchPosts();
const keep = new Set();
const posts = [];

for (const p of raw) {
  // Videos/reels use their thumbnail; photos and albums use the cover image.
  const src = p.media_type === "VIDEO" ? p.thumbnail_url : p.media_url;
  if (!src) continue;
  const file = `${p.id}.jpg`;
  keep.add(file);
  try {
    await download(src, path.join(IMG_DIR, file));
  } catch (err) {
    console.warn(err.message);
    continue;
  }
  posts.push({
    id: p.id,
    caption: p.caption || "",
    media_type: p.media_type,
    permalink: p.permalink,
    timestamp: p.timestamp,
    image: `assets/instagram/${file}`,
  });
}

// Remove images for posts that were deleted or fell out of the window.
for (const f of await readdir(IMG_DIR)) {
  if (f.endsWith(".jpg") && !keep.has(f)) await unlink(path.join(IMG_DIR, f));
}

await writeFile(DATA_FILE, JSON.stringify({ updated: new Date().toISOString(), posts }, null, 2) + "\n");
console.log(`Saved ${posts.length} posts to data/instagram.json`);
