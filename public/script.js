const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(`${protocol}//${window.location.host}`);

const chatBox = document.getElementById('chat-box');
const input = document.getElementById('chat-input');
const button = document.getElementById('send-btn');

const clientId = Math.random().toString(36).slice(2);

function formatTime(timestamp) {
  return new Date(timestamp).toISOString();
}

function logChatTiming({event, message, senderId, sentAt, raw}) {
  const now = Date.now();
  const direction = event === 'send' ? '送信' : '受信';
  const senderLabel = senderId === clientId ? '自分' : '相手';

  console.log(`[${direction}] ${formatTime(now)} sender=${senderLabel} message="${message}"`);

  if (event === 'receive' && sentAt != null && senderId !== clientId) {
    const rttMs = now - sentAt;
    const bytes = new TextEncoder().encode(raw).length;
    const speedBps = bytes / (rttMs / 1000);

    console.log(`  >> 送信時刻: ${formatTime(sentAt)} / 受信時刻: ${formatTime(now)}`);
    console.log(`  >> 片道ではなく往復とみなすRTT: ${rttMs} ms`);
    console.log(`  >> データサイズ: ${bytes} bytes`);
    console.log(`  >> 通信速度: ${speedBps.toFixed(2)} B/s (${(speedBps / 1024).toFixed(2)} KB/s)`);
  }
}

ws.onmessage = async (event) => {
  let raw;

  if (typeof event.data === 'string') {
    raw = event.data;
  } else if (event.data instanceof Blob) {
    raw = await event.data.text();
  } else {
    raw = JSON.stringify(event.data);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }

  if (parsed && parsed.type === 'chat') {
    logChatTiming({ event: 'receive', message: parsed.text, senderId: parsed.clientId, sentAt: parsed.sentAt, raw });

    const div = document.createElement('div');
    div.textContent = `${parsed.clientId === clientId ? '(自分)' : '(相手)'} ${parsed.text}`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  } else {
    // 全クライアント向けのシステムメッセージ等
    const div = document.createElement('div');
    div.textContent = raw;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
};

button.addEventListener('click', () => {
  const text = input.value.trim();
  if (text === '') {
    return;
  }

  const sentAt = Date.now();
  const payload = {
    type: 'chat',
    clientId,
    text,
    sentAt,
  };

  const raw = JSON.stringify(payload);
  ws.send(raw);
  input.value = '';

  logChatTiming({ event: 'send', message: text, senderId: clientId, sentAt, raw });
});
