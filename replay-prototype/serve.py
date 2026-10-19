#!/usr/bin/env python3
"""One-command local prototype. No npm install, accounts or API calls at runtime."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--port',type=int,default=8765)
parser.add_argument('--host',default='127.0.0.1',help='Use 0.0.0.0 explicitly for a phone on your trusted LAN')
args=parser.parse_args()
root=Path(__file__).resolve().parent.parent
server=ThreadingHTTPServer((args.host,args.port),partial(SimpleHTTPRequestHandler,directory=str(root)))
print(f'Vantage historical replay: http://{args.host}:{args.port}/replay-prototype/',flush=True)
try:server.serve_forever()
except KeyboardInterrupt:server.server_close()
