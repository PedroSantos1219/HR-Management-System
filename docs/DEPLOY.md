# Office LAN Deployment

How to expose the app to the rest of the office from a single XAMPP
machine. This is the setup currently used in production. No reverse
proxy, no Docker, no cloud — one Windows PC running Apache, with the
other workstations reaching it over the local network.

## 1. Pick the server machine

Any reasonably reliable Windows PC works. It will need to be on
whenever someone wants to use the app. Pick the one nobody reboots by
accident.

Install XAMPP (PHP 8.1+) and clone the project into `htdocs`:

```
git clone https://github.com/PedroSantos1219/HR-Management-System.git "C:\xampp\htdocs\HR-Management-System"
```

Open the folder in the browser at `http://localhost/HR-Management-System`
to confirm the app boots up locally first. Fix anything that breaks
before moving on.

## 2. Give the server a stable IP

If the server pulls a new IP every few days the bookmarks the colleagues
saved will break. Two options:

- **DHCP reservation (preferred)**: on the router, tie the server's MAC
  address to a fixed IP from the local range (e.g. `192.168.1.40`).
  Anyone connecting from the office gets a stable address to bookmark.
- **Static IP on the PC itself**: less clean — if the PC is moved to
  another network it loses connectivity. Only use as a fallback if you
  cannot touch the router.

Find the server's current IP with `ipconfig` in PowerShell and look for
the IPv4 of the active adapter.

## 3. Configure `config.php`

Edit `config.php` so the email links point at the LAN address (the
backend also auto-detects the request host, so this is mainly a safety
net for scripts that run outside a browser, like `backup_cron.php`):

```php
'app' => [
    'url' => 'http://192.168.1.40',
],
```

## 4. Apache: listen on the LAN, not just localhost

By default modern XAMPP already listens on `0.0.0.0:80`. Confirm it in
`C:\xampp\apache\conf\httpd.conf`:

```
Listen 80
```

Not `Listen 127.0.0.1:80` — that would limit it to the server itself.

Restart Apache from the XAMPP Control Panel after any change.

## 5. Open port 80 on the Windows firewall

Windows blocks inbound traffic by default. From `wf.msc` (Windows
Defender Firewall with Advanced Security):

1. Inbound Rules → New Rule
2. Rule Type: **Port**
3. Protocol: **TCP**, Specific local ports: **80**
4. Action: **Allow the connection**
5. Profile: tick **Domain** and **Private** (leave **Public** off — you
   do not want this open on coffee-shop wifi)
6. Name: something obvious like `XAMPP Apache (HR Management)`

## 6. Test from another machine

From any other PC, phone or tablet on the same network:

```
http://192.168.1.40/HR-Management-System
```

If the page loads, you are done. If it hangs, ping the server first
(`ping 192.168.1.40`) to make sure it is reachable at all — usually it
is the firewall rule that needs adjusting.

## 7. Schedule the daily backup

In Windows Task Scheduler create a daily task that runs at, say, 03:00:

- Action: **Start a program**
- Program: `C:\xampp\php\php.exe`
- Arguments: `"C:\xampp\htdocs\HR-Management-System\backup_cron.php"`
- Start in: `C:\xampp\htdocs\HR-Management-System`

If the task ever fails the app has a fallback in `api.php` that creates
the backup on the first login of the day, so you have two layers.

## 8. After deployment

- Send the colleagues the URL (`http://192.168.1.40/HR-Management-System`)
  and tell them to bookmark it.
- Create their accounts in **Admin → Utilizadores**. They get a
  verification email; once they click it they can set their password.
- For password resets use the **Esqueci-me da password** link on the
  login page (a reset link is emailed) or, for cases where the user
  cannot access their email, use the admin **Alterar password** flow
  which sends a 2FA code to the admin's own email.

## Things that have already bitten me

- **Daily backup task ran as a user without permissions** to write into
  `backups/`. The task succeeded silently but produced nothing. Set the
  task to run as the same Windows user that owns the project folder.
- **Router rebooted and DHCP handed out a different IP**. Bookmarks
  pointed to nothing. Reservation on the router fixed it for good.
- **Antivirus blocked the SMTP outbound connection** the first time the
  app tried to send an email. Whitelist `php.exe` if mail silently
  fails on first run.
