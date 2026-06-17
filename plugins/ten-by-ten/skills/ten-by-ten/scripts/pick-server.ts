#!/usr/bin/env -S npx tsx
/**
 * pick-server.ts — the 10x10 grid picker (TypeScript / Node, zero npm deps).
 * Serves an interactive selection grid in the browser, opens it automatically,
 * and the agent is notified when it exits.
 *
 *   npx tsx pick-server.ts <sheet.html> [--port 8777] [--no-open]
 *
 * <sheet.html> must contain the option grid as a sequence of `.wrap` elements (each
 * holding one `.cell`), in order — option 1..N. (See the 10x10 skill for how to build it.)
 *
 * Interaction:
 *   - click a cell        → PRIMARY pick (exactly one; solid cyan mark)
 *   - Shift+click a cell  → SECONDARY pick (many; dashed amber mark — for the keep bank)
 *   - "Confirm" button    → writes the result, shuts the server DOWN, process exits 0
 *
 * On launch it prints:  PICKER_READY http://localhost:<port>   (and opens the browser)
 * On confirm it prints: PICK_RESULT {"primary": N, "secondaries": [...]}
 * and writes the same JSON to  <sheet dir>/pick-result.json
 *
 * Why TypeScript: Node + tsx ship with the rest of the toolchain, so no separate
 * Python runtime is needed. Run via `npx tsx` (tsx transpiles on the fly).
 */
import http from 'node:http';
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, resolve, join, extname } from 'node:path';
import { spawn } from 'node:child_process';

const argv = process.argv.slice(2);
if (argv.length < 1 || argv[0].startsWith('--')) {
  console.error('usage: pick-server.ts <sheet.html> [--port N] [--no-open]');
  process.exit(2);
}
const sheet = argv[0];
const portIdx = argv.indexOf('--port');
const port = portIdx >= 0 ? parseInt(argv[portIdx + 1], 10) : 8777;
const autoOpen = !argv.includes('--no-open');
const D = dirname(resolve(sheet));
const resultfile = join(D, 'pick-result.json');
try { rmSync(resultfile); } catch { /* none */ }

const header = `<div style="position:sticky;top:0;z-index:99;background:#05070a;padding:14px 20px;border-bottom:2px solid #11CFD0;font-family:system-ui,sans-serif;color:#fff;display:flex;gap:18px;align-items:center;justify-content:center;flex-wrap:wrap">
<span style="font-size:17px;font-weight:700">Click = primary &nbsp;·&nbsp; Shift+Click = secondary (keep bank)</span>
<span style="font-size:15px;color:#9fb0bd">Primary: <b id="p" style="color:#11CFD0">—</b> &nbsp;·&nbsp; Secondary: <b id="s" style="color:#E2B23C">—</b></span>
<button id="ok" disabled onclick="confirmPick()" style="background:#B91C1C;color:#fff;border:0;border-radius:8px;padding:9px 22px;font-weight:900;font-family:system-ui,sans-serif;font-size:16px;cursor:pointer;opacity:.5">Confirm</button>
</div>`;

const script = `<style>
.wrap{cursor:pointer}
.wrap .cell{transition:.12s;position:relative}
.wrap:hover .cell{outline:3px solid rgba(17,207,208,.5)}
.wrap.pri .cell{outline:4px solid #11CFD0;box-shadow:0 0 0 5px rgba(17,207,208,.35)}
.wrap.sec .cell{outline:4px dashed #E2B23C}
.badge{position:absolute;top:8px;left:8px;z-index:6;font-family:system-ui,sans-serif;font-weight:900;font-size:12px;padding:3px 10px;border-radius:999px;display:none}
.pri .badge{display:block;background:#11CFD0;color:#062223}.pri .badge::before{content:"\\2605 primary"}
.sec .badge{display:block;background:#E2B23C;color:#1a1205}.sec .badge::before{content:"keep"}
</style>
<script>
let pri=null; const sec=new Set();
const wraps=[...document.querySelectorAll('.wrap')];
wraps.forEach((w,i)=>{const n=i+1; const b=document.createElement('div'); b.className='badge';
  (w.querySelector('.cell')||w).appendChild(b);
  w.addEventListener('click',e=>{ e.preventDefault();
    if(e.shiftKey){ if(pri===n) pri=null; sec.has(n)?sec.delete(n):sec.add(n); }
    else { sec.delete(n); pri=(pri===n?null:n); }
    render(); });
});
function render(){ wraps.forEach((w,i)=>{const n=i+1; w.classList.toggle('pri',pri===n); w.classList.toggle('sec',sec.has(n));});
  document.getElementById('p').textContent = pri?('#'+pri):'—';
  document.getElementById('s').textContent = sec.size?[...sec].sort((a,b)=>a-b).map(x=>'#'+x).join(' '):'—';
  const ok=document.getElementById('ok'); ok.disabled=!pri; ok.style.opacity=pri?1:.5; }
function confirmPick(){ if(!pri) return;
  fetch('/confirm?primary='+pri+'&secondaries='+[...sec].sort((a,b)=>a-b).join(','))
   .then(()=>{document.body.innerHTML='<div style="color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:90px;font-size:30px;font-weight:900">Sent \\u2713<br><span style="font-size:18px;color:#9fb0bd">You can return to the chat</span></div>';}); }
</script>`;

let html = readFileSync(sheet, 'utf8');
html = html.replace('<body>', '<body>' + header).replace('</body>', script + '</body>');
writeFileSync(join(D, 'picker.html'), html, 'utf8');

const MIME: Record<string, string> = {
  '.html': 'text/html', '.htm': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.json': 'application/json', '.mp4': 'video/mp4',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  if (url.pathname.startsWith('/confirm')) {
    const primaryRaw = url.searchParams.get('primary') || '';
    const secsRaw = url.searchParams.get('secondaries') || '';
    const secondaries = secsRaw.split(',').filter((x) => /^\d+$/.test(x)).map(Number);
    const result = { primary: /^\d+$/.test(primaryRaw) ? Number(primaryRaw) : null, secondaries };
    writeFileSync(resultfile, JSON.stringify(result), 'utf8');
    res.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
    res.end('ok');
    setTimeout(() => {
      console.log('PICK_RESULT ' + JSON.stringify(result));
      server.close(() => process.exit(0));
    }, 50);
    return;
  }
  const rel = url.pathname === '/' || url.pathname === '' ? '/picker.html' : url.pathname;
  const filePath = join(D, decodeURIComponent(rel));
  if (!resolve(filePath).startsWith(resolve(D))) { res.writeHead(403); res.end('forbidden'); return; }
  if (!existsSync(filePath)) { res.writeHead(404); res.end('not found'); return; }
  try {
    const data = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(500); res.end('error'); }
});

// Bind to the preferred port; if it's taken, automatically walk up to the next
// free port and report THAT one — never hand back a link to a port we don't own.
function listen(tryPort: number, attemptsLeft: number) {
  const onError = (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      console.error(`port ${tryPort} busy, trying ${tryPort + 1}…`);
      listen(tryPort + 1, attemptsLeft - 1);
    } else {
      console.error('failed to start picker:', err.message);
      process.exit(1);
    }
  };
  server.once('error', onError);
  server.listen(tryPort, '127.0.0.1', () => {
    server.removeListener('error', onError);
    const actual = (server.address() as import('node:net').AddressInfo).port;
    const link = `http://localhost:${actual}`;
    console.log(`PICKER_READY ${link}`);
    if (autoOpen) {
      const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
      try { spawn(cmd, [link], { stdio: 'ignore', detached: true, shell: process.platform === 'win32' }).unref(); } catch { /* headless ok */ }
    }
  });
}
listen(port, 50);
