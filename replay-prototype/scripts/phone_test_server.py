#!/usr/bin/env python3
"""Opt-in, token-gated local/LAN phone-test server. No public tunnel or deployment.
python3 replay-prototype/scripts/phone_test_server.py [--host 0.0.0.0] [--port 8766]
"""
from functools import partial
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, parse_qs, unquote
from datetime import datetime, timezone
import argparse, json, secrets, hmac, threading

ROOT=Path(__file__).resolve().parents[2]
REPORTS=ROOT/'shots/phone-tests';REPORTS.mkdir(parents=True,exist_ok=True)
TOKEN=secrets.token_urlsafe(24);LOCK=threading.Lock();saved_count=0
RUNTIME={'index.html','app.js','replay.mjs','style.css','favicon.svg','phone-diagnostics.js','frame-stats.mjs'}
DATA={'playback.json','track.json','suzuka-world.glb','SOURCES.md'}
ASSETS={'ibm-plex-mono-400.ttf','ibmplexmono-OFL.txt','CIRCUIT-LICENSE.txt'}

def allowed(path):
 try:relative=(ROOT/path.lstrip('/')).resolve().relative_to(ROOT)
 except (ValueError,OSError):return False
 parts=relative.parts
 if len(parts)==2 and parts[0]=='assets':return parts[1] in ASSETS
 if len(parts)==2 and parts[0]=='replay-prototype':return parts[1] in RUNTIME
 if len(parts)==3 and parts[:2]==('replay-prototype','data'):return parts[2] in DATA
 if len(parts)==3 and parts[:2]==('replay-prototype','vendor'):return parts[2] in {'three.module.js','three.core.js','GLTFLoader.js','OrbitControls.js','BufferGeometryUtils.js','THREE-LICENSE.txt'}
 return False

def matches(value):return hmac.compare_digest(value.encode('utf-8'),TOKEN.encode('utf-8'))

class Handler(SimpleHTTPRequestHandler):
 def authorized(self):
  cookie=SimpleCookie()
  try:cookie.load(self.headers.get('Cookie',''))
  except Exception:return False
  return 'vantage_test' in cookie and matches(cookie['vantage_test'].value)
 def end_headers(self):
  self.send_header('X-Content-Type-Options','nosniff');self.send_header('Referrer-Policy','same-origin')
  if getattr(self,'grant',False):self.send_header('Set-Cookie',f'vantage_test={TOKEN}; HttpOnly; SameSite=Strict; Path=/')
  if self.path.split('?')[0].endswith(('.js','.mjs','.html')):self.send_header('Cache-Control','no-store')
  super().end_headers()
 def do_GET(self):
  query=parse_qs(urlsplit(self.path).query);self.grant=matches(query.get('testToken',[''])[0])
  if not (self.grant or self.authorized()):return self.send_error(403,'Use the private test URL printed by the server.')
  path=unquote(urlsplit(self.path).path)
  if path=='/replay-prototype/':self.path='/replay-prototype/index.html'+('?' + urlsplit(self.path).query if query else '')
  if not allowed(unquote(urlsplit(self.path).path)):return self.send_error(404)
  super().do_GET()
 def do_HEAD(self):
  self.grant=False
  if not self.authorized() or not allowed(unquote(urlsplit(self.path).path)):return self.send_error(403)
  super().do_HEAD()
 def do_POST(self):
  global saved_count
  self.grant=False
  if urlsplit(self.path).path!='/replay-prototype/__test-report':return self.send_error(404)
  if not self.authorized() or not matches(self.headers.get('X-Phone-Test-Token','')):return self.send_error(403)
  if self.headers.get('Origin')!=f'http://{self.headers.get("Host")}':return self.send_error(403,'Same-origin reports only')
  try:
   length=int(self.headers.get('Content-Length','0'))
   if not 0<length<=65536:return self.send_error(413)
   report=json.loads(self.rfile.read(length))
   if not isinstance(report,dict) or report.get('schemaVersion')!=1 or not isinstance(report.get('samples'),list):return self.send_error(400)
  except (ValueError,UnicodeError):return self.send_error(400)
  with LOCK:
   if saved_count>=100:return self.send_error(429,'Session report limit reached')
   name='phone-test-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+secrets.token_hex(3)+'.json'
   (REPORTS/name).write_text(json.dumps(report,indent=2,allow_nan=False));saved_count+=1
  body=json.dumps({'file':name}).encode();self.send_response(201);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
 def log_message(self,format,*args):
  # Don't echo the capability token from request URLs into server logs.
  clean=tuple(str(arg).split('?')[0] if 'testToken=' in str(arg) else arg for arg in args)
  super().log_message(format,*clean)

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--host',default='127.0.0.1');parser.add_argument('--port',type=int,default=8766);args=parser.parse_args()
 server=ThreadingHTTPServer((args.host,args.port),partial(Handler,directory=str(ROOT)))
 print(f'Private test URL: http://{args.host}:{args.port}/replay-prototype/?diagnostics=1&testToken={TOKEN}',flush=True)
 print('Loopback by default; --host 0.0.0.0 is trusted-LAN only. Replace that host with this computer’s LAN IP. Do not expose publicly.',flush=True)
 try:server.serve_forever()
 except KeyboardInterrupt:server.server_close()
