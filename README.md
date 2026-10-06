# Level Devil

A no-install, browser-based platform game with 100 progressively harder levels.

## Play locally

Start the Python game server from this folder:

```powershell
python server.py
```

Then visit <http://localhost:8000>.

- Move: `A` / `D` or the arrow keys
- Jump: `Space`, `W`, or `Up`
- Mobile: hold the on-screen left/right arrows to move; tap **JUMP**
- Pause: `P`
- Restart level: `R` or the restart button
- Toggle AI auto-play: click **AI Pilot** or press `I`; press a movement key to take back control
- Choose an unlocked level: click **Levels** beside the game controls

AI Pilot uses the Python hazard planner when the backend is running and falls
back to the browser's built-in hazard-aware pilot otherwise. The pilot remains
active after a trap, retries the level automatically, and broadens its hazard
look-ahead after AI deaths; a trap can still defeat an individual attempt.

Each of the 100 levels has a level-specific variation of its nature palette
and an original procedural melody. Start the music with the **♫** button;
browsers require a tap before audio can play. On phones, use the rotate button
to request landscape orientation (browser and device support may be required).

The game automatically adapts its layout to desktop and mobile screens. On
phones, large multitouch controls appear below the game; on desktop, use the
keyboard. The touch controls also stop AI Pilot when you press a movement
button, so you can take control immediately.

Use the **Size** slider above the game to resize the play screen from 70% to
150%; the selected size is saved in that browser. Use the fullscreen button
for a larger view, then use the exit button or `Escape` to return. On browsers
without native fullscreen support, the game opens in an in-page fullscreen
view instead. When enlarged on a small screen, swipe across the game to pan.

To play on a phone or tablet on the same Wi-Fi as the computer running
`server.py`, open `http://<computer-LAN-IP>:8000` on the device. Find the
computer's IPv4 address with `ipconfig`; allow Python through the computer's
private-network firewall if prompted. For a public link that works outside
your Wi-Fi, deploy the static game with GitHub Pages below; the built-in
browser AI still works there.

Collect gold coins along the route. Coin totals and unlocked levels save in the
browser. Levels introduce new hazards as you progress: floor pits, fake exits,
exposed platform gaps, and crumbling ledges. The game now has a moving,
flower-filled countryside backdrop and an animated trail-going adventurer who
walks into the exit and disappears before the level-clear screen appears.

## Python game backend

`server.py` uses only the Python standard library. It serves the game and adds:

- A hazard-aware `/api/agent/decision` endpoint used by AI Pilot to request
  movement and jump decisions. If the Python server is unavailable, the
  browser falls back to its built-in pilot.
- A persistent SQLite score board at `/api/leaderboard`, showing the best
  coin count and completion time for players using this server.

The Python score board is for this server, not automatically worldwide. To
share scores across the public internet, deploy the Python service and connect
Firebase using the steps below.

## Enable the worldwide leaderboard

The leaderboard records the best score for each anonymous player on each level.
Scores are ranked by coins collected, then by fastest completion. To connect a
Firebase project:

1. Create a Firebase project, add a **Web app**, and create a **Cloud Firestore**
   database.
2. In **Authentication → Sign-in method**, enable **Anonymous** sign-in. Add
   `localhost` and your published game domain to **Authorized domains**.
3. Copy the Web app's `apiKey`, `authDomain`, `projectId`, and `appId` into
   `firebase-config.js`, replacing the `REPLACE_WITH_...` values.
4. Install the Firebase CLI, run `firebase login`, then from this folder publish
   the security rules and leaderboard index with
   `firebase deploy --only firestore --project YOUR_PROJECT_ID`.
5. Serve or deploy the game over HTTPS, then finish a level to see its scores.

Until a Firebase project is configured, the game displays a setup message rather
than presenting sample results as worldwide scores. Firebase Web app config is
public client configuration; never put a service-account key in this project.

## Publish with GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` deploys this folder on
every push to the repository's `main` branch. To publish it:

1. Create a GitHub repository and add the contents of this folder to its root.
2. In the repository, open **Settings → Pages** and select **GitHub Actions** as
   the build and deployment source.
3. Push the files to `main`, or run **Deploy Level Devil to GitHub Pages** from
   the **Actions** tab.

The published address appears on the workflow run and in **Settings → Pages**.
