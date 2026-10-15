#!/usr/bin/env python3
"""Local SMTP capture server for NowBey mail tests.

NowBey's mailer (src/lib/smtp.ts) speaks implicit-TLS SMTP with AUTH LOGIN, the same
conversation Gmail and Brevo use. This server accepts that conversation on localhost and
writes every message it receives to a JSON file, so the test suite can assert that a real
email was composed, addressed and sent -- without emailing a real person.

Run it through tests/run-local.sh (it generates the certificate the app trusts):

    python3 tests/harness/smtp-capture.py --port 4465 --cert /tmp/certs/cert.pem \\
        --key /tmp/certs/key.pem --out /tmp/nowbey-mail

Messages land in <out>/messages.json as a list of:
    {"from": ..., "to": [...], "subject": ..., "text": ..., "html": ..., "receivedAt": ...}
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import socket
import ssl
import sys
import threading
from datetime import datetime, timezone
from email import message_from_string

LOCK = threading.Lock()


def log(*parts: object) -> None:
    print("[smtp-capture]", *parts, file=sys.stderr, flush=True)


def decode_part(raw: str) -> str:
    """base64 body part -> text (NowBey always sends base64 with hard-wrapped lines)."""
    try:
        return base64.b64decode("".join(raw.split())).decode("utf-8", "replace")
    except Exception:  # noqa: BLE001 - a malformed message must not kill the harness
        return raw


def split_message(raw: str) -> tuple[str, str, str]:
    msg = message_from_string(raw)
    subject = str(msg.get("Subject", ""))
    # The subject is RFC 2047 encoded; decode it so tests can match on plain words.
    try:
        from email.header import decode_header, make_header

        subject = str(make_header(decode_header(subject)))
    except Exception:  # noqa: BLE001
        pass

    text, html = "", ""
    if msg.is_multipart():
        for part in msg.walk():
            body = part.get_payload()
            if not isinstance(body, str):
                continue
            kind = part.get_content_type()
            if kind == "text/plain":
                text = decode_part(body)
            elif kind == "text/html":
                html = decode_part(body)
    else:
        body = msg.get_payload()
        if isinstance(body, str):
            text = decode_part(body) if msg.get("Content-Transfer-Encoding") == "base64" else body
    return subject, text, html


def store(out_dir: str, record: dict) -> None:
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, "messages.json")
    with LOCK:
        rows = []
        if os.path.exists(path):
            with open(path, encoding="utf-8") as fh:
                try:
                    rows = json.load(fh)
                except json.JSONDecodeError:
                    rows = []
        rows.append(record)
        # Write the whole file and swap it in: a test reading messages.json must never catch a
        # half-written file, which is exactly what happens when suites run side by side.
        tmp = f"{path}.tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(rows, fh, indent=2)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp, path)


class Session(threading.Thread):
    def __init__(self, conn: ssl.SSLSocket, out_dir: str) -> None:
        super().__init__(daemon=True)
        self.conn = conn
        self.out_dir = out_dir

    def send(self, line: str) -> None:
        self.conn.sendall((line + "\r\n").encode())

    def readline(self) -> str:
        buf = b""
        while not buf.endswith(b"\n"):
            chunk = self.conn.recv(1)
            if not chunk:
                raise ConnectionError("client closed the connection")
            buf += chunk
        return buf.decode("utf-8", "replace").strip()

    def run(self) -> None:  # noqa: C901 - one straight-line protocol conversation
        sender, recipients, data_lines = "", [], []
        in_data = False
        try:
            self.send("220 localhost NowBey test SMTP ready")
            while True:
                line = self.readline()
                upper = line.upper()
                if in_data:
                    if line == ".":
                        in_data = False
                        raw = "\r\n".join(data_lines)
                        subject, text, html = split_message(raw)
                        store(
                            self.out_dir,
                            {
                                "from": sender,
                                "to": recipients,
                                "subject": subject,
                                "text": text,
                                "html": html,
                                "receivedAt": datetime.now(timezone.utc).isoformat(),
                            },
                        )
                        log(f"captured {subject!r} -> {recipients}")
                        sender, recipients, data_lines = "", [], []
                        self.send("250 2.0.0 Ok: queued")
                    else:
                        data_lines.append(line)
                    continue
                if upper.startswith("EHLO") or upper.startswith("HELO"):
                    self.send("250-localhost")
                    self.send("250-AUTH LOGIN PLAIN")
                    self.send("250 8BITMIME")
                elif upper.startswith("AUTH LOGIN"):
                    self.send("334 VXNlcm5hbWU6")  # base64("Username:")
                    self.readline()  # username
                    self.send("334 UGFzc3dvcmQ6")  # base64("Password:")
                    self.readline()  # password
                    self.send("235 2.7.0 Accepted")
                elif upper.startswith("MAIL FROM"):
                    sender = line.split("<", 1)[-1].split(">", 1)[0]
                    self.send("250 2.1.0 Ok")
                elif upper.startswith("RCPT TO"):
                    recipients.append(line.split("<", 1)[-1].split(">", 1)[0])
                    self.send("250 2.1.5 Ok")
                elif upper == "DATA":
                    in_data = True
                    self.send("354 End data with <CR><LF>.<CR><LF>")
                elif upper == "QUIT":
                    self.send("221 2.0.0 Bye")
                    break
                elif upper == "RSET":
                    sender, recipients, data_lines = "", [], []
                    self.send("250 2.0.0 Ok")
                elif upper == "NOOP":
                    self.send("250 2.0.0 Ok")
                else:
                    self.send("250 2.0.0 Ok")
        except Exception as exc:  # noqa: BLE001
            log(f"session ended: {exc}")
        finally:
            try:
                self.conn.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
            self.conn.close()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=4465)
    ap.add_argument("--cert", required=True)
    ap.add_argument("--key", required=True)
    ap.add_argument("--out", default="/tmp/nowbey-mail")
    args = ap.parse_args()

    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(args.cert, args.key)

    os.makedirs(args.out, exist_ok=True)
    with open(os.path.join(args.out, "messages.json"), "w", encoding="utf-8") as fh:
        json.dump([], fh)

    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(("0.0.0.0", args.port))
    sock.listen(16)
    log(f"listening on 0.0.0.0:{args.port}, writing to {args.out}")
    while True:
        raw_conn, addr = sock.accept()
        try:
            Session(context.wrap_socket(raw_conn, server_side=True), args.out).start()
        except ssl.SSLError as exc:
            log(f"TLS handshake failed from {addr}: {exc}")
            raw_conn.close()


if __name__ == "__main__":
    main()
