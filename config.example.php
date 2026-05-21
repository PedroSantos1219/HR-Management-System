<?php

// Copiar para config.php e preencher. config.php está no .gitignore.

return [

    'smtp' => [
        'host'      => 'smtp.gmail.com',
        'port'      => 587,
        'security'  => 'tls',                       // 'tls' | 'ssl' | ''
        'username'  => 'rh@exemplo.com',
        'password'  => 'app-password-aqui',
        'from'      => 'rh@exemplo.com',
        'from_name' => 'RH Manager',
    ],

    'app' => [
        // URL base — usado nos links de verificação enviados por email.
        'url' => 'http://localhost',
    ],

    // Emails com privilégios de super-administrador (em minúsculas).
    // Só estes podem aceder aos Logs de Segurança e revogar sessões.
    'super_admins' => [
        'admin@exemplo.com',
    ],

    // Utilizadores criados automaticamente na primeira execução (BD vazia).
    // Após o primeiro arranque, podem ser geridos pela interface.
    // Pode deixar vazio e criar manualmente o primeiro admin via SQL.
    'default_users' => [
        ['name' => 'Administrador',  'email' => 'admin@exemplo.com',  'password' => 'CHANGE_ME', 'role' => 'ADMIN'],
    ],

];
