#!/usr/bin/env python3
"""Mind Monitor OSC -> Chakra Journey WebSocket bridge.
Receives every OSC address on UDP 5000 and forwards address + all arguments to browsers on WS 5001.
Install: python3 -m pip install python-osc websockets
Run: python3 muse-osc-bridge.py
Mind Monitor: OSC host = this computer's LAN IP, port = 5000.
"""
import asyncio, json, threading, time
from pythonosc.dispatcher import Dispatcher
from pythonosc.osc_server import ThreadingOSCUDPServer
import websockets

clients=set(); loop=None

def osc_any(address,*args):
    msg=json.dumps({'type':'osc','t':time.time(),'address':address,'args':list(args)},separators=(',',':'))
    if loop and clients:
        asyncio.run_coroutine_threadsafe(broadcast(msg),loop)

async def broadcast(msg):
    dead=[]
    for ws in tuple(clients):
        try: await ws.send(msg)
        except Exception: dead.append(ws)
    for ws in dead: clients.discard(ws)

async def handler(ws):
    clients.add(ws)
    try:
        await ws.send(json.dumps({'type':'bridge','address':'/bridge/status','args':['connected']}))
        async for _ in ws: pass
    finally: clients.discard(ws)

def osc_thread():
    d=Dispatcher(); d.set_default_handler(osc_any)
    s=ThreadingOSCUDPServer(('0.0.0.0',5000),d)
    print('Mind Monitor OSC listening UDP 0.0.0.0:5000'); s.serve_forever()

async def main():
    global loop; loop=asyncio.get_running_loop()
    threading.Thread(target=osc_thread,daemon=True).start()
    print('Chakra Journey WebSocket listening 0.0.0.0:5001')
    async with websockets.serve(handler,'0.0.0.0',5001): await asyncio.Future()

if __name__=='__main__': asyncio.run(main())
