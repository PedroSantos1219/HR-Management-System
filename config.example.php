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
        'from_name' => 'RH Manager',
    ],

    'app' => [
        // Base URL used in verification and password reset emails.
        // The backend also auto-detects this from the request host, so this is
        // mainly a safety net for scripts that run outside a browser (e.g. cron).
        'url' => 'http://localhost',
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
