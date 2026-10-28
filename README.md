# CalSnap

Take a photo of your meal and get calories and macros. An Expo (React Native) app for iPhone and
Android, plus a small Node server that sends the photo to Claude and returns structured nutrition
estimates.

```
app/      Expo app (expo-router): Today screen, scan + review, settings
server/   Hono server: POST /analyze  → Claude vision → JSON
```

## How it works

1. The app takes or picks a photo, shrinks it to 1024 px JPEG, and posts it to the server.
2. The server asks Claude to list each food, estimate the portion, and return calories, protein,
   carbs and fat. The answer comes back as JSON that matches a fixed schema (structured outputs).
3. You review it: rename items, fix numbers, remove items, pick a 0.5×–2× portion, or re-scan with a
   hint like "cooked in butter". Then log it.
4. Meals and goals are stored on the phone (AsyncStorage). Nothing is stored on the server.

The API key lives only on the server, never in the app.

## Run it

You need Node 22+, an [Anthropic API key](https://platform.claude.com), and the **Expo Go** app on
your phone. Your phone and laptop must be on the same Wi-Fi.

```bash
# 1. server
cd server
npm install
cp .env.example .env      # paste your ANTHROPIC_API_KEY
npm run dev               # listens on port 8787

# 2. app (new terminal)
cd app
npm install
npx expo start            # scan the QR code with your iPhone camera (or Expo Go on Android)
```

In development the app assumes the server is on the same machine as the Expo dev server, port 8787.
If that's wrong, change the URL in **Settings**.

## Costs

Each scan is one Claude request with one image. The default model is `claude-opus-5-5`. Set
`CLAUDE_MODEL=claude-haiku-5-5` in `server/.env` to try a much cheaper model and compare accuracy on
your own meals.

## Before you ship

- **Protect the server.** Set `APP_TOKEN` in `server/.env` and the same token in the app's Settings,
  otherwise anyone who finds your URL can spend your API credits. For a real launch you'd want proper
  user accounts and per-user rate limits.
- **Deploy the server over HTTPS** (Render, Railway, Fly.io, a VPS, …). iOS release builds block
  plain `http://` URLs.
- **Build the app** with EAS: `npx eas-cli@latest build --platform ios`. No Mac needed. App Store
  release needs an Apple Developer account ($99/year).
- Estimates from photos are rough. Say so in the app, and don't market it as medical advice.

## Development

```bash
cd server && npm test && npm run typecheck
cd app && npm run typecheck
```

## Ideas for next steps

- Barcode scanning with [Open Food Facts](https://world.openfoodfacts.org/data) for packaged food
- History screen and weekly charts
- Save meal photos as thumbnails
- Streaks and reminders (expo-notifications)
- Sync across devices (Supabase)
