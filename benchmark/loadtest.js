import { io } from 'socket.io-client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

try {
  const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || '').trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch {}

const isRenderArg = process.argv.includes('--render') || process.env.MODE === 'render';
const moreStressIndex = process.argv.indexOf('--more');
const isMoreStressArg =
  !isRenderArg &&
  ((moreStressIndex !== -1 && process.argv[moreStressIndex + 1] === 'stress') ||
  process.argv.includes('--more-stress') ||
  process.env.MODE === 'more-stress' ||
  process.env.MODE === 'more stress');

const RENDER_MODE = Boolean(isRenderArg);
const MORE_STRESS = Boolean(isMoreStressArg);
const STRESS = !RENDER_MODE && !MORE_STRESS && (process.argv.includes('--stress') || process.env.MODE === 'stress');

const RENDER_URL = 'https://watch2gether-socket.onrender.com';
const SERVER_URL = RENDER_MODE
  ? (process.env.RENDER_URL || process.env.NEXT_PUBLIC_SOCKET_URL || RENDER_URL)
  : (process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000');

// Render free/starter proxy limit: capped at 1,000 users (20 rooms x 50 users/room) to fit proxy limits.
// Local / dedicated servers with --more stress test 10,000 users (100 rooms x 100 users/room).
const NUM_ROOMS = RENDER_MODE
  ? (Number(process.env.ROOMS) || 20)
  : (MORE_STRESS ? (Number(process.env.ROOMS) || 100) : 1);

const USERS_PER_ROOM = RENDER_MODE
  ? (Number(process.env.USERS_PER_ROOM) || 50)
  : (MORE_STRESS ? (Number(process.env.USERS_PER_ROOM) || 100) : 100);

const TOTAL_CLIENTS = (RENDER_MODE || MORE_STRESS) ? (NUM_ROOMS * USERS_PER_ROOM) : 100;
const RAMP_UP_MS = RENDER_MODE ? 15000 : (MORE_STRESS ? (Number(process.env.RAMP_UP_MS) || 30000) : 5000);
const DURATION_SEC = 20;
const ACTIVE_CHATTERS = RENDER_MODE
  ? Math.min(TOTAL_CLIENTS, NUM_ROOMS * 2)
  : (MORE_STRESS ? Math.min(TOTAL_CLIENTS, NUM_ROOMS * 2) : (STRESS ? TOTAL_CLIENTS : 10));

const BASE_ROOM_ID = `LOAD_TEST_ROOM_${Math.floor(1000 + Math.random() * 9000)}`;
const roomIds = (RENDER_MODE || MORE_STRESS)
  ? Array.from({ length: NUM_ROOMS }, (_, i) => `${BASE_ROOM_ID}_R${i + 1}`)
  : [BASE_ROOM_ID];
const ROOM_ID = roomIds[0];

const stats = {
  connected: 0,
  connectionFailed: 0,
  messagesSent: 0,
  messagesReceived: 0,
  reactionsSent: 0,
  reactionsReceived: 0,
  errors: 0,
  rtt: [],
};

const clients = [];

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function createClient(index, roomId = ROOM_ID, isHost = false) {
  let isConnectedOnce = false;

  const socket = io(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 3000,
    timeout: 25000,
  });

  socket.roomId = roomId;

  socket.on('connect', () => {
    if (!isConnectedOnce) {
      isConnectedOnce = true;
      stats.connected++;
    }
    socket.emit('join_room', {
      roomId,
      username: `Viewer_${index}`,
      participantId: `load_usr_${index}_${Math.random().toString(36).slice(2, 7)}`,
      isCreating: isHost,
    });
  });

  socket.on('connect_error', (err) => {
    if (!isConnectedOnce) {
      stats.connectionFailed++;
      stats.errors++;
    }
    if (stats.connectionFailed === 1) {
      console.error(`\n[Connection Error] Failed connecting to ${SERVER_URL}: ${err?.message || err}`);
      console.error(`Troubleshooting checklist:`);
      console.error(`1. Make sure the socket server is running (e.g. cd d:\\CodeFiles\\watch2gether-sockets && npm run dev)`);
      console.error(`2. Confirm the server port matches ${SERVER_URL} (or set NEXT_PUBLIC_SOCKET_URL in your .env)\n`);
    }
  });

  socket.on('chat_message', (msg) => {
    stats.messagesReceived++;
    if (!msg?.text?.startsWith('RTT:')) return;

    const sentAt = Number(msg.text.split(':')[1]);
    if (!Number.isNaN(sentAt)) stats.rtt.push(Date.now() - sentAt);
  });

  socket.on('reaction', () => {
    stats.reactionsReceived++;
  });

  clients.push(socket);
}

function sendChatBurst() {
  for (let i = 0; i < ACTIVE_CHATTERS; i++) {
    const socket = clients[i];
    if (!socket?.connected) continue;

    const targetRoom = socket.roomId || ROOM_ID;
    socket.emit('chat_message', {
      roomId: targetRoom,
      text: `RTT:${Date.now()}:${i + 1}`,
    });
    stats.messagesSent++;
  }

  const random = clients[Math.floor(Math.random() * clients.length)];
  if (!random?.connected) return;

  const randomRoom = random.roomId || ROOM_ID;
  random.emit('reaction', { roomId: randomRoom, emoji: '❤️' });
  stats.reactionsSent++;

  random.emit('typing_start', { roomId: randomRoom });
  setTimeout(() => {
    if (random.connected) random.emit('typing_stop', { roomId: randomRoom });
  }, 1000);
}

function printResults() {
  const sorted = [...stats.rtt].sort((a, b) => a - b);
  const avg = average(sorted);

  console.log('\n' + '='.repeat(60));
  console.log('RESULTS');
  console.log('='.repeat(60));

  const resultsTable = {
    'Viewers': { Value: TOTAL_CLIENTS },
    'Connected': { Value: stats.connected },
    'Connection failures': { Value: stats.connectionFailed },
    'Messages sent': { Value: stats.messagesSent },
    'Messages delivered': { Value: stats.messagesReceived },
    'Throughput': { Value: `${(stats.messagesReceived / DURATION_SEC).toFixed(1)} msg/s` },
    'Reactions sent': { Value: stats.reactionsSent },
    'Latency min': { Value: `${sorted[0] ?? 0} ms` },
    'Latency avg': { Value: `${avg.toFixed(1)} ms` },
    'Latency p50': { Value: `${percentile(sorted, 0.5)} ms` },
    'Latency p95': { Value: `${percentile(sorted, 0.95)} ms` },
    'Latency p99': { Value: `${percentile(sorted, 0.99)} ms` },
    'Latency max': { Value: `${sorted[sorted.length - 1] ?? 0} ms` },
    'Errors': { Value: stats.errors },
  };

  if (RENDER_MODE || MORE_STRESS) {
    resultsTable['Total Rooms'] = { Value: NUM_ROOMS };
    resultsTable['Users Per Room'] = { Value: USERS_PER_ROOM };
  }

  console.table(resultsTable);

  if (avg < 50) console.log('Average latency under 50 ms.');
  else if (avg < 150) console.log('Average latency under 150 ms.');
  else console.log('Average latency above 150 ms. The test client itself may be a bottleneck.');
}

console.log(`Server:  ${SERVER_URL}`);
console.log(`Rooms:   ${NUM_ROOMS} rooms (${USERS_PER_ROOM} users/room)`);
console.log(`Mode:    ${RENDER_MODE ? 'render-capped (1000 users max proxy limit)' : MORE_STRESS ? 'more-stress (10000 users)' : STRESS ? 'stress' : 'realistic'} (${ACTIVE_CHATTERS} chatters, ${TOTAL_CLIENTS} viewers)`);
console.log(`Ramp-up: ${RAMP_UP_MS / 1000}s, duration: ${DURATION_SEC}s\n`);

const connectGap = RAMP_UP_MS / TOTAL_CLIENTS;
for (let i = 0; i < TOTAL_CLIENTS; i++) {
  const roomIdx = i % NUM_ROOMS;
  const targetRoom = roomIds[roomIdx];
  const userNumInRoom = Math.floor(i / NUM_ROOMS) + 1;
  const isHost = userNumInRoom === 1;

  setTimeout(() => createClient(i + 1, targetRoom, isHost), i * connectGap);
}

setTimeout(() => {
  console.log(`Connected ${stats.connected}/${TOTAL_CLIENTS}. Starting load.`);

  const chatTimer = setInterval(sendChatBurst, 1000);

  const ticker = setInterval(() => {
    process.stdout.write(
      `\rSent: ${stats.messagesSent} | Received: ${stats.messagesReceived} | Avg latency: ${average(stats.rtt).toFixed(1)} ms `
    );
  }, 1000);

  setTimeout(() => {
    clearInterval(chatTimer);
    clearInterval(ticker);
    printResults();
    clients.forEach((c) => c.disconnect());
    process.exit(0);
  }, DURATION_SEC * 1000);
}, RAMP_UP_MS + 500);
