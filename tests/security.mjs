import http from 'http'
import { BASE } from './harness.mjs'

// No browser: a browser cannot forge Host or Origin, which is exactly what an
// attacking page would need. These requests stand in for DNS rebinding and
// cross-site WebSocket hijacking.
const url = new URL(BASE)
const lines = []
const ok = (label, pass, extra = '') =>
  lines.push(`${pass ? 'PASS' : 'FAIL'}  ${label}${extra ? '  — ' + extra : ''}`)

const raw = (path, headers, method = 'GET', body) => new Promise(resolve => {
  const req = http.request({ host: url.hostname, port: url.port, path, method, headers })
  req.on('response', r => { r.resume(); resolve(r.statusCode) })
  req.on('upgrade', (r, socket) => { socket.destroy(); resolve(101) })
  req.on('error', e => resolve(e.code))
  req.end(body)
})
const upgrade = h => ({ Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': '13',
                        'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==', 'Sec-WebSocket-Protocol': 'tty', ...h })
const HOST = `${url.hostname}:${url.port}`

ok('the API answers its own host', await raw('/api/config', { Host: HOST }) === 200)
ok('a rebound host is refused (DNS rebinding)', await raw('/api/config', { Host: 'evil.example' }) === 400)
ok('a cross-site write is refused', await raw('/api/prompts', { Host: HOST, Origin: 'https://evil.example',
  'Content-Type': 'application/json' }, 'DELETE') === 403)
ok('close-board refuses a cross-site request', await raw('/api/stop', { Host: HOST, Origin: 'https://evil.example',
  'Content-Type': 'application/json' }, 'POST') === 403)
ok('close-board refuses a session claude-stepboard did not start',
   await raw('/api/stop', { Host: HOST, 'Content-Length': '0' }, 'POST') === 400)
ok('the terminal accepts its own origin', await raw('/api/ws', upgrade({ Host: HOST, Origin: `http://${HOST}` })) === 101)
ok('the terminal refuses a foreign origin', await raw('/api/ws', upgrade({ Host: HOST, Origin: 'https://evil.example' })) !== 101)
ok('the terminal refuses a rebound host', await raw('/api/ws', upgrade({ Host: 'evil.example', Origin: 'http://evil.example' })) !== 101)

console.log('— security —')
console.log(lines.join('\n'))
const passed = lines.filter(l => l.startsWith('PASS')).length
console.log(`SUMMARY: ${passed}/${lines.length} passed`)
if (passed !== lines.length) process.exitCode = 1
