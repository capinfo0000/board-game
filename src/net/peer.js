// PeerJS（WebRTC・P2P）のラッパー。サーバー不要で、公開ブローカー経由で端末同士をつなぐ。
import { Peer } from 'peerjs';

const PREFIX = 'noi-room-v1-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 紛らわしい文字を除外
const CODE_LEN = 4;

export function randomCode() {
  let s = '';
  for (let i = 0; i < CODE_LEN; i += 1) {
    s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return s;
}

// ホスト：ルームコードを発行し、参加者の接続を待つ
export function createHost({ onConnection, onData, onClose, onReady, onError }) {
  let code;
  let peer;

  function attempt(tries) {
    code = randomCode();
    peer = new Peer(PREFIX + code, { debug: 1 });

    peer.on('open', () => onReady && onReady(code));
    peer.on('connection', (conn) => {
      conn.on('open', () => onConnection && onConnection(conn));
      conn.on('data', (d) => onData && onData(conn, d));
      conn.on('close', () => onClose && onClose(conn));
      conn.on('error', () => onClose && onClose(conn));
    });
    peer.on('error', (err) => {
      if (err.type === 'unavailable-id' && tries < 8) {
        try {
          peer.destroy();
        } catch (e) {
          /* noop */
        }
        attempt(tries + 1);
      } else if (onError) {
        onError(err);
      }
    });
  }
  attempt(0);

  return {
    getCode: () => code,
    destroy: () => {
      try {
        peer && peer.destroy();
      } catch (e) {
        /* noop */
      }
    },
  };
}

// 参加者：ルームコードでホストへ接続
export function joinRoom(code, { onOpen, onData, onClose, onError }) {
  const peer = new Peer({ debug: 1 });
  let conn;

  peer.on('open', () => {
    conn = peer.connect(PREFIX + code.toUpperCase(), { reliable: true });
    conn.on('open', () => onOpen && onOpen(conn));
    conn.on('data', (d) => onData && onData(d));
    conn.on('close', () => onClose && onClose());
    conn.on('error', (e) => onError && onError(e));
  });
  peer.on('error', (err) => onError && onError(err));

  return {
    send: (msg) => {
      try {
        conn && conn.open && conn.send(msg);
      } catch (e) {
        /* noop */
      }
    },
    destroy: () => {
      try {
        peer.destroy();
      } catch (e) {
        /* noop */
      }
    },
  };
}
