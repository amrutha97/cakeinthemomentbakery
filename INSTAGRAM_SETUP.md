# Instagram photo feed: setup plan

The Gallery page and the "Recent creations" section on the homepage read
`data/instagram.json`. Until it has posts, the site shows pink placeholder tiles
that link to [@cakeinthemomentbakery](https://www.instagram.com/cakeinthemomentbakery/).

There are two ways to fill it. **Option A** is free and fully automatic once set up.
**Option B** takes about 10 minutes but uses a third-party widget.

---

## Option A (recommended): automatic daily sync with the Instagram API

**How it works:** a GitHub Action runs every morning, asks Instagram for your latest
posts, saves the photos into `assets/instagram/`, updates `data/instagram.json`, and
commits them. GitHub Pages republishes the site on its own. Your access token stays
in GitHub Secrets and never appears on the public site.

### 1. Make the Instagram account a Professional account
In the Instagram app: **Settings → Account type and tools → Switch to professional account**.
Choose **Business** or **Creator**; either one works. This is free.

### 2. Create a Meta developer app
1. Go to <https://developers.facebook.com/apps> and log in, then click **Create App**.
2. Use case: **Other**. App type: **Business**. Name it something like "Cake in the Moment Website".
3. In the app dashboard, add the **Instagram** product, then choose
   **API setup with Instagram login**.

### 3. Generate an access token
1. In **Instagram → API setup with Instagram login → Generate access tokens**, click
   **Add account** and log in as `@cakeinthemomentbakery`.
2. Under **App roles → Roles**, add the Instagram account as an **Instagram Tester** and accept the
   invite in Instagram (**Settings → Apps and websites → Tester invites**) if you're asked to.
3. Click **Generate token** next to the account, then copy the token. This is a
   *long-lived* token (valid 60 days). The sync script refreshes it on every run, so
   it keeps working as long as the Action runs at least once every 60 days.

> The app can stay in **Development** mode. You don't need App Review because you're only
> reading your own account's posts.

### 4. Add the token to GitHub
1. In the GitHub repo, go to **Settings → Secrets and variables → Actions → New repository secret**.
2. Name: `IG_ACCESS_TOKEN`. Value: paste the token.
3. Under **Settings → Actions → General → Workflow permissions**, select **Read and write permissions**.

### 5. Run it
**Actions** tab → **Sync Instagram feed** → **Run workflow**. In about a minute you'll see a
commit titled "Update Instagram feed", and your photos will appear on the site shortly after.
From then on it runs every day at about 7am Pacific.

To test on your computer instead:
```bash
IG_ACCESS_TOKEN=your_token_here node scripts/fetch-instagram.mjs
python3 -m http.server 8000   # then open http://localhost:8000
```

### Troubleshooting
| Symptom | Fix |
|---|---|
| Action fails with `Invalid OAuth access token` | The token expired (the Action didn't run for 60+ days). Generate a new one (step 3) and update the secret. |
| Action fails on `git push` | Turn on **Read and write permissions** (step 4.3). |
| Commit appears but the site doesn't update | Check **Settings → Pages**. The source should be your `main` branch. |
| Gallery filters show nothing | Filters match words in captions (e.g. "birthday", "wedding", "cupcake"). Use those words or hashtags in your posts. |

---

## Option B (no code): embed a widget

Services like **Behold** (behold.so), **LightWidget**, **SnapWidget** or **Elfsight** connect to
Instagram for you and give you a snippet to paste. Free tiers usually update less often or
add a small watermark.

To use one, paste its embed code into `gallery.html` in place of this line:
```html
<div class="ig-grid" data-ig-feed data-filterable data-limit="36" aria-live="polite"></div>
```
(and the matching `data-ig-feed` line in `index.html` if you want it on the homepage too).
The gallery's category filter buttons only work with Option A.

---

## Why not just embed Instagram posts directly?
Instagram's old "Basic Display API" was shut down in December 2024, and browser code can't
call the Instagram API without exposing your token publicly. Fetching on a schedule
(Option A) keeps the token private, makes the site fast, and keeps working if Instagram's
image links change.
