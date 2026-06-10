#!/usr/bin/env python3
"""
pick-server.py — the 10x10 grid picker. Serves an interactive selection grid in the
browser; the agent runs it as a background process and is notified when it exits.

  python3 pick-server.py <sheet.html> [--port 8777]

<sheet.html> must contain the option grid as a sequence of `.wrap` elements (each holding
one `.cell`), in order — option 1..N. (See the 10x10 skill for how to build the sheet.)

Interaction:
  - click a cell        → PRIMARY pick (exactly one; solid cyan mark)
  - Shift+click a cell  → SECONDARY pick (many; dashed amber mark — for the keep bank)
  - "Confirm" button    → writes the result, shuts the server DOWN, process exits 0

On exit the script prints:  PICK_RESULT {"primary": N, "secondaries": [...]}
and writes the same JSON to  <sheet dir>/pick-result.json
"""
import http.server, socketserver, urllib.parse, os, sys, json, threading

if len(sys.argv) < 2:
    print("usage: pick-server.py <sheet.html> [--port N]"); sys.exit(2)
sheet = sys.argv[1]
port = int(sys.argv[sys.argv.index('--port') + 1]) if '--port' in sys.argv else 8777
D = os.path.dirname(os.path.abspath(sheet))
os.chdir(D)
resultfile = os.path.join(D, 'pick-result.json')
try: os.remove(resultfile)
except FileNotFoundError: pass

header = '''<div style="position:sticky;top:0;z-index:99;background:#05070a;padding:14px 20px;border-bottom:2px solid #11CFD0;font-family:system-ui,sans-serif;color:#fff;display:flex;gap:18px;align-items:center;justify-content:center;flex-wrap:wrap">
<span style="font-size:17px;font-weight:700">Click = primary &nbsp;·&nbsp; Shift+Click = secondary (keep bank)</span>
<span style="font-size:15px;color:#9fb0bd">Primary: <b id="p" style="color:#11CFD0">—</b> &nbsp;·&nbsp; Secondary: <b id="s" style="color:#E2B23C">—</b></span>
<button id="ok" disabled onclick="confirmPick()" style="background:#B91C1C;color:#fff;border:0;border-radius:8px;padding:9px 22px;font-weight:900;font-family:system-ui,sans-serif;font-size:16px;cursor:pointer;opacity:.5">Confirm</button>
</div>'''

script = '''<style>
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
</script>'''

html = open(sheet, encoding='utf-8').read()
html = html.replace('<body>', '<body>' + header, 1).replace('</body>', script + '</body>', 1)
open('picker.html', 'w', encoding='utf-8').write(html)

class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        if self.path.startswith('/confirm'):
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            primary = q.get('primary', [''])[0]
            secs = [x for x in q.get('secondaries', [''])[0].split(',') if x.isdigit()]
            res = {'primary': int(primary) if primary.isdigit() else None,
                   'secondaries': [int(x) for x in secs]}
            open(resultfile, 'w', encoding='utf-8').write(json.dumps(res, ensure_ascii=False))
            self.send_response(200); self.send_header('Access-Control-Allow-Origin', '*'); self.end_headers()
            self.wfile.write(b'ok')
            threading.Thread(target=httpd.shutdown, daemon=True).start()
            return
        if self.path in ('/', ''):
            self.path = '/picker.html'
        return super().do_GET()

socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("127.0.0.1", port), H)
print("PICKER_READY http://localhost:%d" % port, flush=True)
httpd.serve_forever()
res = json.load(open(resultfile, encoding='utf-8'))
print("PICK_RESULT " + json.dumps(res, ensure_ascii=False), flush=True)
