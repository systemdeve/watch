# Remote Support — Setup Guide

Two pages:
- **monitor.html** — opened by the person you're helping. Lets them share their screen, front camera, or back camera (with mic audio). Always shows a red "you are sharing" banner with a Stop button, and cleans itself up automatically if the tab closes.
- **viewer.html** — opened by you (works great on a phone; installable via the Install App button). Lets you watch the stream, send your own mic audio, point at things on their preview, and see past session history.

They connect to each other using a Firebase Realtime Database as the "signaling" channel — it only passes connection setup info, not the actual video. The video/audio itself flows directly device-to-device over WebRTC.

## 1. Create a Firebase project (free)

1. Go to https://console.firebase.google.com and create a new project.
2. In the project, go to **Build → Realtime Database → Create Database**. Start in **test mode** for now (you'll lock it down in step 3).
3. Go to **Project settings → General**, scroll to "Your apps", click the web icon (`</>`), register an app (no hosting needed yet), and copy the `firebaseConfig` object it gives you.

## 2. Paste your config into both files

Open `monitor.html` and `viewer.html`, and replace the `firebaseConfig` object near the bottom of each with your project's config. It must be **identical in both files**, and `databaseURL` must be filled in (copy it from the top of the Realtime Database page — it's not included in the default config snippet Firebase shows you).

## 3. Lock down the database rules

Go to **Realtime Database → Rules** and use this. It scopes write access to the `sessions` path, lets a session be created freely, but expires access to any session older than 2 hours — so an old or leaked code stops working on its own:

```json
{
  "rules": {
    "sessions": {
      "$sessionId": {
        ".read": "!data.exists() || now < data.child('createdAt').val() + 7200000",
        ".write": "!data.exists() || now < data.child('createdAt').val() + 7200000"
      }
    },
    "history": {
      ".read": true,
      ".write": true
    }
  }
}
```

Click **Publish** — rules don't apply until you do. This is still fairly open (anyone with a session code can join within the 2-hour window), which is fine for short-lived support sessions since codes are random. For anything more sensitive, add Firebase Authentication and scope rules to signed-in users — ask me if you want that built in.

**Also restrict your API key** in Google Cloud Console → APIs & Services → Credentials → (your key) → Application restrictions → HTTP referrers → add your deployed domain. This stops the key from being usable from anywhere but your own site.

## 4. Deploy

All files are plain static assets — no build step. Push **all of them to the same folder**: `monitor.html`, `viewer.html`, `manifest.json`, `manifest-monitor.json`, `icon.svg`, `sw.js`. Easiest options, same as your other projects:

- **GitHub Pages**: push the files to a repo, enable Pages in repo settings.
- **Firebase Hosting**: `firebase init hosting`, drop the files in the public folder, `firebase deploy`.

Either way you get HTTPS automatically, which browsers require for screen/camera capture.

Each page shows an **📲 Install App** button on Android/desktop Chrome (fires once the browser decides the site qualifies). **On iPhone, that button never appears** — iOS Safari doesn't support it — so both pages instead show a one-time tip explaining how to install manually (Share → Add to Home Screen).

## 5. How a session works

1. The person needing help opens `monitor.html`, taps **Create New Session**, gets a code, sends it to you once.
2. You open `viewer.html`, enter the code, tap **Connect** — this sends a visible request to their screen.
3. A popup appears on their device; they tap **Accept & Share Screen/Front/Back** (or Decline) — the browser's own permission prompt follows, so nothing starts silently.
4. If you both tick "remember this device," future sessions skip typing the code — but the accept popup still always appears on their end before anything shares.
5. While connected: tap **🎤 Mic** on the viewer to send your voice to them; tap **👆 Point** then move your finger/cursor over the video to highlight something on their local preview (it can't draw over their other apps — no browser page can do that).
6. Either side can end things any time: they tap **Stop** on the banner, or you tap **End** — which also logs the session to your **🕑 Past Sessions** list.
7. If the connection drops (e.g. a network hiccup), both pages show a **🔄 Reconnect** button instead of just freezing.

## Notes on what changed

- **TURN fallback added** — some networks (corporate wifi, strict NAT) block direct peer-to-peer; a free public TURN relay (Open Relay) is now included as backup. Fine for personal use; swap in your own TURN credentials for heavier use.
- **Two-way audio** — their mic rides along with screen/camera share automatically; your mic is opt-in via the 🎤 button.
- **Pointer, not drawing** — a real "draw an arrow on their desktop" tool isn't possible from a browser tab (no web page can paint over the rest of someone's screen); the pointer dot on their local preview is the closest honest equivalent.
- **Session history** is stored in the `history` path, visible to anyone with your database — fine for personal use, but note it's not private to just you unless you add auth.
