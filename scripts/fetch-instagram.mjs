// Pulls recent posts from Instagram and saves them for the website gallery.
//
// Usage:  IG_ACCESS_TOKEN=xxxx node scripts/fetch-instagram.mjs
//
// - Works with either token type Meta hands out:
//     IG...  tokens -> Instagram API with Instagram Login (graph.instagram.com)
//     EAA... tokens -> Instagram Graph API via Facebook (graph.facebook.com),
//                      using the Instagram account ID in IG_USER_ID.
// - Pictures only: videos and reels are skipped.
// - Downloads each image into assets/instagram/ because Instagram's CDN
//   URLs expire after a few days.
// - Writes data/instagram.json, which js/main.js reads to render the feed.
// - Refreshes the long-lived token so it doesn't expire (60-day lifetime).

import { writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import path from "node:path";

// Strip stray whitespace/quotes/"Bearer " that sneak in when copy-pasting.
let TOKEN = (process.env.IG_ACCESS_TOKEN || "").trim().replace(/^bearer\s+/i, "").replace(/^["']|["']$/g, "").trim();
// Catch the token accidentally pasted twice in a row.
if (TOKEN.length % 2 === 0 && TOKEN.slice(0, TOKEN.length / 2) === TOKEN.slice(TOKEN.length / 2)) {
  console.warn("Token looked like it was pasted twice; using a single copy.");
  TOKEN = TOKEN.slice(0, TOKEN.length / 2);
}
// Never print the token, even when Meta echoes it back in an error.
const redact = (text) => (TOKEN ? text.split(TOKEN).join("[token hidden]") : text);
const IG_USER_ID = (process.env.IG_USER_ID || "17841466980768421").trim();
const LIMIT = Number(process.env.IG_LIMIT || 36);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const IMG_DIR = path.join(ROOT, "assets", "instagram");
const DATA_FILE = path.join(ROOT, "data", "instagram.json");
const API = "https://graph.instagram.com";
const FB_API = "https://graph.facebook.com/v21.0";

if (!TOKEN) {
  console.error("Missing IG_ACCESS_TOKEN environment variable. See INSTAGRAM_SETUP.md");
  process.exit(1);
}

async function getJson(url) {
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok || body.error) throw new Error(redact(`Instagram API error: ${JSON.stringify(body.error || body)}`));
  return body;
}

async function refreshToken() {
  if (!TOKEN.startsWith("IG")) return; // only Instagram-login tokens use this refresh endpoint
  try {
    const r = await getJson(`${API}/refresh_access_token?grant_type=ig_refresh_token&access_token=${TOKEN}`);
    console.log(`Token refreshed; valid for ~${Math.round(r.expires_in / 86400)} more days.`);
  } catch (err) {
    // Tokens can only be refreshed once they are 24h old, so this is non-fatal.
    console.warn("Token refresh skipped:", err.message);
  }
}

const FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";

async function fetchPosts() {
  if (TOKEN.startsWith("IG")) return pagedFetch(`${API}/me/media?fields=${FIELDS}&limit=50&access_token=${TOKEN}`);
  try {
    return await pagedFetch(`${FB_API}/${IG_USER_ID}/media?fields=${FIELDS}&limit=50&access_token=${TOKEN}`);
  } catch (fbErr) {
    // Last resort: maybe it's an Instagram-login token with an unusual prefix.
    try {
      return await pagedFetch(`${API}/me/media?fields=${FIELDS}&limit=50&access_token=${TOKEN}`);
    } catch (_) {
      throw fbErr;
    }
  }
}

// Photos and photo albums only: skip videos/reels, and albums whose cover is a video.
const isVideoUrl = (u = "") => /\.(mp4|mov)(\?|$)/i.test(u.split("?")[0] + "?");
const isPicture = (p) =>
  (p.media_type === "IMAGE" || p.media_type === "CAROUSEL_ALBUM") && p.media_url && !isVideoUrl(p.media_url);

async function pagedFetch(firstUrl) {
  let url = firstUrl;
  const posts = [];
  while (url && posts.length < LIMIT) {
    const page = await getJson(url);
    posts.push(...page.data.filter(isPicture));
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
  const src = p.media_url; // photo, or the album's cover photo
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
