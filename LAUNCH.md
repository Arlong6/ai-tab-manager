# Launch Plan - AI Tab Manager

## 1. Product Hunt

### Tagline (60 chars max)
```
One-click AI tab grouping for Chrome. Tame your 50+ tabs.
```

### Description
```
Hey everyone! 👋

I built AI Tab Manager because I was drowning in 50+ browser tabs every day and couldn't find anything.

What it does:
- 🤖 AI Auto-Group — One click to organize all your tabs by topic using Google Gemini AI
- 🌐 Group by Domain — Instantly group tabs by website (works offline, free)
- 📝 Tab Summaries — Get a 2-3 sentence summary of any page
- 🔍 AI Search — Search across all tabs by meaning, not just keywords
- 💾 Save Sessions — Save your tab setup and restore it anytime

Why I built this:
I'm a developer who always has research tabs, docs, YouTube, and random stuff all mixed together. Existing tab managers just hide tabs — they don't understand them. So I added AI.

Tech: Preact + TypeScript, under 100KB total. Uses your own Gemini API key (free tier available from Google), so there's zero cost to try.

Privacy: No backend server, no data collection. Everything stays in your browser.

Would love your feedback! 🙏
```

### Images needed
1. Store icon (128x128) ✅ already have
2. Screenshot showing grouped tabs (1280x800) ✅ already have
3. GIF showing before → after grouping (optional but powerful)

### Launch timing
- Best days: Tuesday or Wednesday
- Best time: 12:01 AM PST (submit right at midnight)
- Ask 5-10 friends to upvote early (first 2 hours matter most)

---

## 2. Reddit Posts

### r/productivity

**Title:**
```
I built a free Chrome extension that uses AI to auto-organize my 50+ tabs — here's what happened
```

**Body:**
```
I always have way too many tabs open. Research for work, YouTube, random articles I'll "read later" (I never do), docs, email — all mixed together.

I tried tab managers like OneTab and Workona, but they just hide tabs. They don't actually understand what's in them.

So I built AI Tab Manager. It uses Google's Gemini AI to look at all your open tabs and automatically group them by topic. One click → your tabs are organized into color-coded groups.

What surprised me:
- It correctly grouped my "recipe" tabs together even though they were from 3 different sites
- It separated my "work" tabs from my "side project" tabs
- The whole thing is under 100KB — lighter than most images

It also has:
- Group by domain (no AI needed, works offline)
- Save/restore tab sessions
- Tab summaries (2-3 sentence summary of any page)

It's free and uses your own Gemini API key (Google gives a free tier).

Chrome Web Store: [link]

Happy to answer any questions about how it works!
```

### r/chrome

**Title:**
```
[Extension] AI Tab Manager — auto-groups your tabs by topic with one click using Gemini AI
```

**Body:**
```
I made a Chrome extension that uses AI to organize tabs. Here's what it does:

- Click "AI Group" → all tabs get sorted into color-coded groups by topic
- Click "Group by Domain" → groups by website (no AI, free)
- Save your current tabs as a "session" to restore later
- Summarize any page in 2-3 sentences
- Side panel UI for managing everything

Uses your own Gemini API key (free tier from Google). No backend server, no data collection, everything stays local.

Total size: 21KB zipped. 

Chrome Web Store: [link]
Source: https://github.com/Arlong6/ai-tab-manager

Feedback welcome!
```

### r/SideProject

**Title:**
```
I built and published a Chrome Extension in one day using AI — here's the full process
```

**Body:**
```
Yesterday I went from zero to published on the Chrome Web Store. Here's what I built and how.

**The idea:** An AI-powered tab manager. Most tab managers just hide or save tabs. Mine actually understands them and groups them by topic.

**Tech stack:**
- Preact + TypeScript (3KB framework vs React's 130KB)
- Vite for building
- Google Gemini 2.5 Flash API for AI features
- Chrome Manifest V3
- Total bundle: 21KB

**Key decisions:**
- BYOK (Bring Your Own Key) — users provide their own Gemini API key, so I don't need a backend server
- Side Panel as the main UI (more space than a popup)
- AI features are optional — basic tab grouping works offline

**What I learned:**
1. Chrome MV3 service workers can't use ES module imports — had to inline everything
2. Gemini 2.5 Flash has a "thinking" mode that breaks JSON output — had to disable it
3. The Chrome Web Store requires privacy policy, permission justifications, and screenshots before you can publish

**Timeline:**
- Morning: Research + planning
- Afternoon: Built all features
- Evening: Fixed bugs, published

**Revenue model (planned):**
- Free: basic features with your own API key
- Pro ($7.99/mo): managed API key, unlimited sessions, team features

Chrome Web Store: [link]
GitHub: https://github.com/Arlong6/ai-tab-manager

AMA about the process!
```

---

## 3. Twitter/X Thread

```
🧵 I built and shipped a Chrome Extension in one day. Here's what I learned:

1/ The idea: AI Tab Manager
Everyone has 50+ tabs open. Tab managers hide them. Mine uses AI to actually understand and organize them.

2/ The stack:
- Preact (3KB) instead of React (130KB)
- Gemini 2.5 Flash for AI
- Total extension size: 21KB
- Zero backend needed

3/ The trick: BYOK (Bring Your Own Key)
Users provide their own Gemini API key.
→ No server costs
→ No auth system
→ No monthly AI bills
Free tier from Google = free for users

4/ Biggest gotcha:
Chrome MV3 service workers don't support ES module imports.
Spent 2 hours debugging before splitting the build.

5/ Second gotcha:
Gemini 2.5 Flash has a "thinking" mode that outputs broken JSON.
Fix: set thinkingBudget: 0

6/ It's live on the Chrome Web Store:
[link]

Source code: github.com/Arlong6/ai-tab-manager

#buildinpublic #chrome #ai #indiehacker
```
