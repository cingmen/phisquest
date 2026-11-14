import test from 'node:test';
import assert from 'node:assert/strict';

import { renderAbout } from '../js/ui.js';

test('layar Tentang menjelaskan saat server online tidak dikonfigurasi', () => {
  const html = renderAbout();
  assert.match(html, /tidak dikonfigurasi/);
  assert.doesNotMatch(html, /online-nickname/);
});

test('form online menampilkan nickname, opt-in, dan tombol hapus dengan aman', () => {
  const html = renderAbout({
    settings: { nickname: '<img src=x>', online_leaderboard: true },
    config: { base: 'https://api.example/v1' },
    playerId: '8f14e45f-0000-4000-8000-000000000000',
    message: 'Papan dimuat.',
    stats: { total_players: 3, total_sessions: 9, avg_accuracy: 0.8123 },
    board: [
      {
        rank: 1,
        nickname: '<b>sari</b>',
        score: 120,
        accuracy: 1,
        duration_s: 205,
      },
    ],
  });
  assert.match(html, /value="&lt;img src=x&gt;"/);
  assert.match(html, /id="online-optin" type="checkbox" checked/);
  assert.match(html, /data-action="delete-online"/);
  assert.match(html, /3 pemain · 9 sesi · rata-rata akurasi 81%/);
  assert.match(html, /&lt;b&gt;sari&lt;\/b&gt; · 120 XP/);
  assert.doesNotMatch(html, /<b>sari<\/b>/);
});
