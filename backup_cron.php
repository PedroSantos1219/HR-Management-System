<?php

declare(strict_types=1);

// Backup diário. Agendar no Task Scheduler.

const BACKUPS_DIR = __DIR__ . DIRECTORY_SEPARATOR . 'backups';
const KEEP_DAYS   = 30;

if (!is_dir(BACKUPS_DIR)) { @mkdir(BACKUPS_DIR, 0755, true); }

$src = __DIR__ . DIRECTORY_SEPARATOR . 'rh_manager.sqlite';
if (!is_file($src)) {
    fwrite(STDERR, '[' . date('c') . "] Erro: rh_manager.sqlite não encontrado em {$src}\n");
    exit(1);
}

$name = 'rh_backup_' . date('Y-m-d') . '_' . date('His') . '.sqlite';
$dst  = BACKUPS_DIR . DIRECTORY_SEPARATOR . $name;

if (!@copy($src, $dst)) {
    fwrite(STDERR, '[' . date('c') . "] Erro: falha ao copiar para {$dst}\n");
    exit(1);
}
@file_put_contents($dst . '.note.txt', 'Backup automático diário (23:58) — ' . date('d-m-y')); 

$cutoff = time() - KEEP_DAYS * 86400;
foreach (glob(BACKUPS_DIR . DIRECTORY_SEPARATOR . 'rh_backup_*.sqlite') ?: [] as $f) {
    if (filemtime($f) < $cutoff) {
        @unlink($f);
        @unlink($f . '.note.txt');
    }
}

echo '[' . date('c') . "] Backup criado: {$name} (" . number_format(filesize($dst) / 1024, 1) . " KB)\n";
exit(0);
