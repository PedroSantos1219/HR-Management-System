# Hardening checklist

The app itself does the usual things — hashed passwords, CSRF tokens,
session revocation, audit log, 2FA for sensitive admin actions — but
none of that helps if the filesystem is wide open. This page covers
the bits that live outside the application: NTFS permissions, HTTPS
and off-site backups.

Do at least the first one. The rest are useful but optional.

## 1. Lock down the application folder (NTFS) — do this first

The single biggest risk in an in-house deployment isn't the website,
it's the Windows share. If `C:\xampp\htdocs\HR-Management-System` is
reachable from File Explorer by anyone in the HR group, they can:

- Open `config.php` and read the SMTP password and the admin list.
- Copy `rh_manager.sqlite` and walk away with every NIF, IBAN and
  salary in the database.
- Replace `api.php` with a version that logs everyone's password.

None of those need any technical knowledge. Just clicking and copying.

**Fix:**

1. Right-click the project folder → **Properties** → **Sharing** tab.
   If anything is shared, remove the share completely. The application
   is reached through the browser, not through a network drive.
2. Properties → **Security** tab → **Edit**. Keep only:
   - `SYSTEM` (full control)
   - the local `Administrators` group (full control)
   - the user that runs Apache (read + write — usually the same user
     that started XAMPP)
3. Remove `Everyone`, `Authenticated Users`, and any group like
   `Domain Users` or one specific to the HR team if present.
4. Test from a regular user account: open File Explorer, try to
   navigate to `\\<server>\xampp` — it should be refused. Open the
   browser, go to `http://<server-ip>` — it should still work.

If the company uses Active Directory, ask IT to do steps 2–3 from
Group Policy so it doesn't drift.

## 2. Check the .htaccess is actually enforced

XAMPP ships with `AllowOverride All` by default, but some hardened
installs disable it. Quick test from any browser on the network:

```
http://<server-ip>/HR-Management-System/rh_manager.sqlite
http://<server-ip>/HR-Management-System/config.php
```

Both should return **403 Forbidden**. If either downloads the file,
open `C:\xampp\apache\conf\httpd.conf`, find the `<Directory
"C:/xampp/htdocs">` block, and make sure it says `AllowOverride All`.
Restart Apache after the change.

## 3. Off-site backup

The `backups/` folder lives on the same disk as the application. If
the server is hit by ransomware, the daily backups are encrypted along
with the live database. Pick one:

- **OneDrive / Google Drive sync** — point the cloud client at the
  `backups/` folder. The SQLite file is around 700 KB, so the free
  tier is plenty even keeping a year of dailies.
- **A NAS or external disk** with its own scheduled copy.
- **A USB pendrive** you bring home once a week. Low-tech but it works
  and is offline by definition.

Whichever you pick, **occasionally try to restore from it** on another
machine. A backup you've never tested is a wish, not a backup.

## 4. HTTPS on the LAN

By default the office traffic is plain HTTP — passwords typed at login
travel in the clear. Anyone on the same WiFi can see them with a
packet sniffer. Not catastrophic on a wired internal network, but
worth fixing for laptops and phones.

The XAMPP installer already generates a self-signed certificate. To
turn it on:

1. Open `C:\xampp\apache\conf\httpd.conf` and uncomment:
   ```
   Include conf/extra/httpd-ssl.conf
   LoadModule ssl_module modules/mod_ssl.so
   ```
2. Restart Apache and try `https://<server-ip>`. The browser will warn
   about the self-signed cert — accept the exception once and it stops
   asking.
3. Once it works, optionally redirect HTTP to HTTPS by adding to
   `.htaccess`:
   ```
   RewriteEngine On
   RewriteCond %{HTTPS} off
   RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]
   ```

For a stronger cert (no browser warning), use `mkcert` to install a
local CA on every office machine. More setup; only worth it if the
warning page bothers people.

## 5. Lock the app to the office subnet

If this server is ever exposed to the internet by mistake (a forgotten
port forward, a poorly configured VPN), an attacker can hit the login
page. The `.htaccess` ships with a commented-out block ready to enable:

```
<RequireAll>
    Require ip 192.168.1.0/24
    Require ip 127.0.0.1
</RequireAll>
```

Adjust the subnet to match the office network and uncomment it. After
restarting Apache, requests from outside that range return 403.

## What the application already does

For reference, these are handled in code and don't need extra setup:

- Passwords stored as bcrypt hashes (`password_hash`/`password_verify`).
- Sessions are HttpOnly + SameSite Strict, regenerated on login, and
  killed when an admin changes a user's password or role.
- CSRF tokens validated on every state-changing endpoint.
- Login attempts rate-limited at 5 failures per IP every 5 minutes.
- Admin can only reset another user's password after confirming a
  6-digit code sent to the admin's own email.
- Optimistic locking on the main data save — two people editing the
  same record can't silently overwrite each other.
- Daily SQLite backup (cron-style scheduled task, with a fallback that
  runs on the first login of the day if the task fails).
- Every meaningful action goes to an `audit_log` table that
  super-admins can read.
