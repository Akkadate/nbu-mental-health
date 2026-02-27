#!/usr/bin/env python3
"""
LINE Admin Utility — NBU Mental Health Platform
ใช้สำหรับ admin tasks บน server โดยตรง ไม่ต้องผ่าน Node.js API

Usage:
  python3 scripts/line-admin.py <command> [args...]

Commands:
  menu list                          — แสดง rich menu ทั้งหมด
  menu create <json-file>            — สร้าง rich menu จาก JSON file
  menu delete <richMenuId>           — ลบ rich menu
  menu copy-image <from-id> <to-id>  — copy image ระหว่าง menu
  menu assign <userId> <richMenuId>  — ผูก menu ให้ user
  menu set-default <richMenuId>      — ตั้งเป็น default menu (ทุก user)
  menu unset-default                 — ลบ default menu
  menu fix-verified                  — สร้าง Verified Menu ใหม่ที่ถูกต้อง (action=resources)

  user profile <userId>              — ดู profile ของ user
  user assign-verified <userId>      — ผูก Verified Menu ให้ user
  user assign-guest <userId>         — ผูก Guest Menu ให้ user

  push <userId> <message>            — ส่ง push message ทดสอบ

  env                                — แสดงค่า LINE env vars ที่โหลดได้
"""

import sys
import json
import urllib.request
import urllib.error
import os

# ─── Load .env ────────────────────────────────────────────────────────────────

def load_env(path: str = None) -> dict:
    candidates = [
        path,
        os.path.join(os.getcwd(), '.env'),
        os.path.join(os.path.dirname(__file__), '..', '.env'),
    ]
    for p in candidates:
        if p and os.path.exists(p):
            env = {}
            for line in open(p):
                line = line.strip()
                if '=' in line and not line.startswith('#'):
                    k, v = line.split('=', 1)
                    env[k.strip()] = v.strip()
            return env
    raise FileNotFoundError("ไม่พบ .env file")

ENV = load_env()
TOKEN = ENV.get('LINE_CHANNEL_ACCESS_TOKEN', '')
if not TOKEN:
    print("ERROR: LINE_CHANNEL_ACCESS_TOKEN ไม่พบใน .env")
    sys.exit(1)

# ─── HTTP helpers ─────────────────────────────────────────────────────────────

LINE_API = 'https://api.line.me'
LINE_DATA_API = 'https://api-data.line.me'

def api_call(method: str, path: str, body=None, base=LINE_API) -> dict:
    url = base + path
    data = json.dumps(body).encode() if body else None
    headers = {'Authorization': f'Bearer {TOKEN}'}
    if data:
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req) as r:
            text = r.read()
            return json.loads(text) if text else {}
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"HTTP {e.code}: {err}")
        sys.exit(1)

def upload_image(menu_id: str, image_bytes: bytes, content_type: str = 'image/png'):
    url = f'{LINE_DATA_API}/v2/bot/richmenu/{menu_id}/content'
    req = urllib.request.Request(url, data=image_bytes, method='POST',
        headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': content_type})
    with urllib.request.urlopen(req) as r:
        return r.status

def download_image(menu_id: str) -> tuple[bytes, str]:
    url = f'{LINE_DATA_API}/v2/bot/richmenu/{menu_id}/content'
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {TOKEN}'})
    with urllib.request.urlopen(req) as r:
        return r.read(), r.headers.get('Content-Type', 'image/png')

# ─── Commands ─────────────────────────────────────────────────────────────────

def cmd_menu_list():
    result = api_call('GET', '/v2/bot/richmenu/list')
    menus = result.get('richmenus', [])
    if not menus:
        print("(ไม่มี rich menu)")
        return
    for m in menus:
        print(f"\n{'─'*60}")
        print(f"  ID   : {m['richMenuId']}")
        print(f"  Name : {m['name']}")
        print(f"  Size : {m['size']['width']}×{m['size']['height']}")
        print(f"  Areas: {len(m['areas'])} buttons")
        for i, area in enumerate(m['areas']):
            a = area['action']
            if a['type'] == 'uri':
                print(f"    [{i+1}] URI → {a.get('uri','')}")
            elif a['type'] == 'postback':
                print(f"    [{i+1}] Postback → {a.get('data','')}  (text: {a.get('text',a.get('label',''))})")

def cmd_menu_delete(menu_id: str):
    api_call('DELETE', f'/v2/bot/richmenu/{menu_id}')
    print(f"Deleted: {menu_id}")

def cmd_menu_assign(user_id: str, menu_id: str):
    api_call('POST', f'/v2/bot/user/{user_id}/richmenu/{menu_id}')
    print(f"Assigned {menu_id} → {user_id}")

def cmd_menu_set_default(menu_id: str):
    api_call('POST', f'/v2/bot/user/all/richmenu/{menu_id}')
    print(f"Set default: {menu_id}")

def cmd_menu_unset_default():
    api_call('DELETE', '/v2/bot/user/all/richmenu')
    print("Default menu removed")

def cmd_menu_copy_image(from_id: str, to_id: str):
    print(f"Downloading image from {from_id}...")
    img, ctype = download_image(from_id)
    print(f"  {len(img)} bytes  ({ctype})")
    print(f"Uploading to {to_id}...")
    status = upload_image(to_id, img, ctype)
    print(f"  Upload status: {status}")

def cmd_menu_create(json_file: str):
    with open(json_file) as f:
        body = json.load(f)
    result = api_call('POST', '/v2/bot/richmenu', body)
    print(f"Created: {result['richMenuId']}")
    return result['richMenuId']

def cmd_menu_fix_verified():
    """สร้าง Verified Menu ใหม่ที่ถูกต้อง แล้ว copy image จากอันเก่า"""
    old_id = ENV.get('RICH_MENU_VERIFIED_ID', '')
    if not old_id:
        print("ERROR: RICH_MENU_VERIFIED_ID ไม่พบใน .env")
        sys.exit(1)

    liff_screening = ENV.get('LIFF_SCREENING_ID', '')
    screening_uri = f'https://liff.line.me/{liff_screening}' if liff_screening else 'https://liff.line.me/LIFF_SCREENING_ID'

    new_menu = {
        "size": {"width": 2500, "height": 843},
        "selected": True,
        "name": "Verified Menu",
        "chatBarText": "Menu",
        "areas": [
            {"bounds": {"x": 0,    "y": 0,   "width": 625, "height": 843},
             "action": {"type": "uri",      "label": "ประเมินตนเอง",   "uri":  screening_uri}},
            {"bounds": {"x": 625,  "y": 0,   "width": 625, "height": 843},
             "action": {"type": "postback", "label": "นัดหมาย",        "data": "action=booking_gate"}},
            {"bounds": {"x": 1250, "y": 0,   "width": 625, "height": 843},
             "action": {"type": "postback", "label": "แหล่งช่วยเหลือ", "data": "action=resources"}},
            {"bounds": {"x": 1875, "y": 0,   "width": 625, "height": 843},
             "action": {"type": "uri",      "label": "ฉุกเฉิน",        "uri":  "tel:1323"}}
        ]
    }

    result = api_call('POST', '/v2/bot/richmenu', new_menu)
    new_id = result['richMenuId']
    print(f"New menu created: {new_id}")

    if old_id and old_id != new_id:
        print("Copying image from old menu...")
        try:
            img, ctype = download_image(old_id)
            upload_image(new_id, img, ctype)
            print(f"  Image copied ({len(img)} bytes)")
        except Exception as e:
            print(f"  WARNING: Could not copy image: {e}")
            print("  Upload image manually: python3 scripts/line-admin.py menu copy-image <old-id> <new-id>")

    print(f"\nอัปเดต .env:\n  RICH_MENU_VERIFIED_ID={new_id}")
    print(f"\nจากนั้น: pm2 restart 16")

def cmd_user_profile(user_id: str):
    result = api_call('GET', f'/v2/bot/profile/{user_id}')
    print(json.dumps(result, ensure_ascii=False, indent=2))

def cmd_user_assign_verified(user_id: str):
    menu_id = ENV.get('RICH_MENU_VERIFIED_ID', '')
    if not menu_id:
        print("ERROR: RICH_MENU_VERIFIED_ID ไม่พบใน .env")
        sys.exit(1)
    cmd_menu_assign(user_id, menu_id)

def cmd_user_assign_guest(user_id: str):
    menu_id = ENV.get('RICH_MENU_GUEST_ID', '')
    if not menu_id:
        print("ERROR: RICH_MENU_GUEST_ID ไม่พบใน .env")
        sys.exit(1)
    cmd_menu_assign(user_id, menu_id)

def cmd_push(user_id: str, message: str):
    body = {"to": user_id, "messages": [{"type": "text", "text": message}]}
    api_call('POST', '/v2/bot/message/push', body)
    print(f"Sent to {user_id}: {message}")

def cmd_env():
    keys = ['LINE_CHANNEL_ACCESS_TOKEN', 'RICH_MENU_GUEST_ID', 'RICH_MENU_VERIFIED_ID',
            'LIFF_VERIFY_ID', 'LIFF_SCREENING_ID', 'LIFF_BOOKING_ID']
    for k in keys:
        v = ENV.get(k, '(not set)')
        if 'TOKEN' in k and len(v) > 20:
            v = v[:20] + '...'
        print(f"  {k} = {v}")

# ─── Router ───────────────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(0)

    cmd = ' '.join(args[:2]).lower()

    if cmd == 'menu list':
        cmd_menu_list()
    elif cmd == 'menu delete' and len(args) >= 3:
        cmd_menu_delete(args[2])
    elif cmd == 'menu assign' and len(args) >= 4:
        cmd_menu_assign(args[2], args[3])
    elif cmd == 'menu set-default' and len(args) >= 3:
        cmd_menu_set_default(args[2])
    elif cmd == 'menu unset-default':
        cmd_menu_unset_default()
    elif cmd == 'menu copy-image' and len(args) >= 4:
        cmd_menu_copy_image(args[2], args[3])
    elif cmd == 'menu create' and len(args) >= 3:
        cmd_menu_create(args[2])
    elif cmd == 'menu fix-verified':
        cmd_menu_fix_verified()
    elif cmd == 'user profile' and len(args) >= 3:
        cmd_user_profile(args[2])
    elif cmd == 'user assign-verified' and len(args) >= 3:
        cmd_user_assign_verified(args[2])
    elif cmd == 'user assign-guest' and len(args) >= 3:
        cmd_user_assign_guest(args[2])
    elif args[0] == 'push' and len(args) >= 3:
        cmd_push(args[1], ' '.join(args[2:]))
    elif args[0] == 'env':
        cmd_env()
    else:
        print(f"ไม่รู้จัก command: {' '.join(args)}")
        print(__doc__)
        sys.exit(1)

if __name__ == '__main__':
    main()
