import { firebaseConfig } from './firebase-config.js';

const panel = document.querySelector('#leaderboardPanel');
const title = document.querySelector('#leaderboardTitle');
const scoreBadge = document.querySelector('#leaderboardScore');
const status = document.querySelector('#leaderboardStatus');
const list = document.querySelector('#leaderboardList');
let servicesPromise;

function showPanel(level, score) {
  title.textContent = `Level ${String(level).padStart(2, '0')}`;
  scoreBadge.textContent = `${score} ${score === 1 ? 'coin' : 'coins'}`;
  list.replaceChildren();
  panel.hidden = false;
}

function formatTime(milliseconds) {
  return `${(milliseconds / 1000).toFixed(1)}s`;
}

async function getFirebaseServices() {
  if (!servicesPromise) {
    servicesPromise = (async () => {
      const [appSdk, authSdk, firestoreSdk] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js'),
      ]);
      const app = appSdk.initializeApp(firebaseConfig);
      const auth = authSdk.getAuth(app);
      const credential = auth.currentUser
        ? { user: auth.currentUser }
        : await authSdk.signInAnonymously(auth);
      return {
        db: firestoreSdk.getFirestore(app),
        user: credential.user,
        firestore: firestoreSdk,
      };
    })();
  }
  return servicesPromise;
}

function isConfigured() {
  return Object.values(firebaseConfig).every((value) =>
    typeof value === 'string' && value.length > 0 && !value.startsWith('REPLACE_WITH_')
  );
}

function appendLeaderboardRows(records, userId) {
  if (records.length === 0) {
    status.textContent = 'You’re the first runner on this level’s board.';
    return;
  }

  status.textContent = 'Ranked by coins collected, then fastest time.';
  records
    .sort((a, b) => b.score - a.score || a.durationMs - b.durationMs)
    .forEach((record, index) => {
      const item = document.createElement('li');
      item.className = record.uid === userId ? 'is-you' : '';

      const rank = document.createElement('span');
      rank.className = 'leaderboard-rank';
      rank.textContent = String(index + 1).padStart(2, '0');

      const player = document.createElement('span');
      player.className = 'leaderboard-player';
      player.textContent = record.name;
      if ((record.uid ?? record.player_id) === userId) player.textContent += ' (you)';

      const result = document.createElement('span');
      result.className = 'leaderboard-result';
      result.textContent = `${record.score} coins · ${formatTime(record.durationMs ?? record.duration_ms)}`;

      item.append(rank, player, result);
      list.append(item);
    });
}

function getLocalPlayerId() {
  const key = 'level-devil-player-id';
  let playerId = localStorage.getItem(key);
  if (!playerId) {
    playerId = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replaceAll('-', '')
      : Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(key, playerId);
  }
  return playerId;
}

async function submitToPythonLeaderboard({ level, score, durationMs }) {
  const playerId = getLocalPlayerId();
  const submission = await fetch('/api/leaderboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      level,
      score,
      duration_ms: durationMs,
      player_id: playerId,
    }),
  });
  if (submission.status === 404 || submission.status === 501) return false;
  if (!submission.ok) throw new Error(`Python leaderboard returned HTTP ${submission.status}.`);

  const response = await fetch(`/api/leaderboard?level=${encodeURIComponent(level)}`);
  if (!response.ok) throw new Error(`Could not load server scores (HTTP ${response.status}).`);
  const result = await response.json();
  document.querySelector('#leaderboardScope').textContent = 'THIS SERVER · TOP SCORES';
  title.textContent = `Level ${String(level).padStart(2, '0')} · SERVER TOP SCORES`;
  appendLeaderboardRows(result.scores, playerId);
  return true;
}

async function submitAndShowLeaderboard({ level, score, durationMs }) {
  showPanel(level, score);
  document.querySelector('#leaderboardScope').textContent = 'WORLDWIDE TOP SCORES';
  if (!isConfigured()) {
    try {
      const savedOnServer = await submitToPythonLeaderboard({ level, score, durationMs });
      if (savedOnServer) return;
      status.textContent = 'Start server.py for server scores, or connect Firebase for a worldwide leaderboard.';
    } catch (error) {
      console.error('Could not submit to the Python server leaderboard.', error);
      status.textContent = 'Could not save server scores. Check the Python server and try again.';
    }
    return;
  }

  status.textContent = 'Connecting to the worldwide leaderboard…';
  try {
    const { db, user, firestore } = await getFirebaseServices();
    const scoreCollection = firestore.collection(db, 'levels', String(level), 'scores');
    const ownScore = firestore.doc(scoreCollection, user.uid);
    const previous = await firestore.getDoc(ownScore);
    const oldResult = previous.exists() ? previous.data() : null;
    const isBetter = !oldResult
      || score > oldResult.score
      || (score === oldResult.score && durationMs < oldResult.durationMs);

    if (isBetter) {
      await firestore.setDoc(ownScore, {
        uid: user.uid,
        name: `Runner-${user.uid.slice(0, 4).toUpperCase()}`,
        level,
        score,
        durationMs,
        updatedAt: firestore.serverTimestamp(),
      });
    }

    const topScores = await firestore.getDocs(
      firestore.query(
        scoreCollection,
        firestore.orderBy('score', 'desc'),
        firestore.orderBy('durationMs', 'asc'),
        firestore.limit(10),
      ),
    );
    const records = topScores.docs.map((entry) => entry.data());
    appendLeaderboardRows(records, user.uid);
    if (!isBetter) {
      status.textContent = 'Ranked by coins collected, then fastest time. Your best is already saved.';
    }
  } catch (error) {
    console.error('Could not load the Level Devil worldwide leaderboard.', error);
    status.textContent = 'Could not connect to scores. Check Firebase setup and your connection.';
  }
}

window.addEventListener('leveldevil:levelcompleted', (event) => {
  submitAndShowLeaderboard(event.detail);
});
