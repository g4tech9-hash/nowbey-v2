# Confessions site

No installs needed. Requires Node 20+.

```bash
ADMIN_PASSWORD='choose-a-password' WHATSAPP_LINK='https://chat.whatsapp.com/XXXX' node server.mjs
```

- Public page: `http://localhost:3000`
- Admin (you): `http://localhost:3000/admin` (username can be anything, password is `ADMIN_PASSWORD`)

Nothing shows publicly until you press **Approve** in admin. Edit the text there first to remove names or anything unsafe.

Data is stored in `data/confessions.json`. Set `PORT` or `DATA_FILE` to change them.
