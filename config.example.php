<?php

// Copy this file to config.php and fill in your values.
// config.php is in .gitignore — never commit it.

return [

    'smtp' => [
        'host'      => 'smtp.gmail.com',
        'port'      => 587,
        'security'  => 'tls',                       // 'tls' | 'ssl' | ''
        'username'  => 'rh@example.com',
        'password'  => 'gmail-app-password-here',   // Gmail: generate at myaccount.google.com/apppasswords
        'from'      => 'rh@example.com',
        'from_name' => 'HR Management',
    ],

    'app' => [
        // Base URL used in verification and password reset emails.
        // The backend also auto-detects this from the request host, so this is
        // mainly a safety net for scripts that run outside a browser (e.g. cron).
        'url' => 'http://localhost',
    ],

    // 'name' is what gets stored in employees.company and shown in the UI.
    // 'key' is the slug used in the filter pills. 'isFabril' marks a company
    // with no driving rules (no SEF, no CAM, no tachograph card).
    'companies' => [
        ['key' => 'emp1', 'name' => 'Empresa 1', 'color' => '#9b2335', 'isFabril' => false],
        ['key' => 'emp2', 'name' => 'Empresa 2', 'color' => '#9b2335', 'isFabril' => false],
        ['key' => 'emp3', 'name' => 'Empresa 3', 'color' => '#1A5276', 'isFabril' => false],
        ['key' => 'emp4', 'name' => 'Empresa 4', 'color' => '#4B5320', 'isFabril' => true ],
    ],

    // Nomes dos ficheiros Excel originais (na raiz do servidor). Usados
    // pelo Gestor Excel para servir downloads/templates.
    'excel_files' => [
        'main'   => 'BASE DE DADOS.xlsm',
        'fabril' => 'BASE DE DADOS - FABRIL.xlsx',
        'ferias' => 'MARCACAO DE FERIAS.xlsx',
    ],

    // Emails (lowercase) with super-admin privileges: can see Security Logs
    // and revoke other users' sessions. Regular admins cannot.
    'super_admins' => [
        'admin@example.com',
    ],

    // Optional. Leave empty and use the in-browser setup wizard on first run
    // instead — it appears whenever the database has no users yet and asks
    // for the initial admin's email/password.
    //
    // Useful when scripting a deploy or restoring on a new machine:
    //   ['name' => 'Admin', 'email' => 'admin@example.com', 'password' => 'change-me', 'role' => 'ADMIN'],
    'default_users' => [],

];
