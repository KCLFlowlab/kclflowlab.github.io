"""Local administration of the team login for the static website.

The website is static (GitHub Pages), so accounts are fixed data that the admin prepares
locally and publishes as ciphertext:

  site/members/vault.json   PUBLIC. Team content encrypted with a random content key (AES-256-GCM).
                            The content key is wrapped once per member with a key derived from
                            that member's username + password (PBKDF2-SHA256, 600,000 iterations).
                            Usernames appear only as salted SHA-256 identifiers. No plaintext,
                            no passwords, no password hashes.
  private/registry.enc      LOCAL ONLY (git-ignored). The member registry (usernames, roles, salts,
                            derived member keys and the content key), encrypted with the admin's
                            password. Needed to add, remove or change members; keep a backup.
  private/team-content.json LOCAL ONLY (git-ignored). The team-only content, in plain JSON, that
                            `publish` encrypts into the vault.
  private/schedule.xlsx     LOCAL ONLY (git-ignored). Group-meeting rota, first sheet with columns
                            Date, Time, Presenter, Topic, Note. `publish` encrypts it with the content.

Removing a member rotates the content key, so the removed password no longer opens new vaults.
Anyone with a valid username/password can read the whole vault: roles are recorded for future
use but do not split content. Offline guessing of weak passwords is possible against any
published ciphertext: the team content must stay non-sensitive, and longer passwords (12+) are
safer. Six characters is the hard minimum; shorter-than-12 passwords print a warning.

Usage (run from the repository root; prompts for passwords, never takes them as arguments):
  python3 tools/team_admin.py init                 create the admin account and an empty vault
  python3 tools/team_admin.py add NAME [--admin]   add a member (prompts for their password)
  python3 tools/team_admin.py passwd NAME          set a member's password
  python3 tools/team_admin.py role NAME admin|member
  python3 tools/team_admin.py remove NAME          remove a member and rotate the content key
  python3 tools/team_admin.py list                 show members and roles
  python3 tools/team_admin.py publish              re-encrypt the content and schedule into the vault
  python3 tools/team_admin.py example-schedule     write an example private/schedule.xlsx (if none exists)
Afterwards: commit site/members/vault.json and publish the site as usual.
"""
from __future__ import annotations

import argparse
import base64
import getpass
import hashlib
import json
import os
import re
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

ITERATIONS = 600_000
CONTENT_AAD = b'kclflowlab-team-v1'
REGISTRY_AAD = b'kclflowlab-registry-v1'
NAME = re.compile(r'^[a-z0-9][a-z0-9._-]{1,31}$')
DEFAULT_CONTENT = {
    'title': 'Team',
    'items': [
        {'title': 'Welcome', 'note': 'Team-only material will appear here.'}
    ],
}

b64 = lambda data: base64.b64encode(data).decode('ascii')
unb64 = lambda text: base64.b64decode(text.encode('ascii'))


class AdminError(Exception):
    pass


class Paths:
    def __init__(self, root: Path):
        self.root = root
        self.private = root / 'private'
        self.registry = self.private / 'registry.enc'
        self.content = self.private / 'team-content.json'
        self.schedule = self.private / 'schedule.xlsx'
        self.vault = root / 'site' / 'members' / 'vault.json'


def derive(secret: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac('sha256', secret.encode('utf-8'), salt, ITERATIONS, 32)


def member_secret(name: str, password: str) -> str:
    # The username is part of the secret, so equal passwords still give different keys.
    return name.lower() + '\n' + password


def member_id(id_salt: bytes, name: str) -> str:
    return hashlib.sha256(id_salt + name.lower().encode('utf-8')).hexdigest()[:24]


def check_password(password: str) -> None:
    if len(password) < 6:
        raise AdminError('Passwords must have at least 6 characters.')
    if len(password) < 12:
        print('Note: passwords under 12 characters can be guessed offline from the public vault; keep team content non-sensitive.', file=sys.stderr)


def check_name(name: str) -> str:
    name = name.lower()
    if not NAME.match(name):
        raise AdminError('Usernames: 2–32 characters of a–z, 0–9, dot, dash or underscore.')
    return name


# ---------- Local registry (encrypted with the admin password) ----------
def save_registry(paths: Paths, registry: dict, admin_password: str, salt: bytes | None = None) -> None:
    salt = salt or os.urandom(16)
    iv = os.urandom(12)
    data = AESGCM(derive('registry\n' + admin_password, salt)).encrypt(iv, json.dumps(registry).encode('utf-8'), REGISTRY_AAD)
    paths.private.mkdir(parents=True, exist_ok=True)
    tmp = paths.registry.with_suffix('.tmp')
    tmp.write_text(json.dumps({'v': 1, 'salt': b64(salt), 'iv': b64(iv), 'data': b64(data)}))
    os.chmod(tmp, 0o600)
    tmp.replace(paths.registry)


def load_registry(paths: Paths, admin_password: str) -> dict:
    if not paths.registry.exists():
        raise AdminError('No registry yet. Run: python3 tools/team_admin.py init')
    stored = json.loads(paths.registry.read_text())
    try:
        plain = AESGCM(derive('registry\n' + admin_password, unb64(stored['salt']))).decrypt(unb64(stored['iv']), unb64(stored['data']), REGISTRY_AAD)
    except Exception:
        raise AdminError('Wrong admin password.') from None
    return json.loads(plain)


# ---------- Group-meeting schedule (Excel) ----------
SCHEDULE_COLUMNS = ('date', 'time', 'presenter', 'topic', 'note')
EXAMPLE_ROTA = ['Yichen Li', 'Matteo Liguori', 'Vedang Joshi', 'Xingxin Yang', 'Zhan Zhang']


def write_example_schedule(paths: Paths, start: date = date(2026, 11, 25), sessions: int = 12) -> None:
    """An illustrative fortnightly rota (Wednesdays 14:00) in team order; replace with the real sheet."""
    from openpyxl import Workbook
    from openpyxl.styles import Font
    if paths.schedule.exists():
        raise AdminError(f'{paths.schedule} already exists.')
    book = Workbook(); sheet = book.active; sheet.title = 'Schedule'
    sheet.append(['Date', 'Time', 'Presenter', 'Topic', 'Note'])
    for cell in sheet[1]: cell.font = Font(bold=True)
    turn = 0
    for i in range(sessions):
        day = start + timedelta(days=14 * i)
        if day.month == 12 and 20 <= day.day <= 31:
            sheet.append([day, None, None, None, 'Winter break'])
            continue
        sheet.append([day, '14:00', EXAMPLE_ROTA[turn % len(EXAMPLE_ROTA)], 'TBC', None])
        turn += 1
    for row in sheet.iter_rows(min_row=2, max_col=1):
        row[0].number_format = 'yyyy-mm-dd'
    for column, width in zip('ABCDE', (12, 8, 18, 36, 18)):
        sheet.column_dimensions[column].width = width
    paths.private.mkdir(parents=True, exist_ok=True)
    book.save(paths.schedule)


def read_schedule(paths: Paths) -> dict | None:
    if not paths.schedule.exists():
        return None
    from openpyxl import load_workbook
    sheet = load_workbook(paths.schedule, data_only=True, read_only=True).worksheets[0]
    rows = sheet.iter_rows(values_only=True)
    header = [str(h or '').strip().lower() for h in next(rows, [])]
    if 'date' not in header:
        raise AdminError('schedule.xlsx: the first row needs a Date column (and Time, Presenter, Topic, Note).')
    sessions = []
    for row in rows:
        record = dict(zip(header, row))
        when = record.get('date')
        if when in (None, ''):
            continue
        if isinstance(when, datetime): when = when.date()
        if isinstance(when, date): when = when.isoformat()
        else:
            when = str(when).strip()
            try: date.fromisoformat(when)
            except ValueError: raise AdminError(f'schedule.xlsx: unreadable date {when!r} (use YYYY-MM-DD).') from None
        time = record.get('time')
        if hasattr(time, 'strftime'): time = time.strftime('%H:%M')
        sessions.append({'date': when, **{k: str(record[k]).strip() for k in SCHEDULE_COLUMNS[1:] if record.get(k) not in (None, '') and k != 'time'},
                         **({'time': str(time).strip()} if time not in (None, '') else {})})
    sessions.sort(key=lambda s: s['date'])
    return {'cadence': 'fortnightly', 'sessions': sessions}


# ---------- Public vault ----------
def publish(paths: Paths, registry: dict) -> None:
    content = json.loads(paths.content.read_text()) if paths.content.exists() else dict(DEFAULT_CONTENT)
    schedule = read_schedule(paths)
    if schedule is not None:
        content['schedule'] = schedule
    key, id_salt = unb64(registry['content_key']), unb64(registry['id_salt'])
    users = []
    for name, member in sorted(registry['members'].items()):
        iv = os.urandom(12)
        uid = member_id(id_salt, name)
        wrapped = AESGCM(unb64(member['key'])).encrypt(iv, key, uid.encode('ascii'))
        users.append({'id': uid, 'salt': member['salt'], 'iv': b64(iv), 'key': b64(wrapped)})
    iv = os.urandom(12)
    data = AESGCM(key).encrypt(iv, json.dumps(content, ensure_ascii=False).encode('utf-8'), CONTENT_AAD)
    vault = {'v': 1, 'kdf': {'name': 'PBKDF2', 'hash': 'SHA-256', 'iterations': ITERATIONS},
             'idSalt': registry['id_salt'], 'users': users, 'content': {'iv': b64(iv), 'data': b64(data)}}
    paths.vault.parent.mkdir(parents=True, exist_ok=True)
    paths.vault.write_text(json.dumps(vault, indent=1) + '\n')


def set_member(registry: dict, name: str, password: str, role: str) -> None:
    check_password(password)
    salt = os.urandom(16)
    registry['members'][name] = {'role': role, 'salt': b64(salt), 'key': b64(derive(member_secret(name, password), salt))}


# ---------- Commands (pure functions so they can be tested without prompts) ----------
def cmd_init(paths: Paths, admin_name: str, admin_password: str) -> None:
    if paths.registry.exists():
        raise AdminError('A registry already exists; refusing to overwrite it.')
    name = check_name(admin_name)
    registry = {'content_key': b64(AESGCM.generate_key(256)), 'id_salt': b64(os.urandom(16)), 'members': {}}
    set_member(registry, name, admin_password, 'admin')
    if not paths.content.exists():
        paths.private.mkdir(parents=True, exist_ok=True)
        paths.content.write_text(json.dumps(DEFAULT_CONTENT, indent=2, ensure_ascii=False) + '\n')
    save_registry(paths, registry, admin_password)
    publish(paths, registry)


def cmd_add(paths: Paths, admin_password: str, name: str, password: str, admin: bool = False) -> None:
    registry = load_registry(paths, admin_password)
    name = check_name(name)
    if name in registry['members']:
        raise AdminError(f'{name} already exists; use passwd or role.')
    set_member(registry, name, password, 'admin' if admin else 'member')
    save_registry(paths, registry, admin_password)
    publish(paths, registry)


def cmd_passwd(paths: Paths, admin_password: str, name: str, password: str) -> str:
    """Returns the admin password to use from now on (it changes if the admin changes their own)."""
    registry = load_registry(paths, admin_password)
    name = check_name(name)
    if name not in registry['members']:
        raise AdminError(f'No member called {name}.')
    # If the admin changes their own password (the one that opens this registry), re-key the registry too.
    own = registry['members'][name]['role'] == 'admin' and verify_admin(registry, name, admin_password)
    set_member(registry, name, password, registry['members'][name]['role'])
    new_admin = password if own else admin_password
    save_registry(paths, registry, new_admin)
    publish(paths, registry)
    return new_admin


def verify_admin(registry: dict, name: str, password: str) -> bool:
    member = registry['members'][name]
    return b64(derive(member_secret(name, password), unb64(member['salt']))) == member['key']


def cmd_role(paths: Paths, admin_password: str, name: str, role: str) -> None:
    registry = load_registry(paths, admin_password)
    name = check_name(name)
    if role not in ('admin', 'member') or name not in registry['members']:
        raise AdminError('Usage: role NAME admin|member (for an existing member).')
    if role == 'member' and sum(m['role'] == 'admin' for m in registry['members'].values()) == 1 and registry['members'][name]['role'] == 'admin':
        raise AdminError('Keep at least one admin.')
    registry['members'][name]['role'] = role
    save_registry(paths, registry, admin_password)
    publish(paths, registry)


def cmd_remove(paths: Paths, admin_password: str, name: str) -> None:
    registry = load_registry(paths, admin_password)
    name = check_name(name)
    if name not in registry['members']:
        raise AdminError(f'No member called {name}.')
    if registry['members'][name]['role'] == 'admin' and sum(m['role'] == 'admin' for m in registry['members'].values()) == 1:
        raise AdminError('Keep at least one admin.')
    del registry['members'][name]
    registry['content_key'] = b64(AESGCM.generate_key(256))  # Rotate: the removed member's key no longer opens the vault.
    save_registry(paths, registry, admin_password)
    publish(paths, registry)


def cmd_list(paths: Paths, admin_password: str) -> list[tuple[str, str]]:
    registry = load_registry(paths, admin_password)
    return sorted((name, m['role']) for name, m in registry['members'].items())


def cmd_publish(paths: Paths, admin_password: str) -> None:
    publish(paths, load_registry(paths, admin_password))


# ---------- Interactive CLI ----------
def ask_new_password(label: str) -> str:
    first = getpass.getpass(f'{label} (6+ characters, 12+ recommended): ')
    check_password(first)
    if getpass.getpass('Repeat: ') != first:
        raise AdminError('Passwords do not match.')
    return first


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1], help=argparse.SUPPRESS)
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('init')
    add = sub.add_parser('add'); add.add_argument('name'); add.add_argument('--admin', action='store_true')
    sub.add_parser('passwd').add_argument('name')
    role = sub.add_parser('role'); role.add_argument('name'); role.add_argument('role', choices=['admin', 'member'])
    sub.add_parser('remove').add_argument('name')
    sub.add_parser('list'); sub.add_parser('publish'); sub.add_parser('example-schedule')
    args = parser.parse_args(argv)
    paths = Paths(args.root)
    try:
        if args.command == 'example-schedule':
            write_example_schedule(paths)
            print(f'Wrote {paths.schedule.relative_to(paths.root)}. Edit it, then run publish.')
            return 0
        if args.command == 'init':
            name = input('Admin username: ').strip()
            cmd_init(paths, name, ask_new_password('Admin password'))
        else:
            admin_password = getpass.getpass('Admin password: ')
            if args.command == 'add':
                cmd_add(paths, admin_password, args.name, ask_new_password(f'Password for {args.name}'), args.admin)
            elif args.command == 'passwd':
                cmd_passwd(paths, admin_password, args.name, ask_new_password(f'New password for {args.name}'))
            elif args.command == 'role':
                cmd_role(paths, admin_password, args.name, args.role)
            elif args.command == 'remove':
                cmd_remove(paths, admin_password, args.name)
            elif args.command == 'list':
                for name, role_name in cmd_list(paths, admin_password):
                    print(f'{name}\t{role_name}')
                return 0
            elif args.command == 'publish':
                cmd_publish(paths, admin_password)
        print(f'Updated {paths.vault.relative_to(paths.root)}. Commit it and publish the site to apply.')
        return 0
    except AdminError as error:
        print(f'Error: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
