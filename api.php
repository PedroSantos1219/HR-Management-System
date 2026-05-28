<?php

declare(strict_types=1);


ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.use_only_cookies', '1');
session_start();

// Timeout: 30 minutos de inactividade.
if (!empty($_SESSION['LAST_ACTIVITY']) && time() - $_SESSION['LAST_ACTIVITY'] > 1800) {
    session_unset(); session_destroy();
    session_start();
}
$_SESSION['LAST_ACTIVITY'] = time();

if (!file_exists(__DIR__ . '/config.php')) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(503);
    echo json_encode([
        'ok' => false,
        'error' => 'config.php em falta. Copie config.example.php para config.php e preencha as credenciais SMTP antes do primeiro acesso.',
    ]);
    exit;
}
$GLOBALS['app_config'] = require __DIR__ . '/config.php';
if (file_exists(__DIR__ . '/mailer.php'))   { require_once __DIR__ . '/mailer.php'; }
if (file_exists(__DIR__ . '/security.php')) { require_once __DIR__ . '/security.php'; }

define('UPLOADS_DIR', __DIR__ . DIRECTORY_SEPARATOR . 'uploads');
define('BACKUPS_DIR', __DIR__ . DIRECTORY_SEPARATOR . 'backups');

function isSuperAdmin(?string $email): bool
{
    if (!$email) return false;
    $list = $GLOBALS['app_config']['super_admins'] ?? [];
    $email = strtolower(trim($email));
    foreach ($list as $e) {
        if (strtolower(trim((string)$e)) === $email) return true;
    }
    return false;
}

function ensureBackupsDir(): void
{
    if (!is_dir(BACKUPS_DIR)) { @mkdir(BACKUPS_DIR, 0755, true); }
}

function makeBackupNow(?string $note = null): array
{
    ensureBackupsDir();
    $src = __DIR__ . DIRECTORY_SEPARATOR . 'rh_manager.sqlite';
    if (!is_file($src)) return ['ok' => false, 'error' => 'Base de dados não encontrada.'];

    $date = date('Y-m-d');
    $time = date('His');
    $name = "rh_backup_{$date}_{$time}.sqlite";
    $dst  = BACKUPS_DIR . DIRECTORY_SEPARATOR . $name;

    if (!@copy($src, $dst)) {
        return ['ok' => false, 'error' => 'Falha ao copiar base de dados.'];
    }
    if ($note) { @file_put_contents($dst . '.note.txt', $note); }

    return ['ok' => true, 'name' => $name, 'date' => $date, 'time' => $time, 'size' => filesize($dst)];
}

// Fallback se o cron diário tiver falhado: cria backup do dia se ainda não existir.
function ensureDailyBackup(): void
{
    ensureBackupsDir();
    $today = date('Y-m-d');
    foreach (glob(BACKUPS_DIR . DIRECTORY_SEPARATOR . "rh_backup_{$today}_*.sqlite") ?: [] as $existing) {
        return;
    }
    makeBackupNow('Backup diário automático');
}

function listBackups(): array
{
    ensureBackupsDir();
    $files = glob(BACKUPS_DIR . DIRECTORY_SEPARATOR . 'rh_backup_*.sqlite') ?: [];
    $out = [];
    foreach ($files as $f) {
        $base = basename($f);
        $mtime = filemtime($f);
        $note = is_file($f . '.note.txt') ? trim((string)@file_get_contents($f . '.note.txt')) : '';
        $out[] = [
            'name' => $base,
            'size' => filesize($f),
            'modified' => date('c', $mtime ?: time()),
            'note' => $note,
        ];
    }
    usort($out, function($a,$b){ return strcmp($b['name'], $a['name']); });
    return $out;
}

if (function_exists('applySecurityHeaders')) { applySecurityHeaders(); }

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';
    if ($action === 'download_backup') {
        if (empty($_SESSION['user_id'])) { http_response_code(403); exit('Acesso negado'); }
        $db_check = new PDO('sqlite:' . __DIR__ . DIRECTORY_SEPARATOR . 'rh_manager.sqlite');
        $db_check->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $u = $db_check->query('SELECT role FROM users WHERE id = ' . (int)$_SESSION['user_id'])->fetch();
        if (!$u || $u['role'] !== 'ADMIN') { http_response_code(403); exit('Apenas administradores.'); }
        $bname = basename($_GET['filename'] ?? '');
        if (!preg_match('/^rh_backup_\d{4}-\d{2}-\d{2}_\d{6}\.sqlite$/', $bname)) {
            http_response_code(400); exit('Nome invalido.');
        }
        $bp = BACKUPS_DIR . DIRECTORY_SEPARATOR . $bname;
        if (!is_file($bp)) { http_response_code(404); exit('Backup nao encontrado.'); }
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . $bname . '"');
        header('Content-Length: ' . filesize($bp));
        readfile($bp);
        exit;
    }
    if ($action === 'serve_doc') {
        if (empty($_SESSION['user_id'])) { http_response_code(403); exit('Acesso negado'); }
        serveDocFile($_GET['path'] ?? '');
    }
    if ($action === 'verify_email') {
        verifyEmailToken($_GET['token'] ?? '');
    }
    if ($action === 'serve_screenshot') {
        if (empty($_SESSION['user_id'])) { http_response_code(403); exit('Acesso negado'); }
        $db_check = new PDO('sqlite:' . __DIR__ . DIRECTORY_SEPARATOR . 'rh_manager.sqlite');
        $db_check->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $u = $db_check->query('SELECT email FROM users WHERE id = ' . (int)$_SESSION['user_id'])->fetch();
        if (!$u || !isSuperAdmin($u['email'])) { http_response_code(403); exit('Apenas super-administradores.'); }
        $name = basename($_GET['name'] ?? '');
        if (!preg_match('/^u\d+_\d{8}_\d{6}_[a-f0-9]+\.(png|jpe?g)$/i', $name)) {
            http_response_code(400); exit('Nome invalido.');
        }
        $p = (function_exists('screenshotsDir') ? screenshotsDir() : __DIR__) . DIRECTORY_SEPARATOR . $name;
        if (!is_file($p)) { http_response_code(404); exit('Imagem nao encontrada (pode ter expirado).'); }
        $ext = strtolower(pathinfo($p, PATHINFO_EXTENSION));
        header('Content-Type: ' . ($ext === 'png' ? 'image/png' : 'image/jpeg'));
        header('Cache-Control: private, max-age=300');
        header('Content-Length: ' . filesize($p));
        readfile($p);
        exit;
    }
    $excelActions = [
        'get_excel_template' => [
            'file' => 'BASE DE DADOS ROUPETA E RII.xlsm',
            'mime' => 'application/vnd.ms-excel.sheet.macroEnabled.12',
            'name' => 'BASE DE DADOS ROUPETA E RII.xlsm',
        ],
        'get_pit_template' => [
            'file' => 'BASE DE DADOS - COLABORADORES PIT EVOLUTION.xlsx',
            'mime' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'name' => 'BASE DE DADOS - COLABORADORES PIT EVOLUTION.xlsx',
        ],
        'get_ferias_template' => [
            'file' => 'MARCAÇÃO DE FÉRIAS - 2024_.xlsx',
            'mime' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'name' => 'MARCAÇÃO DE FÉRIAS - 2024_.xlsx',
        ],
    ];

    if (isset($excelActions[$action])) {
        if (empty($_SESSION['user_id'])) { http_response_code(403); exit('Acesso negado'); }
        $db = new PDO('sqlite:' . __DIR__ . DIRECTORY_SEPARATOR . 'rh_manager.sqlite');
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $user = $db->query('SELECT role FROM users WHERE id = ' . (int)$_SESSION['user_id'])->fetch();
        if (!$user || $user['role'] !== 'ADMIN') { http_response_code(403); exit('Apenas administradores podem exportar.'); }
        $cfg  = $excelActions[$action];
        $path = __DIR__ . DIRECTORY_SEPARATOR . $cfg['file'];
        if (!is_file($path)) { http_response_code(404); exit('Ficheiro não encontrado: ' . $cfg['file']); }
        header('Content-Type: ' . $cfg['mime']);
        header('Content-Disposition: attachment; filename="' . $cfg['name'] . '"');
        header('Content-Length: ' . filesize($path));
        readfile($path);
        exit;
    }

    http_response_code(400);
    exit;
}

$_origin = $_SERVER['HTTP_ORIGIN'] ?? '';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . ($_origin !== '' ? $_origin : '*'));
if ($_origin !== '') { header('Access-Control-Allow-Credentials: true'); }
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, null, 'Metodo nao suportado');
}

$input = json_decode(file_get_contents('php://input') ?: '{}', true);
if (!is_array($input)) {
    respond(false, null, 'JSON invalido');
}

$action = isset($input['action']) ? (string)$input['action'] : '';
if ($action === '') {
    respond(false, null, 'Acao em falta');
}

try {
    $db = new PDO('sqlite:' . __DIR__ . DIRECTORY_SEPARATOR . 'rh_manager.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    ensureSchema($db);
    if (function_exists('ensureSecuritySchema')) { ensureSecuritySchema($db); }

    $publicActions = ['login', 'check_session', 'logout', 'request_password_reset', 'reset_password_with_token', 'setup_create_admin'];
    if (!in_array($action, $publicActions, true) && empty($_SESSION['user_id'])) {
        respond(false, null, 'Sessao expirada. Por favor, inicie sessao novamente.');
    }

    if (!in_array($action, $publicActions, true) && function_exists('isCurrentSessionRevoked')) {
        if (isCurrentSessionRevoked($db)) {
            session_unset(); session_destroy();
            respond(false, null, 'A sua sessao foi terminada por um administrador. Inicie sessao novamente.');
        }
    }

    $csrfExempt = ['login', 'check_session', 'logout', 'get_csrf_token', 'request_password_reset', 'reset_password_with_token', 'setup_create_admin'];
    if (!in_array($action, $csrfExempt, true) && function_exists('csrfValidate')) {
        if (!csrfValidate($input)) {
            respond(false, null, 'Token de seguranca invalido ou em falta. Recarregue a pagina.');
        }
    }

    $currentUser = null;
    if (!empty($_SESSION['user_id'])) {
        $su = $db->prepare('SELECT id, username, email, role FROM users WHERE id = :id LIMIT 1');
        $su->execute([':id' => $_SESSION['user_id']]);
        $currentUser = $su->fetch() ?: null;
        if (function_exists('touchSession')) { touchSession($db); }
    }

    switch ($action) {
        case 'get_data':
            $appData = getStoreValue($db, 'app_data', []);
            if (is_array($appData)) {
                $fixed = applyDataMigrations($appData);
                if ($fixed !== $appData) {
                    setStoreValue($db, 'app_data', $fixed);
                }
                $appData = $fixed;
                if (!isset($appData['__dataVersion__'])) {
                    $appData['__dataVersion__'] = 0;
                }
            }
            respond(true, $appData);
            break;

        case 'save_data':
            $data = $input['data'] ?? null;
            if (!is_array($data)) {
                respond(false, null, 'Campo data invalido');
            }
            // null = cliente antigo, salta o check (compatibilidade retro).
            $baseVersion = (array_key_exists('baseVersion', $input) && is_numeric($input['baseVersion']))
                ? (int)$input['baseVersion']
                : null;

            $db->beginTransaction();
            $current = getStoreValue($db, 'app_data', []);
            $currentVersion = (is_array($current) && isset($current['__dataVersion__']))
                ? (int)$current['__dataVersion__']
                : 0;

            if ($baseVersion !== null && $baseVersion !== $currentVersion) {
                $db->rollBack();
                respond(false, ['conflict' => true, 'currentVersion' => $currentVersion],
                    'CONFLITO_VERSAO: Outro utilizador alterou os dados desde que abriu a aplicacao. Recarregue antes de gravar.');
            }

            $data = applyDataMigrations($data);
            $newVersion = $currentVersion + 1;
            $data['__dataVersion__'] = $newVersion;
            setStoreValue($db, 'app_data', $data);
            $db->commit();
            respond(true, ['newVersion' => $newVersion]);
            break;

        case 'get_audit':
            $stmt = $db->query('SELECT ts, user, role, action, details FROM audit_log ORDER BY id DESC LIMIT 1000');
            $rows = $stmt->fetchAll();
            $rows = array_reverse($rows);
            respond(true, $rows);
            break;

        case 'append_audit':
            $entry = $input['entry'] ?? null;
            if (!is_array($entry)) {
                respond(false, null, 'Campo entry invalido');
            }
            $stmt = $db->prepare('INSERT INTO audit_log (ts, user, role, action, details) VALUES (:ts, :user, :role, :action, :details)');
            $stmt->execute([
                ':ts' => date('c'),
                ':user' => (string)($entry['user'] ?? 'Sistema'),
                ':role' => (string)($entry['role'] ?? ''),
                ':action' => (string)($entry['action'] ?? ''),
                ':details' => (string)($entry['details'] ?? ''),
            ]);
            $db->exec('DELETE FROM audit_log WHERE id NOT IN (SELECT id FROM audit_log ORDER BY id DESC LIMIT 1000)');
            respond(true, true);
            break;

        case 'get_docs':
            $empId = trim((string)($input['empId'] ?? ''));
            $empCompany = trim((string)($input['empCompany'] ?? ''));
            if ($empId === '' || $empCompany === '') {
                respond(true, []);
            }
            respond(true, getEmployeeValue($db, 'docs', $empId, $empCompany, []));
            break;

        case 'save_docs':
            $empId = trim((string)($input['empId'] ?? ''));
            $empCompany = trim((string)($input['empCompany'] ?? ''));
            $docs = $input['docs'] ?? [];
            if ($empId === '' || $empCompany === '' || !is_array($docs)) {
                respond(false, null, 'Parametros invalidos para docs');
            }
            // Remove o base64 — o ficheiro vive em disco, na BD só ficam os metadados.
            $docs = array_map(fn($d) => array_diff_key($d, ['data' => '']), $docs);
            setEmployeeValue($db, 'docs', $empId, $empCompany, $docs);
            respond(true, true);
            break;

        case 'upload_doc':
            $empId      = trim((string)($input['empId']      ?? ''));
            $empCompany = trim((string)($input['empCompany'] ?? ''));
            $docId      = trim((string)($input['docId']      ?? ''));
            $filename   = trim((string)($input['filename']   ?? 'ficheiro'));
            $mime       = trim((string)($input['mime']       ?? 'application/octet-stream'));
            $dataUrl    = (string)($input['data'] ?? '');

            if ($empId === '' || $empCompany === '' || $docId === '' || $dataUrl === '') {
                respond(false, null, 'Parametros em falta para upload_doc');
            }

            if (!preg_match('/^data:([^;]+);base64,(.+)$/s', $dataUrl, $m)) {
                respond(false, null, 'Formato de ficheiro invalido');
            }
            $mimeType = strtolower($m[1]);
            $bytes = base64_decode($m[2], true);
            if ($bytes === false) {
                respond(false, null, 'Base64 invalido');
            }

            if (strlen($bytes) > 20 * 1024 * 1024) {
                respond(false, null, 'Ficheiro demasiado grande (max 20 MB)');
            }

            $allowedExts = ['pdf','jpg','jpeg','png','doc','docx'];
            $allowedMimes = [
                'application/pdf','image/jpeg','image/png',
                'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];
            $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
            if (!in_array($ext, $allowedExts, true) || !in_array($mimeType, $allowedMimes, true)) {
                respond(false, null, 'Tipo de ficheiro não permitido');
            }

            $folderName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $empId . '_' . $empCompany);
            $folder     = UPLOADS_DIR . DIRECTORY_SEPARATOR . $folderName;
            if (!is_dir($folder) && !mkdir($folder, 0755, true)) {
                respond(false, null, 'Erro ao criar pasta de uploads');
            }

            $safeExt  = $ext;
            $saveName = $docId . '.' . $safeExt;
            $savePath = $folder . DIRECTORY_SEPARATOR . $saveName;

            if (file_put_contents($savePath, $bytes) === false) {
                respond(false, null, 'Erro ao guardar ficheiro');
            }

            $relativePath = $folderName . '/' . $saveName;
            respond(true, ['path' => $relativePath]);
            break;

        case 'delete_doc':
            $relPath = trim((string)($input['path'] ?? ''));
            if ($relPath !== '') {
                $absPath = realpath(UPLOADS_DIR . DIRECTORY_SEPARATOR . $relPath);
                if ($absPath && str_starts_with($absPath, realpath(UPLOADS_DIR) . DIRECTORY_SEPARATOR)) {
                    @unlink($absPath);
                }
            }
            respond(true, true);
            break;

        case 'get_training':
            respond(true, getStoreValue($db, 'training_records', []));
            break;

        case 'save_training':
            $records = $input['records'] ?? null;
            if (!is_array($records)) {
                respond(false, null, 'Campo records invalido');
            }
            setStoreValue($db, 'training_records', $records);
            respond(true, true);
            break;

        case 'get_epi':
            $empId = trim((string)($input['empId'] ?? ''));
            $empCompany = trim((string)($input['empCompany'] ?? ''));
            if ($empId === '' || $empCompany === '') {
                respond(true, new stdClass());
            }
            respond(true, getEmployeeValue($db, 'epi', $empId, $empCompany, new stdClass()));
            break;

        case 'get_all_epi':
            $rows = $db->query("SELECT emp_id, emp_company, v FROM employee_store WHERE namespace = 'epi'")->fetchAll();
            $result = new stdClass();
            foreach ($rows as $row) {
                $key = $row['emp_id'] . '|' . $row['emp_company'];
                $decoded = json_decode((string)$row['v'], true);
                $result->$key = $decoded !== null ? $decoded : new stdClass();
            }
            respond(true, $result);
            break;

        case 'save_epi':
            $empId = trim((string)($input['empId'] ?? ''));
            $empCompany = trim((string)($input['empCompany'] ?? ''));
            $epiData = $input['data'] ?? null;
            if ($empId === '' || $empCompany === '' || (!is_array($epiData) && !is_object($epiData))) {
                respond(false, null, 'Parametros invalidos para epi');
            }
            setEmployeeValue($db, 'epi', $empId, $empCompany, $epiData);
            respond(true, true);
            break;

        case 'get_farda':
            $empId = trim((string)($input['empId'] ?? ''));
            $empCompany = trim((string)($input['empCompany'] ?? ''));
            if ($empId === '' || $empCompany === '') {
                respond(true, new stdClass());
            }
            respond(true, getEmployeeValue($db, 'farda', $empId, $empCompany, new stdClass()));
            break;

        case 'get_all_farda':
            $rows = $db->query("SELECT emp_id, emp_company, v FROM employee_store WHERE namespace = 'farda'")->fetchAll();
            $result = new stdClass();
            foreach ($rows as $row) {
                $key = $row['emp_id'] . '|' . $row['emp_company'];
                $decoded = json_decode((string)$row['v'], true);
                $result->$key = $decoded !== null ? $decoded : new stdClass();
            }
            respond(true, $result);
            break;

        case 'save_farda':
            $empId = trim((string)($input['empId'] ?? ''));
            $empCompany = trim((string)($input['empCompany'] ?? ''));
            $fardaData = $input['data'] ?? null;
            if ($empId === '' || $empCompany === '' || (!is_array($fardaData) && !is_object($fardaData))) {
                respond(false, null, 'Parametros invalidos para farda');
            }
            setEmployeeValue($db, 'farda', $empId, $empCompany, $fardaData);
            respond(true, true);
            break;

        case 'get_farda_stock':
            respond(true, getStoreValue($db, 'farda_stock', new stdClass()));
            break;

        case 'save_farda_stock':
            $stock = $input['stock'] ?? null;
            if (!is_array($stock) && !is_object($stock)) {
                respond(false, null, 'Parametros invalidos para stock');
            }
            setStoreValue($db, 'farda_stock', $stock);
            respond(true, true);
            break;

        case 'rename_employee_id':
            $oldId = trim((string)($input['oldId'] ?? ''));
            $newId = trim((string)($input['newId'] ?? ''));
            $company = trim((string)($input['company'] ?? ''));
            if ($oldId === '' || $newId === '' || $company === '') {
                respond(false, null, 'Faltam dados (oldId, newId, company)');
            }
            if ($oldId === $newId) {
                respond(true, ['affected' => 0]);
            }
            // OR IGNORE para nao rebentar se ja existir linha com o novo id.
            $stmt = $db->prepare('UPDATE OR IGNORE employee_store SET emp_id = :new WHERE emp_id = :old AND emp_company = :co');
            $stmt->execute([':new' => $newId, ':old' => $oldId, ':co' => $company]);
            respond(true, ['affected' => $stmt->rowCount()]);
            break;

        case 'send_messages':
            if (!$currentUser) {
                respond(false, null, 'Sessao expirada.');
            }
            $recipients = $input['recipients'] ?? [];
            if (!is_array($recipients) || empty($recipients)) {
                respond(false, null, 'Sem destinatarios.');
            }
            $smtp = $GLOBALS['app_config']['smtp'] ?? [];
            if (empty($smtp['host']) || empty($smtp['username'])) {
                respond(false, null, 'SMTP nao configurado em config.php.');
            }
            require_once __DIR__ . '/mailer.php';
            $mailer = new Mailer($smtp);
            $sent = 0; $failed = [];
            foreach ($recipients as $r) {
                $to      = trim((string)($r['to']      ?? ''));
                $name    = trim((string)($r['name']    ?? ''));
                $subject = trim((string)($r['subject'] ?? ''));
                $body    = (string)($r['body'] ?? '');
                if ($to === '' || $body === '') {
                    $failed[] = ['to' => $to, 'error' => 'Email ou corpo em falta'];
                    continue;
                }
                // Corpo em texto simples -> converter para HTML preservando quebras.
                $html = '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#1a0d0d;white-space:pre-wrap;">'
                      . htmlspecialchars($body, ENT_QUOTES, 'UTF-8')
                      . '</div>';
                try {
                    $mailer->send($to, $name ?: $to, $subject ?: '(sem assunto)', $html);
                    $sent++;
                } catch (\Throwable $e) {
                    $failed[] = ['to' => $to, 'error' => $e->getMessage()];
                }
            }
            respond(true, ['sent' => $sent, 'failed' => $failed]);
            break;

        case 'check_session':
            // BD sem qualquer utilizador (instalação nova) → sinaliza o setup wizard.
            $userCount = (int)$db->query('SELECT COUNT(*) FROM users')->fetchColumn();
            if ($userCount === 0) {
                $smtp = $GLOBALS['app_config']['smtp'] ?? [];
                respond(true, [
                    'needsSetup' => true,
                    'smtpConfigured' => !empty($smtp['username']) && !empty($smtp['password']),
                ]);
            }
            if (empty($_SESSION['user_id'])) { respond(true, null); }
            $su = $db->prepare('SELECT id, username, email, role FROM users WHERE id = :id AND verified = 1 LIMIT 1');
            $su->execute([':id' => $_SESSION['user_id']]);
            $u = $su->fetch();
            if (!$u) { session_destroy(); respond(true, null); }
            try { ensureDailyBackup(); } catch (Throwable $e) {}
            respond(true, [
                'id'              => $u['id'],
                'name'            => $u['username'],
                'username'        => $u['username'],
                'email'           => $u['email'],
                'role'            => $u['role'],
                'isSuper'         => isSuperAdmin($u['email']),
                'csrf'            => function_exists('csrfTokenGet') ? csrfTokenGet() : '',
                'securityVersion' => function_exists('getSecurityVersion') ? getSecurityVersion($db) : 1,
                'companies'       => $GLOBALS['app_config']['companies'] ?? [],
            ]);
            break;

        case 'get_csrf_token':
            if (empty($_SESSION['user_id'])) {
                respond(false, null, 'Sessao expirada.');
            }
            $csrf = function_exists('csrfTokenGet') ? csrfTokenGet() : '';
            respond(true, ['csrf' => $csrf]);
            break;

        // Setup wizard: cria o primeiro admin numa instalação fresca.
        // Recusa-se a correr se já existir qualquer utilizador, por isso é seguro mantê-lo público.
        case 'setup_create_admin':
            if ((int)$db->query('SELECT COUNT(*) FROM users')->fetchColumn() > 0) {
                respond(false, null, 'Setup ja concluido — utilize o login normal.');
            }
            $suEmail = strtolower(trim((string)($input['email'] ?? '')));
            $suName  = trim((string)($input['name']  ?? ''));
            $suPass  = (string)($input['password']  ?? '');
            if ($suName === '') { $suName = $suEmail !== '' ? explode('@', $suEmail)[0] : 'Admin'; }
            if (!filter_var($suEmail, FILTER_VALIDATE_EMAIL)) {
                respond(false, null, 'Endereco de email invalido.');
            }
            if (strlen($suPass) < 8) {
                respond(false, null, 'A password deve ter pelo menos 8 caracteres.');
            }
            $db->prepare(
                'INSERT INTO users (username, email, password_hash, role, verified, created_at, created_by)
                 VALUES (:u, :e, :p, "ADMIN", 1, :c, "Setup")'
            )->execute([
                ':u' => $suName,
                ':e' => $suEmail,
                ':p' => password_hash($suPass, PASSWORD_DEFAULT),
                ':c' => date('c'),
            ]);
            respond(true, ['message' => 'Administrador criado. Pode iniciar sessao.']);
            break;

        case 'login':
            $lgEmail = strtolower(trim((string)($input['email'] ?? '')));
            $lgPass  = (string)($input['password'] ?? '');
            if ($lgEmail === '' || $lgPass === '') {
                respond(false, null, 'Preencha o email e a password.');
            }
            // Rate-limit por IP: 5 tentativas falhadas nos últimos 5 minutos bloqueia
            // por mais 15. Evita brute-force a partir de um único posto na rede interna.
            $clientIp = $_SERVER['REMOTE_ADDR'] ?? '';
            $now = time();
            $windowStart = $now - 900; // 15 min de retenção
            $db->prepare('DELETE FROM login_attempts WHERE ts < :t')->execute([':t' => $windowStart]);
            $recent = $db->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip = :ip AND ts >= :t');
            $recent->execute([':ip' => $clientIp, ':t' => $now - 300]);
            if ((int)$recent->fetchColumn() >= 5) {
                respond(false, null, 'Demasiadas tentativas falhadas. Aguarde alguns minutos antes de tentar de novo.');
            }
            $su = $db->prepare('SELECT * FROM users WHERE LOWER(email) = :e LIMIT 1');
            $su->execute([':e' => $lgEmail]);
            $u = $su->fetch();
            if (!$u || !password_verify($lgPass, (string)$u['password_hash'])) {
                $db->prepare('INSERT INTO login_attempts (ip, ts, email) VALUES (:ip, :t, :e)')
                   ->execute([':ip' => $clientIp, ':t' => $now, ':e' => $lgEmail]);
                respond(false, null, 'Email ou password incorretos.');
            }
            // Login OK — limpa o registo de falhas deste IP.
            $db->prepare('DELETE FROM login_attempts WHERE ip = :ip')->execute([':ip' => $clientIp]);
            session_regenerate_id(true);
            $_SESSION['user_id'] = $u['id'];
            $_SESSION['role']    = $u['role'];
            if (function_exists('csrfTokenRotate')) { csrfTokenRotate(); }
            if (function_exists('recordLogin')) { recordLogin($db, (int)$u['id']); }
            respond(true, [
                'id'              => $u['id'],
                'name'            => $u['username'],
                'username'        => $u['username'],
                'email'           => $u['email'],
                'role'            => $u['role'],
                'isSuper'         => isSuperAdmin($u['email']),
                'csrf'            => function_exists('csrfTokenGet') ? csrfTokenGet() : '',
                'securityVersion' => function_exists('getSecurityVersion') ? getSecurityVersion($db) : 1,
                'companies'       => $GLOBALS['app_config']['companies'] ?? [],
            ]);
            break;

        case 'logout':
            $sid = session_id();
            if ($sid) {
                $db->prepare('UPDATE user_sessions SET revoked = 1 WHERE session_id = :s')
                   ->execute([':s' => $sid]);
            }
            session_destroy();
            respond(true, true);
            break;

        case 'list_users':
            if (!$currentUser || $currentUser['role'] !== 'ADMIN') {
                respond(false, null, 'Acesso reservado a administradores.');
            }
            $rows = $db->query('SELECT id, username, email, role, verified, created_at, created_by FROM users ORDER BY id')->fetchAll();
            foreach ($rows as &$row) {
                $row['isSuper'] = isSuperAdmin($row['email']);
            }
            unset($row);
            respond(true, $rows);
            break;

        case 'create_user':
            if (!$currentUser || $currentUser['role'] !== 'ADMIN') {
                respond(false, null, 'Acesso reservado a administradores.');
            }
            $nuName = trim((string)($input['username'] ?? ''));
            $nuEmail = strtolower(trim((string)($input['email'] ?? '')));
            $nuPass  = (string)($input['password'] ?? '');
            $nuRole  = (string)($input['role'] ?? 'READER');
            if ($nuName === '' || $nuEmail === '' || $nuPass === '') {
                respond(false, null, 'Preencha todos os campos obrigatorios.');
            }
            if (!filter_var($nuEmail, FILTER_VALIDATE_EMAIL)) {
                respond(false, null, 'Endereco de email invalido.');
            }
            if (!in_array($nuRole, ['ADMIN', 'EDITOR', 'READER'], true)) {
                respond(false, null, 'Perfil de acesso invalido.');
            }
            if (strlen($nuPass) < 8) {
                respond(false, null, 'A password deve ter pelo menos 8 caracteres.');
            }
            $ck = $db->prepare('SELECT id FROM users WHERE LOWER(email) = :e LIMIT 1');
            $ck->execute([':e' => $nuEmail]);
            if ($ck->fetch()) {
                respond(false, null, 'Ja existe um utilizador com este endereco de email.');
            }
            $token = bin2hex(random_bytes(32));
            $ins = $db->prepare('INSERT INTO users (username, email, password_hash, role, verified, verify_token, created_at, created_by) VALUES (:u, :e, :p, :r, 0, :t, :c, :cb)');
            $ins->execute([':u' => $nuName, ':e' => $nuEmail, ':p' => password_hash($nuPass, PASSWORD_DEFAULT), ':r' => $nuRole, ':t' => $token, ':c' => date('c'), ':cb' => $currentUser['username']]);
            $emailSent = sendVerificationEmail($nuEmail, $nuName, $token);
            if (function_exists('bumpSecurityVersion')) { bumpSecurityVersion($db); }
            respond(true, ['emailSent' => $emailSent, 'message' => $emailSent ? "Utilizador criado. Email de verificacao enviado para {$nuEmail}." : "Utilizador criado, mas o email nao pôde ser enviado — configure as credenciais SMTP em config.php."]);
            break;

        case 'delete_user':
            if (!$currentUser || $currentUser['role'] !== 'ADMIN') {
                respond(false, null, 'Acesso reservado a administradores.');
            }
            $userId = (int)($input['userId'] ?? 0);
            if ($userId === (int)$_SESSION['user_id']) {
                respond(false, null, 'Nao pode eliminar a sua propria conta.');
            }
            $tu = $db->prepare('SELECT email FROM users WHERE id = :id LIMIT 1');
            $tu->execute([':id' => $userId]);
            $target = $tu->fetch();
            if ($target && isSuperAdmin($target['email']) && !isSuperAdmin($currentUser['email'])) {
                respond(false, null, 'Apenas super-administradores podem eliminar este utilizador.');
            }
            if (function_exists('revokeAllUserSessions')) { revokeAllUserSessions($db, $userId); }
            $db->prepare('DELETE FROM users WHERE id = :id')->execute([':id' => $userId]);
            if (function_exists('bumpSecurityVersion')) { bumpSecurityVersion($db); }
            respond(true, true);
            break;

        case 'update_user':
            if (!$currentUser || $currentUser['role'] !== 'ADMIN') {
                respond(false, null, 'Acesso reservado a administradores.');
            }
            $userId  = (int)($input['userId']   ?? 0);
            $upRole  = (string)($input['role']   ?? '');
            $upPass  = (string)($input['password'] ?? '');
            if ($userId === 0) { respond(false, null, 'ID invalido.'); }
            $tu = $db->prepare('SELECT email FROM users WHERE id = :id LIMIT 1');
            $tu->execute([':id' => $userId]);
            $target = $tu->fetch();
            if ($target && isSuperAdmin($target['email']) && !isSuperAdmin($currentUser['email'])) {
                respond(false, null, 'Apenas super-administradores podem alterar este utilizador.');
            }
            $changed = false;
            if ($upRole !== '' && in_array($upRole, ['ADMIN', 'EDITOR', 'READER'], true)) {
                $db->prepare('UPDATE users SET role = :r WHERE id = :id')->execute([':r' => $upRole, ':id' => $userId]);
                $changed = true;
            }
            if ($upPass !== '' && strlen($upPass) >= 8) {
                $db->prepare('UPDATE users SET password_hash = :p WHERE id = :id')->execute([':p' => password_hash($upPass, PASSWORD_DEFAULT), ':id' => $userId]);
                $changed = true;
            }
            if ($changed) {
                if (function_exists('revokeOtherSessionsForUser')) {
                    revokeOtherSessionsForUser($db, $userId);
                }
                if (function_exists('bumpSecurityVersion')) { bumpSecurityVersion($db); }
            }
            respond(true, true);
            break;

        case 'resend_verification':
            if (!$currentUser || $currentUser['role'] !== 'ADMIN') {
                respond(false, null, 'Acesso reservado a administradores.');
            }
            $userId = (int)($input['userId'] ?? 0);
            $su = $db->prepare('SELECT username, email FROM users WHERE id = :id AND verified = 0 LIMIT 1');
            $su->execute([':id' => $userId]);
            $u = $su->fetch();
            if (!$u) { respond(false, null, 'Utilizador nao encontrado ou ja verificado.'); }
            $token = bin2hex(random_bytes(32));
            $db->prepare('UPDATE users SET verify_token = :t WHERE id = :id')->execute([':t' => $token, ':id' => $userId]);
            $sent = sendVerificationEmail((string)$u['email'], (string)$u['username'], $token);
            respond($sent, null, $sent ? null : 'Falha ao enviar email — verifique as configuracoes SMTP em config.php.');
            break;

        // Dump consolidado do app_store + employee_store para o Excel manager.
        case 'get_export_data':
            if (!$currentUser || $currentUser['role'] !== 'ADMIN') {
                respond(false, null, 'Acesso reservado a administradores.');
            }
            $out = [];
            $out['app_data'] = getStoreValue($db, 'app_data', []);
            $out['training_records'] = getStoreValue($db, 'training_records', []);
            $stmt = $db->query('SELECT namespace, emp_id, emp_company, v FROM employee_store');
            $out['employees'] = [];
            $ferias = [];
            foreach ($stmt as $row) {
                $v = json_decode($row['v'], true);
                if (!is_array($v)) $v = [];
                $out['employees'][] = [
                    'namespace' => $row['namespace'],
                    'emp_id' => $row['emp_id'],
                    'emp_company' => $row['emp_company'],
                    'data' => $v
                ];
                if ($row['namespace'] === 'ferias' && isset($v['registos']) && is_array($v['registos'])) {
                    foreach ($v['registos'] as $reg) {
                        $ferias[] = array_merge([
                            'emp_id' => $row['emp_id'],
                            'emp_company' => $row['emp_company'],
                            'nome' => $v['nome'] ?? ($v['Nome Funcionário'] ?? null)
                        ], $reg);
                    }
                }
            }
            $out['ferias'] = $ferias;
            respond(true, $out);
            break;

        case 'get_file_sizes':
            $xlsFiles = [
                'roupeta' => 'BASE DE DADOS ROUPETA E RII.xlsm',
                'pit'     => 'BASE DE DADOS - COLABORADORES PIT EVOLUTION.xlsx',
                'ferias'  => 'MARCAÇÃO DE FÉRIAS - 2024_.xlsx',
            ];
            $sizes = [];
            foreach ($xlsFiles as $k => $f) {
                $p = __DIR__ . DIRECTORY_SEPARATOR . $f;
                $sizes[$k] = is_file($p) ? filesize($p) : 0;
            }
            respond(true, $sizes);
            break;

        case 'list_backups':
            if (!$currentUser || $currentUser['role'] !== 'ADMIN') {
                respond(false, null, 'Acesso reservado a administradores.');
            }
            respond(true, listBackups());
            break;

        case 'create_backup':
            if (!$currentUser || $currentUser['role'] !== 'ADMIN') {
                respond(false, null, 'Acesso reservado a administradores.');
            }
            $note = 'Backup manual por ' . ($currentUser['username'] ?? 'admin');
            $r = makeBackupNow($note);
            if (!$r['ok']) respond(false, null, $r['error'] ?? 'Falha ao criar backup.');
            respond(true, $r);
            break;

        case 'delete_backup':
            if (!$currentUser || $currentUser['role'] !== 'ADMIN') {
                respond(false, null, 'Acesso reservado a administradores.');
            }
            $bname = basename((string)($input['filename'] ?? ''));
            if (!preg_match('/^rh_backup_\d{4}-\d{2}-\d{2}_\d{6}\.sqlite$/', $bname)) {
                respond(false, null, 'Nome de backup invalido.');
            }
            $bp = BACKUPS_DIR . DIRECTORY_SEPARATOR . $bname;
            if (!is_file($bp)) respond(false, null, 'Backup nao encontrado.');
            @unlink($bp);
            @unlink($bp . '.note.txt');
            respond(true, true);
            break;

        case 'restore_backup':
            if (!$currentUser || $currentUser['role'] !== 'ADMIN') {
                respond(false, null, 'Acesso reservado a administradores.');
            }
            $bname = basename((string)($input['filename'] ?? ''));
            if (!preg_match('/^rh_backup_\d{4}-\d{2}-\d{2}_\d{6}\.sqlite$/', $bname)) {
                respond(false, null, 'Nome de backup invalido.');
            }
            $bp = BACKUPS_DIR . DIRECTORY_SEPARATOR . $bname;
            if (!is_file($bp)) respond(false, null, 'Backup nao encontrado.');
            $snapNote = 'Snapshot pre-restauro · revertido para ' . $bname . ' por ' . ($currentUser['username'] ?? 'admin');
            $snap = makeBackupNow($snapNote);
            if (!$snap['ok']) {
                respond(false, null, 'Falha ao criar snapshot pre-restauro: ' . ($snap['error'] ?? 'erro desconhecido') . '. Restauro abortado.');
            }
            // Tem de fechar a ligação antes do copy — file-locking no Windows.
            $db = null;
            $live = __DIR__ . DIRECTORY_SEPARATOR . 'rh_manager.sqlite';
            if (!@copy($bp, $live)) {
                respond(false, null, 'Falha ao restaurar (cópia abortada). O snapshot pre-restauro foi criado: ' . $snap['name']);
            }
            try {
                $db = new PDO('sqlite:' . $live);
                $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
                ensureSchema($db);
                if (function_exists('ensureSecuritySchema')) { ensureSecuritySchema($db); }
                if (function_exists('bumpSecurityVersion')) { bumpSecurityVersion($db); }
                $db->prepare('INSERT INTO audit_log (ts, user, role, action, details) VALUES (:ts, :u, :r, :a, :d)')
                   ->execute([
                       ':ts' => date('c'),
                       ':u'  => (string)$currentUser['username'],
                       ':r'  => (string)$currentUser['role'],
                       ':a'  => 'restauro',
                       ':d'  => "Restauro a partir de {$bname} (snapshot pre-restauro: {$snap['name']})",
                   ]);
            } catch (\Throwable $e) {
                error_log('restore_backup pos-processamento: ' . $e->getMessage());
            }
            respond(true, [
                'restoredFrom'  => $bname,
                'preSnapshot'   => $snap['name'],
                'message'       => 'Restauro concluido. Snapshot pre-restauro criado: ' . $snap['name'],
            ]);
            break;

        case 'log_screenshot':
            if (!$currentUser) { respond(false, null, 'Sessao expirada.'); }
            $division  = substr(trim((string)($input['division']  ?? '')), 0, 80);
            $eventType = substr(trim((string)($input['eventType'] ?? '')), 0, 40);
            $details   = substr(trim((string)($input['details']   ?? '')), 0, 500);
            $shotData  = (string)($input['screenshot'] ?? '');
            $allowedEvents = ['printscreen', 'display_media', 'visibility_blur', 'window_blur'];
            if (!in_array($eventType, $allowedEvents, true)) {
                respond(false, null, 'Tipo de evento invalido.');
            }
            $shotPath = null;
            if ($shotData !== '' && in_array($eventType, ['printscreen', 'display_media'], true)
                && function_exists('saveScreenshotFromDataUrl')) {
                $shotPath = saveScreenshotFromDataUrl($shotData, (int)$currentUser['id']);
            }
            $stmt = $db->prepare(
                'INSERT INTO screenshot_log (ts, user_id, username, role, division, event_type, ip, user_agent, details, screenshot_path)
                 VALUES (:ts, :uid, :u, :r, :d, :e, :i, :a, :det, :sp)'
            );
            $stmt->execute([
                ':ts'  => date('c'),
                ':uid' => (int)$currentUser['id'],
                ':u'   => (string)$currentUser['username'],
                ':r'   => (string)$currentUser['role'],
                ':d'   => $division !== '' ? $division : 'desconhecida',
                ':e'   => $eventType,
                ':i'   => function_exists('clientIp') ? clientIp() : '',
                ':a'   => function_exists('clientUserAgent') ? clientUserAgent() : '',
                ':det' => $details,
                ':sp'  => $shotPath,
            ]);
            $db->exec('DELETE FROM screenshot_log WHERE id NOT IN (SELECT id FROM screenshot_log ORDER BY id DESC LIMIT 5000)');
            respond(true, true);
            break;

        case 'get_screenshot_log':
            if (!$currentUser || !isSuperAdmin($currentUser['email'])) {
                respond(false, null, 'Acesso reservado a super-administradores.');
            }
            if (function_exists('purgeOldScreenshots')) {
                try { purgeOldScreenshots($db, 7); } catch (Throwable $e) {}
            }
            $limit = max(1, min(2000, (int)($input['limit'] ?? 500)));
            $rows = $db->query(
                'SELECT id, ts, user_id, username, role, division, event_type, ip, user_agent, details, screenshot_path
                   FROM screenshot_log
                  ORDER BY id DESC
                  LIMIT ' . $limit
            )->fetchAll();
            $byDivision = [];
            foreach ($rows as $r) {
                $d = $r['division'] ?: 'desconhecida';
                if (!isset($byDivision[$d])) $byDivision[$d] = ['division' => $d, 'count' => 0, 'lastTs' => null];
                $byDivision[$d]['count']++;
                if (!$byDivision[$d]['lastTs'] || strcmp((string)$r['ts'], (string)$byDivision[$d]['lastTs']) > 0) {
                    $byDivision[$d]['lastTs'] = $r['ts'];
                }
            }
            usort($byDivision, function($a,$b){ return $b['count'] - $a['count']; });
            respond(true, ['rows' => $rows, 'byDivision' => array_values($byDivision)]);
            break;

        case 'clear_screenshot_log':
            if (!$currentUser || !isSuperAdmin($currentUser['email'])) {
                respond(false, null, 'Acesso reservado a super-administradores.');
            }
            if (function_exists('screenshotsDir')) {
                $sd = screenshotsDir();
                foreach (glob($sd . DIRECTORY_SEPARATOR . '*') ?: [] as $f) {
                    if (is_file($f)) @unlink($f);
                }
            }
            $db->exec('DELETE FROM screenshot_log');
            respond(true, true);
            break;

        case 'get_user_sessions':
            if (!$currentUser || !isSuperAdmin($currentUser['email'])) {
                respond(false, null, 'Acesso reservado a super-administradores.');
            }
            $rows = $db->query(
                'SELECT s.id, s.user_id, u.username, u.email, u.role, s.ip, s.user_agent, s.created_at, s.last_seen, s.revoked
                   FROM user_sessions s
                   LEFT JOIN users u ON u.id = s.user_id
                  ORDER BY s.last_seen DESC
                  LIMIT 200'
            )->fetchAll();
            respond(true, $rows);
            break;

        case 'revoke_session':
            if (!$currentUser || !isSuperAdmin($currentUser['email'])) {
                respond(false, null, 'Acesso reservado a super-administradores.');
            }
            $sessId = (int)($input['sessionId'] ?? 0);
            if ($sessId <= 0) { respond(false, null, 'ID de sessao invalido.'); }
            $db->prepare('UPDATE user_sessions SET revoked = 1 WHERE id = :id')->execute([':id' => $sessId]);
            respond(true, true);
            break;

        // Devolve sempre OK (mesmo que o email não exista) para não revelar contas.
        case 'request_password_reset':
            $rpEmail = strtolower(trim((string)($input['email'] ?? '')));
            if ($rpEmail === '' || !filter_var($rpEmail, FILTER_VALIDATE_EMAIL)) {
                respond(false, null, 'Endereco de email invalido.');
            }
            $su = $db->prepare('SELECT id, username, email FROM users WHERE LOWER(email) = :e LIMIT 1');
            $su->execute([':e' => $rpEmail]);
            $u = $su->fetch();
            if ($u) {
                $token   = bin2hex(random_bytes(32));
                $expires = date('c', time() + 3600); // 1 hora
                $db->prepare('UPDATE users SET reset_token = :t, reset_expires = :x WHERE id = :id')
                   ->execute([':t' => $token, ':x' => $expires, ':id' => (int)$u['id']]);
                sendPasswordResetEmail((string)$u['email'], (string)$u['username'], $token);
            }
            respond(true, ['message' => 'Se a conta existir, receberá um email com instruções dentro de minutos.']);
            break;

        case 'reset_password_with_token':
            $rtToken = trim((string)($input['token'] ?? ''));
            $rtPass  = (string)($input['password'] ?? '');
            if ($rtToken === '' || strlen($rtToken) < 32) {
                respond(false, null, 'Token invalido.');
            }
            if (strlen($rtPass) < 8) {
                respond(false, null, 'A nova password deve ter pelo menos 8 caracteres.');
            }
            $su = $db->prepare('SELECT id, reset_expires FROM users WHERE reset_token = :t LIMIT 1');
            $su->execute([':t' => $rtToken]);
            $u = $su->fetch();
            if (!$u) {
                respond(false, null, 'Token invalido ou ja utilizado.');
            }
            if (!empty($u['reset_expires']) && strtotime((string)$u['reset_expires']) < time()) {
                respond(false, null, 'O link expirou. Solicite um novo email de recuperacao.');
            }
            $db->prepare('UPDATE users SET password_hash = :p, reset_token = NULL, reset_expires = NULL WHERE id = :id')
               ->execute([':p' => password_hash($rtPass, PASSWORD_DEFAULT), ':id' => (int)$u['id']]);
            if (function_exists('revokeAllUserSessions')) { revokeAllUserSessions($db, (int)$u['id']); }
            if (function_exists('bumpSecurityVersion')) { bumpSecurityVersion($db); }
            respond(true, ['message' => 'Password actualizada. Pode iniciar sessao com a nova password.']);
            break;

        // 2FA por email: gera um código de 6 dígitos antes de uma acção sensível
        // (atualmente: alterar password de outro utilizador).
        case 'admin_request_code':
            if (!$currentUser || $currentUser['role'] !== 'ADMIN') {
                respond(false, null, 'Acesso reservado a administradores.');
            }
            $acAction      = (string)($input['actionType'] ?? '');
            $acTargetId    = (int)($input['targetUserId'] ?? 0);
            $acDescription = trim((string)($input['description'] ?? ''));
            if ($acAction === '') {
                respond(false, null, 'Tipo de accao em falta.');
            }
            if ($acDescription === '') {
                $acDescription = 'Accao administrativa sensivel';
            }
            $db->prepare('DELETE FROM admin_codes WHERE admin_id = :a AND expires_at < :now')
               ->execute([':a' => (int)$currentUser['id'], ':now' => date('c')]);
            $code    = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $expires = date('c', time() + 600); // 10 minutos
            $db->prepare(
                'INSERT INTO admin_codes (code, admin_id, action, target_user_id, expires_at, created_at)
                 VALUES (:c, :a, :ac, :t, :x, :cr)'
            )->execute([
                ':c'  => $code,
                ':a'  => (int)$currentUser['id'],
                ':ac' => $acAction,
                ':t'  => $acTargetId > 0 ? $acTargetId : null,
                ':x'  => $expires,
                ':cr' => date('c'),
            ]);
            $sent = sendAdminActionCodeEmail(
                (string)$currentUser['email'],
                (string)$currentUser['username'],
                $code,
                $acDescription
            );
            respond($sent, ['expiresAt' => $expires], $sent ? null : 'Codigo gerado, mas o email nao pôde ser enviado — verifique config.php (SMTP).');
            break;

        case 'admin_verify_code_and_reset':
            if (!$currentUser || $currentUser['role'] !== 'ADMIN') {
                respond(false, null, 'Acesso reservado a administradores.');
            }
            $vcCode     = trim((string)($input['code'] ?? ''));
            $vcTargetId = (int)($input['targetUserId'] ?? 0);
            $vcNewPass  = (string)($input['newPassword'] ?? '');
            if ($vcCode === '' || strlen($vcCode) !== 6 || !ctype_digit($vcCode)) {
                respond(false, null, 'Codigo invalido.');
            }
            if ($vcTargetId <= 0) {
                respond(false, null, 'Utilizador alvo invalido.');
            }
            if (strlen($vcNewPass) < 8) {
                respond(false, null, 'A nova password deve ter pelo menos 8 caracteres.');
            }
            $sc = $db->prepare(
                'SELECT id, expires_at FROM admin_codes
                 WHERE code = :c AND admin_id = :a AND action = :ac
                   AND (target_user_id = :t OR target_user_id IS NULL)
                 ORDER BY id DESC LIMIT 1'
            );
            $sc->execute([
                ':c'  => $vcCode,
                ':a'  => (int)$currentUser['id'],
                ':ac' => 'reset_user_password',
                ':t'  => $vcTargetId,
            ]);
            $row = $sc->fetch();
            if (!$row) {
                respond(false, null, 'Codigo invalido ou ja utilizado.');
            }
            if (strtotime((string)$row['expires_at']) < time()) {
                $db->prepare('DELETE FROM admin_codes WHERE id = :id')->execute([':id' => (int)$row['id']]);
                respond(false, null, 'O codigo expirou. Solicite um novo.');
            }
            $tu = $db->prepare('SELECT email FROM users WHERE id = :id LIMIT 1');
            $tu->execute([':id' => $vcTargetId]);
            $target = $tu->fetch();
            if (!$target) {
                respond(false, null, 'Utilizador alvo nao encontrado.');
            }
            if (isSuperAdmin($target['email']) && !isSuperAdmin($currentUser['email'])) {
                respond(false, null, 'Apenas super-administradores podem alterar este utilizador.');
            }
            $db->prepare('UPDATE users SET password_hash = :p WHERE id = :id')
               ->execute([':p' => password_hash($vcNewPass, PASSWORD_DEFAULT), ':id' => $vcTargetId]);
            // Single-use: consome este código e limpa quaisquer outros do mesmo admin.
            $db->prepare('DELETE FROM admin_codes WHERE admin_id = :a')->execute([':a' => (int)$currentUser['id']]);
            if (function_exists('revokeAllUserSessions')) { revokeAllUserSessions($db, $vcTargetId); }
            if (function_exists('bumpSecurityVersion')) { bumpSecurityVersion($db); }
            respond(true, ['message' => 'Password do utilizador actualizada.']);
            break;

        default:            respond(false, null, 'Acao desconhecida');
    }
} catch (Throwable $e) {
    respond(false, null, 'Erro interno: ' . $e->getMessage());
}

function applyDataMigrations(array $data): array
{
    $employees = $data['employees'] ?? [];
    $inactive  = $data['inactive']  ?? [];

    // Move para activos quaisquer registos em "inactive" cujo status seja "active"
    // (resolve casos antigos em que o move-to-active n�o repercutiu nas duas listas).
    $stillInactive = [];
    foreach ($inactive as $e) {
        if (($e['status'] ?? '') === 'active') {
            $e['contractStatus'] = 'Ativo';
            $e['exitDate']       = null;
            $e['exitReason']     = null;
            $e['exitInitiative'] = null;
            $exists = false;
            foreach ($employees as $ex) {
                if ($ex['id'] === ($e['id'] ?? '') && $ex['company'] === ($e['company'] ?? '')) {
                    $exists = true; break;
                }
            }
            if (!$exists) $employees[] = $e;
        } else {
            $stillInactive[] = $e;
        }
    }

    $seen = [];
    $cleanEmp = [];
    foreach ($employees as $e) {
        $k = ($e['id'] ?? '') . '|' . ($e['company'] ?? '');
        if (!isset($seen[$k])) { $seen[$k] = true; $cleanEmp[] = $e; }
    }
    $seen2 = [];
    $cleanIn = [];
    foreach ($stillInactive as $e) {
        $k = ($e['id'] ?? '') . '|' . ($e['company'] ?? '');
        if (!isset($seen2[$k])) { $seen2[$k] = true; $cleanIn[] = $e; }
    }

    $data['employees'] = $cleanEmp;
    $data['inactive']  = $cleanIn;
    return $data;
}

function ensureSchema(PDO $db): void
{
    $db->exec(
        'CREATE TABLE IF NOT EXISTS app_store (
            k TEXT PRIMARY KEY,
            v TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )'
    );

    $db->exec(
        'CREATE TABLE IF NOT EXISTS employee_store (
            namespace TEXT NOT NULL,
            emp_id TEXT NOT NULL,
            emp_company TEXT NOT NULL,
            v TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (namespace, emp_id, emp_company)
        )'
    );

    $db->exec(
        'CREATE TABLE IF NOT EXISTS audit_log (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            ts TEXT NOT NULL,

            user TEXT,

            role TEXT,

            action TEXT,

            details TEXT

        )'

    );



    $db->exec(
        'CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT NOT NULL,
            email         TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role          TEXT NOT NULL,
            verified      INTEGER NOT NULL DEFAULT 0,
            verify_token  TEXT,
            created_at    TEXT NOT NULL,
            created_by    TEXT
        )'
    );

    // Reset password: adicionado via ALTER porque o CREATE acima é antigo.
    $cols = $db->query("PRAGMA table_info(users)")->fetchAll(PDO::FETCH_COLUMN, 1);
    if (!in_array('reset_token', $cols, true)) {
        $db->exec("ALTER TABLE users ADD COLUMN reset_token TEXT");
    }
    if (!in_array('reset_expires', $cols, true)) {
        $db->exec("ALTER TABLE users ADD COLUMN reset_expires TEXT");
    }

    $db->exec(
        'CREATE TABLE IF NOT EXISTS admin_codes (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            code            TEXT NOT NULL,
            admin_id        INTEGER NOT NULL,
            action          TEXT NOT NULL,
            target_user_id  INTEGER,
            expires_at      TEXT NOT NULL,
            created_at      TEXT NOT NULL
        )'
    );

    $db->exec(
        'CREATE TABLE IF NOT EXISTS login_attempts (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            ip       TEXT NOT NULL,
            ts       INTEGER NOT NULL,
            email    TEXT
        )'
    );
    $db->exec('CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_ts ON login_attempts(ip, ts)');

    seedDefaultUsers($db);
}

function getStoreValue(PDO $db, string $key, $default = null)
{
    $stmt = $db->prepare('SELECT v FROM app_store WHERE k = :k LIMIT 1');
    $stmt->execute([':k' => $key]);
    $row = $stmt->fetch();
    if (!$row) {
        return $default;
    }
    $decoded = json_decode((string)$row['v'], true);
    return $decoded === null ? $default : $decoded;
}

function setStoreValue(PDO $db, string $key, $value): void
{
    $stmt = $db->prepare(
        'INSERT INTO app_store (k, v, updated_at) VALUES (:k, :v, :u)
         ON CONFLICT(k) DO UPDATE SET v = excluded.v, updated_at = excluded.updated_at'
    );
    $stmt->execute([
        ':k' => $key,
        ':v' => json_encode($value, JSON_UNESCAPED_UNICODE),
        ':u' => date('c'),
    ]);
}

function getEmployeeValue(PDO $db, string $namespace, string $empId, string $empCompany, $default = null)
{
    $stmt = $db->prepare(
        'SELECT v FROM employee_store WHERE namespace = :n AND emp_id = :i AND emp_company = :c LIMIT 1'
    );
    $stmt->execute([
        ':n' => $namespace,
        ':i' => $empId,
        ':c' => $empCompany,
    ]);
    $row = $stmt->fetch();
    if (!$row) {
        return $default;
    }
    $decoded = json_decode((string)$row['v'], true);
    return $decoded === null ? $default : $decoded;
}

function setEmployeeValue(PDO $db, string $namespace, string $empId, string $empCompany, $value): void
{
    $stmt = $db->prepare(
        'INSERT INTO employee_store (namespace, emp_id, emp_company, v, updated_at)
         VALUES (:n, :i, :c, :v, :u)
         ON CONFLICT(namespace, emp_id, emp_company)
         DO UPDATE SET v = excluded.v, updated_at = excluded.updated_at'
    );
    $stmt->execute([
        ':n' => $namespace,
        ':i' => $empId,
        ':c' => $empCompany,
        ':v' => json_encode($value, JSON_UNESCAPED_UNICODE),
        ':u' => date('c'),
    ]);
}

function respond(bool $ok, $data = null, ?string $error = null): void
{
    echo json_encode([
        'ok' => $ok,
        'data' => $data,
        'error' => $error,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function serveDocFile(string $relPath): never
{
    $relPath = ltrim($relPath, '/\\');
    if ($relPath === '' || str_contains($relPath, '..')) {
        http_response_code(400);
        exit('Caminho invalido');
    }

    $absPath = realpath(UPLOADS_DIR . DIRECTORY_SEPARATOR . $relPath);

    if (!$absPath || !str_starts_with($absPath, realpath(UPLOADS_DIR) . DIRECTORY_SEPARATOR)) {
        http_response_code(404);
        exit('Ficheiro nao encontrado');
    }

    if (!is_file($absPath)) {
        http_response_code(404);
        exit('Ficheiro nao encontrado');
    }

    $ext = strtolower(pathinfo($absPath, PATHINFO_EXTENSION));
    $mimeMap = [
        'pdf'  => 'application/pdf',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png'  => 'image/png',
        'doc'  => 'application/msword',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    $mime = $mimeMap[$ext] ?? 'application/octet-stream';

    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($absPath));
    header('Cache-Control: private, max-age=3600');
    readfile($absPath);
    exit;
}

function verifyEmailToken(string $token): never
{
    if ($token === '') {
        http_response_code(400);
        showVerifyPage(false, 'Token de verificacao em falta ou invalido.');
        exit;
    }
    try {
        $db = new PDO('sqlite:' . __DIR__ . DIRECTORY_SEPARATOR . 'rh_manager.sqlite');
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $stmt = $db->prepare('SELECT id, username FROM users WHERE verify_token = :t AND verified = 0 LIMIT 1');
        $stmt->execute([':t' => $token]);
        $user = $stmt->fetch();
        if (!$user) {
            showVerifyPage(false, 'Este link e invalido ou ja foi utilizado.');
            exit;
        }
        $db->prepare('UPDATE users SET verified = 1, verify_token = NULL WHERE id = :id')
           ->execute([':id' => $user['id']]);
        showVerifyPage(true, 'O seu email foi verificado com sucesso, <strong>' . htmlspecialchars((string)$user['username']) . '</strong>! Ja pode iniciar sessao.');
    } catch (\Throwable $e) {
        error_log('verifyEmailToken error: ' . $e->getMessage());
        showVerifyPage(false, 'Ocorreu um erro interno. Por favor, contacte o administrador.');
    }
    exit;
}

function showVerifyPage(bool $success, string $message): void
{
    $color = $success ? '#1D6A39' : '#C0392B';
    $title = $success ? 'Email verificado' : 'Verificacao falhou';
    echo '<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>' . $title . '</title>
<style>body{font-family:Segoe UI,sans-serif;background:#f5f7fa;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.box{background:white;border-radius:14px;padding:40px;max-width:460px;width:90%;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.1)}h2{color:' . $color . ';margin:0 0 14px;font-size:22px}p{color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px}a{display:inline-block;padding:10px 24px;background:#1a5276;color:white;border-radius:8px;text-decoration:none;font-weight:600}</style>
</head><body><div class="box"><h2>' . $title . '</h2><p>' . $message . '</p><a href="./index.html">Ir para o login</a></div></body></html>';
}

// Tenta usar o host pelo qual o utilizador chegou ao site (HTTP_HOST) — assim
// os links funcionam tanto em localhost como na rede interna (192.168.x.x ou hostname).
// Cai para config.app.url quando o pedido não vem de HTTP (ex.: backup_cron).
function appBaseUrl(): string
{
    $host = $_SERVER['HTTP_HOST'] ?? '';
    if ($host !== '') {
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
              || (($_SERVER['SERVER_PORT'] ?? '') === '443');
        $scheme = $https ? 'https' : 'http';
        return $scheme . '://' . $host;
    }
    $fallback = $GLOBALS['app_config']['app']['url'] ?? 'http://localhost';
    return rtrim($fallback, '/');
}

function sendVerificationEmail(string $email, string $username, string $token): bool
{
    $config  = $GLOBALS['app_config'] ?? [];
    $smtp    = $config['smtp']        ?? [];
    $appUrl  = appBaseUrl();

    if (empty($smtp['username']) || empty($smtp['password'])) {
        error_log("SMTP nao configurado — email de verificacao nao enviado para {$email}");
        return false;
    }

    $verifyLink = $appUrl . '/api.php?action=verify_email&token=' . urlencode($token);
    $appName    = htmlspecialchars((string)($smtp['from_name'] ?? 'HR Manager'));
    $userEsc    = htmlspecialchars($username);

    $html = '<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><style>
body{font-family:Segoe UI,sans-serif;background:#f5f7fa;margin:0;padding:20px}
.wrap{max-width:520px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}
.hd{background:linear-gradient(135deg,#1C2833,#2E4053);padding:28px;text-align:center;color:white}
.hd h1{margin:0;font-size:18px;font-weight:700;letter-spacing:1px}
.hd p{margin:4px 0 0;font-size:11px;opacity:.5}
.bd{padding:28px}.bd p{color:#374151;font-size:14px;line-height:1.7;margin:0 0 16px}
.btn{display:inline-block;padding:12px 28px;background:#1a5276;color:white;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px}
.note{margin-top:20px;padding:12px 16px;background:#f5f7fa;border-radius:8px;font-size:12px;color:#6b7280}
.foot{padding:16px 28px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}
</style></head><body><div class="wrap">
<div class="hd"><h1>' . strtoupper($appName) . '</h1><p>Gestao de Recursos Humanos</p></div>
<div class="bd">
<p>Ola, <strong>' . $userEsc . '</strong>!</p>
<p>Foi criada uma conta para si no sistema de RH. Para activar a sua conta, clique no botao abaixo:</p>
<p style="text-align:center"><a href="' . $verifyLink . '" class="btn">Verificar email e activar conta</a></p>
<div class="note">Se nao reconhece este email, pode ignora-lo com seguranca.<br>Este link e valido para uma unica utilizacao.</div>
</div>
<div class="foot">' . $appName . ' &middot; Email automatico, nao responda.</div>
</div></body></html>';

    try {
        $mailer = new Mailer($smtp);
        $mailer->send($email, $username, "Verifique o seu email — {$appName}", $html);
        return true;
    } catch (\Throwable $e) {
        error_log("sendVerificationEmail falhou para {$email}: " . $e->getMessage());
        return false;
    }
}

function sendPasswordResetEmail(string $email, string $username, string $token): bool
{
    $config = $GLOBALS['app_config'] ?? [];
    $smtp   = $config['smtp']        ?? [];
    $appUrl = appBaseUrl();

    if (empty($smtp['username']) || empty($smtp['password'])) {
        error_log("SMTP nao configurado — email de reset nao enviado para {$email}");
        return false;
    }

    $resetLink = $appUrl . '/index.html#reset=' . urlencode($token);
    $appName   = htmlspecialchars((string)($smtp['from_name'] ?? 'HR Manager'));
    $userEsc   = htmlspecialchars($username);

    $html = '<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><style>
body{font-family:Segoe UI,sans-serif;background:#f5f7fa;margin:0;padding:20px}
.wrap{max-width:520px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}
.hd{background:linear-gradient(135deg,#1C2833,#2E4053);padding:28px;text-align:center;color:white}
.hd h1{margin:0;font-size:18px;font-weight:700;letter-spacing:1px}
.hd p{margin:4px 0 0;font-size:11px;opacity:.5}
.bd{padding:28px}.bd p{color:#374151;font-size:14px;line-height:1.7;margin:0 0 16px}
.btn{display:inline-block;padding:12px 28px;background:#c0392b;color:white;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px}
.note{margin-top:20px;padding:12px 16px;background:#fef4e7;border-left:3px solid #e67e22;border-radius:6px;font-size:12px;color:#92400e}
.foot{padding:16px 28px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}
</style></head><body><div class="wrap">
<div class="hd"><h1>RECUPERAR PASSWORD</h1><p>' . $appName . '</p></div>
<div class="bd">
<p>Ola, <strong>' . $userEsc . '</strong>!</p>
<p>Recebemos um pedido para repor a sua password. Para definir uma nova, clique no botao abaixo:</p>
<p style="text-align:center"><a href="' . $resetLink . '" class="btn">Definir nova password</a></p>
<div class="note"><strong>Importante:</strong> o link e valido por 1 hora. Se nao foi voce que pediu, ignore este email — a sua password actual continua activa.</div>
</div>
<div class="foot">' . $appName . ' &middot; Email automatico, nao responda.</div>
</div></body></html>';

    try {
        $mailer = new Mailer($smtp);
        $mailer->send($email, $username, "Recuperar password — {$appName}", $html);
        return true;
    } catch (\Throwable $e) {
        error_log("sendPasswordResetEmail falhou para {$email}: " . $e->getMessage());
        return false;
    }
}

function sendAdminActionCodeEmail(string $email, string $username, string $code, string $description): bool
{
    $config = $GLOBALS['app_config'] ?? [];
    $smtp   = $config['smtp']        ?? [];

    if (empty($smtp['username']) || empty($smtp['password'])) {
        error_log("SMTP nao configurado — codigo admin nao enviado para {$email}");
        return false;
    }

    $appName = htmlspecialchars((string)($smtp['from_name'] ?? 'HR Manager'));
    $userEsc = htmlspecialchars($username);
    $descEsc = htmlspecialchars($description);

    $html = '<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><style>
body{font-family:Segoe UI,sans-serif;background:#f5f7fa;margin:0;padding:20px}
.wrap{max-width:480px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}
.hd{background:linear-gradient(135deg,#7B1820,#9b2335);padding:24px;text-align:center;color:white}
.hd h1{margin:0;font-size:16px;font-weight:700;letter-spacing:1px}
.bd{padding:28px;text-align:center}
.code{display:inline-block;font-family:Consolas,monospace;font-size:34px;font-weight:800;letter-spacing:8px;color:#1a0d0d;background:#fef4e7;padding:18px 28px;border-radius:10px;margin:14px 0;border:2px dashed #e67e22}
.bd p{color:#374151;font-size:14px;line-height:1.7;margin:8px 0}
.note{margin-top:16px;padding:10px 14px;background:#fef4e7;border-radius:6px;font-size:11px;color:#92400e}
.foot{padding:14px 24px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center}
</style></head><body><div class="wrap">
<div class="hd"><h1>CODIGO DE AUTORIZACAO</h1></div>
<div class="bd">
<p>Ola, <strong>' . $userEsc . '</strong>.</p>
<p>Para confirmar a acção <strong>' . $descEsc . '</strong>, insira este código no site:</p>
<div class="code">' . htmlspecialchars($code) . '</div>
<p style="font-size:11px;color:#9ca3af">Válido por 10 minutos.</p>
<div class="note">Se não foi você que iniciou esta ação, ignore — o código expira sozinho.</div>
</div>
<div class="foot">' . $appName . ' &middot; Email automático, não responda.</div>
</div></body></html>';

    try {
        $mailer = new Mailer($smtp);
        $mailer->send($email, $username, "Código de autorização — {$appName}", $html);
        return true;
    } catch (\Throwable $e) {
        error_log("sendAdminActionCodeEmail falhou para {$email}: " . $e->getMessage());
        return false;
    }
}

function seedDefaultUsers(PDO $db): void
{
    if ((int)$db->query('SELECT COUNT(*) FROM users')->fetchColumn() > 0) return;

    $defaults = $GLOBALS['app_config']['default_users'] ?? [];
    if (!is_array($defaults) || empty($defaults)) return;

    $stmt = $db->prepare(
        'INSERT INTO users (username, email, password_hash, role, verified, created_at, created_by)
         VALUES (:u, :e, :p, :r, 1, :c, :cb)'
    );
    foreach ($defaults as $u) {
        if (empty($u['email']) || empty($u['password'])) continue;
        $stmt->execute([
            ':u'  => (string)($u['name'] ?? $u['email']),
            ':e'  => strtolower(trim((string)$u['email'])),
            ':p'  => password_hash((string)$u['password'], PASSWORD_DEFAULT),
            ':r'  => in_array($u['role'] ?? '', ['ADMIN','EDITOR','READER'], true) ? $u['role'] : 'READER',
            ':c'  => date('c'),
            ':cb' => 'Sistema (seed)',
        ]);
    }
}