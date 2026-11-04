import { io } from 'socket.io-client';

const STRESS = process.argv.includes('--stress') || process.env.MODE === 'stress';
const SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
const ROOM_ID = `LOAD_TEST_ROOM_${Math.floor(1000 + Math.random() * 9000)}`;

const TOTAL_CLIENTS = 100;
const RAMP_UP_MS = 5000;
const DURATION_SEC = 20;
const ACTIVE_CHATTERS = STRESS ? TOTAL_CLIENTS : 10;

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

function createClient(index) {
  const socket = io(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
    timeout: 8000,
  });

  socket.on('connect', () => {
    stats.connected++;
    socket.emit('join_room', {
      roomId: ROOM_ID,
      username: `Viewer_${index}`,
      participantId: `load_usr_${index}_${Math.random().toString(36).slice(2, 7)}`,
    });
  });

  socket.on('connect_error', () => {
    stats.connectionFailed++;
    stats.errors++;
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

    socket.emit('chat_message', {
      roomId: ROOM_ID,
      text: `RTT:${Date.now()}:${i + 1}`,
    });
    stats.messagesSent++;
  }

  const random = clients[Math.floor(Math.random() * clients.length)];
  if (!random?.connected) return;

  random.emit('reaction', { roomId: ROOM_ID, emoji: '❤️' });
  stats.reactionsSent++;

  random.emit('typing_start', { roomId: ROOM_ID });
  setTimeout(() => {
    if (random.connected) random.emit('typing_stop', { roomId: ROOM_ID });
  }, 1000);
}

function printResults() {
  const sorted = [...stats.rtt].sort((a, b) => a - b);
  const avg = average(sorted);

  console.log('\n' + '='.repeat(60));
  console.log('RESULTS');
  console.log('='.repeat(60));

  console.table({
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
  });

  if (avg < 50) console.log('Average latency under 50 ms.');
  else if (avg < 150) console.log('Average latency under 150 ms.');
  else console.log('Average latency above 150 ms. The test client itself may be a bottleneck.');
}

console.log(`Server:  ${SERVER_URL}`);
console.log(`Room:    ${ROOM_ID}`);
console.log(`Mode:    ${STRESS ? 'stress' : 'realistic'} (${ACTIVE_CHATTERS} chatters, ${TOTAL_CLIENTS} viewers)`);
console.log(`Ramp-up: ${RAMP_UP_MS / 1000}s, duration: ${DURATION_SEC}s\n`);

const connectGap = RAMP_UP_MS / TOTAL_CLIENTS;
for (let i = 0; i < TOTAL_CLIENTS; i++) {
  setTimeout(() => createClient(i + 1), i * connectGap);
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