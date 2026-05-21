<?php

declare(strict_types=1);

function applySecurityHeaders(): void
{
    header('X-Frame-Options: SAMEORIGIN');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()');
    // 'unsafe-inline'/'unsafe-eval' por causa do Babel Standalone in-browser
    header(
        "Content-Security-Policy: default-src 'self'; "
        . "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; "
        . "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; "
        . "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; "
        . "img-src 'self' data: blob: https:; "
        . "connect-src 'self'; "
        . "frame-ancestors 'self'; "
        . "base-uri 'self'; "
        . "form-action 'self'"
    );
}

function csrfTokenGet(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return (string)$_SESSION['csrf_token'];
}

function csrfTokenRotate(): string
{
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    return (string)$_SESSION['csrf_token'];
}

function csrfValidate(array $input): bool
{
    $expected = (string)($_SESSION['csrf_token'] ?? '');
    if ($expected === '') return false;
    $sent = '';
    foreach (['HTTP_X_CSRF_TOKEN', 'HTTP_X_XSRF_TOKEN'] as $h) {
        if (!empty($_SERVER[$h])) { $sent = (string)$_SERVER[$h]; break; }
    }
    if ($sent === '' && !empty($input['csrf'])) {
        $sent = (string)$input['csrf'];
    }
    return $sent !== '' && hash_equals($expected, $sent);
}

function getSecurityVersion(PDO $db): int
{
    $row = $db->query("SELECT v FROM app_store WHERE k = 'security_version' LIMIT 1")->fetch();
    if (!$row) return 1;
    $n = (int)json_decode((string)$row['v'], true);
    return $n > 0 ? $n : 1;
}

function bumpSecurityVersion(PDO $db): int
{
    $next = getSecurityVersion($db) + 1;
    $stmt = $db->prepare(
        "INSERT INTO app_store (k, v, updated_at) VALUES ('security_version', :v, :u)
         ON CONFLICT(k) DO UPDATE SET v = excluded.v, updated_at = excluded.updated_at"
    );
    $stmt->execute([':v' => json_encode($next), ':u' => date('c')]);
    return $next;
}

function ensureSecuritySchema(PDO $db): void
{
    $db->exec(
        'CREATE TABLE IF NOT EXISTS user_sessions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL,
            session_id  TEXT NOT NULL,
            ip          TEXT,
            user_agent  TEXT,
            created_at  TEXT NOT NULL,
            last_seen   TEXT NOT NULL,
            revoked     INTEGER NOT NULL DEFAULT 0,
            UNIQUE(session_id)
        )'
    );

    $db->exec(
        'CREATE TABLE IF NOT EXISTS screenshot_log (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            ts              TEXT NOT NULL,
            user_id         INTEGER,
            username        TEXT,
            role            TEXT,
            division        TEXT,
            event_type      TEXT,
            ip              TEXT,
            user_agent      TEXT,
            details         TEXT,
            screenshot_path TEXT
        )'
    );

    // migração: adiciona screenshot_path em BDs antigas
    try {
        $cols = $db->query('PRAGMA table_info(screenshot_log)')->fetchAll();
        $has = false;
        foreach ($cols as $c) { if (($c['name'] ?? '') === 'screenshot_path') { $has = true; break; } }
        if (!$has) { $db->exec('ALTER TABLE screenshot_log ADD COLUMN screenshot_path TEXT'); }
    } catch (\Throwable $e) {}

    $db->exec('CREATE INDEX IF NOT EXISTS idx_scrlog_division ON screenshot_log(division)');
    $db->exec('CREATE INDEX IF NOT EXISTS idx_scrlog_ts       ON screenshot_log(ts DESC)');
    $db->exec('CREATE INDEX IF NOT EXISTS idx_us_user         ON user_sessions(user_id)');
}

function screenshotsDir(): string
{
    $d = __DIR__ . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'screenshots';
    if (!is_dir($d)) { @mkdir($d, 0755, true); }
    return $d;
}

function purgeOldScreenshots(PDO $db, int $days = 7): int
{
    $cutoff = time() - $days * 86400;
    $removed = 0;
    foreach (glob(screenshotsDir() . DIRECTORY_SEPARATOR . '*') ?: [] as $f) {
        if (is_file($f) && filemtime($f) < $cutoff) {
            if (@unlink($f)) $removed++;
        }
    }
    $db->prepare('UPDATE screenshot_log SET screenshot_path = NULL WHERE screenshot_path IS NOT NULL AND ts < :c')
       ->execute([':c' => date('c', $cutoff)]);
    return $removed;
}

function saveScreenshotFromDataUrl(string $dataUrl, int $userId): ?string
{
    if (!preg_match('#^data:image/(png|jpeg|jpg);base64,(.+)$#i', $dataUrl, $m)) {
        return null;
    }
    $ext = strtolower($m[1]) === 'png' ? 'png' : 'jpg';
    $bin = base64_decode($m[2], true);
    if ($bin === false || strlen($bin) < 100 || strlen($bin) > 5 * 1024 * 1024) {
        return null;
    }

    $name = sprintf(
        'u%d_%s_%s.%s',
        $userId,
        date('Ymd_His'),
        bin2hex(random_bytes(4)),
        $ext
    );
    $path = screenshotsDir() . DIRECTORY_SEPARATOR . $name;
    return @file_put_contents($path, $bin) === false ? null : $name;
}

function clientIp(): string
{
    $fwd = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if ($fwd) {
        $first = trim(explode(',', $fwd)[0]);
        if ($first !== '') return substr($first, 0, 64);
    }
    return substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64);
}

function clientUserAgent(): string
{
    return substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);
}

function recordLogin(PDO $db, int $userId): void
{
    $stmt = $db->prepare(
        'INSERT INTO user_sessions (user_id, session_id, ip, user_agent, created_at, last_seen)
         VALUES (:u, :s, :i, :a, :c, :l)
         ON CONFLICT(session_id) DO UPDATE SET
            user_id    = excluded.user_id,
            ip         = excluded.ip,
            user_agent = excluded.user_agent,
            last_seen  = excluded.last_seen,
            revoked    = 0'
    );
    $now = date('c');
    $stmt->execute([
        ':u' => $userId,
        ':s' => session_id(),
        ':i' => clientIp(),
        ':a' => clientUserAgent(),
        ':c' => $now,
        ':l' => $now,
    ]);
}

function touchSession(PDO $db): void
{
    if (empty($_SESSION['user_id'])) return;
    $sid = session_id();
    if (!$sid) return;
    $db->prepare('UPDATE user_sessions SET last_seen = :l WHERE session_id = :s')
       ->execute([':l' => date('c'), ':s' => $sid]);
}

function isCurrentSessionRevoked(PDO $db): bool
{
    $sid = session_id();
    if (!$sid) return false;
    $stmt = $db->prepare('SELECT revoked FROM user_sessions WHERE session_id = :s LIMIT 1');
    $stmt->execute([':s' => $sid]);
    $row = $stmt->fetch();
    return $row && (int)$row['revoked'] === 1;
}

// excepto a sessão actual (para o admin nao se desconectar a si proprio)
function revokeOtherSessionsForUser(PDO $db, int $userId): int
{
    $stmt = $db->prepare(
        'UPDATE user_sessions SET revoked = 1
          WHERE user_id = :u AND session_id != :s AND revoked = 0'
    );
    $stmt->execute([':u' => $userId, ':s' => session_id() ?: '']);
    return $stmt->rowCount();
}

function revokeAllUserSessions(PDO $db, int $userId): int
{
    $stmt = $db->prepare('UPDATE user_sessions SET revoked = 1 WHERE user_id = :u AND revoked = 0');
    $stmt->execute([':u' => $userId]);
    return $stmt->rowCount();
}
