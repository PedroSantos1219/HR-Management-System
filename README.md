# RH Manager

App interna de gestão de RH para uma empresa de transportes. Gere colaboradores, contratos, documentos, EPIs, fardas, formação, férias, medicina do trabalho, SEF e cartas de condução em várias empresas a partir da mesma instalação.

Corre em XAMPP local, pensada para um servidor da empresa em rede interna.

## Stack

- React 18 via CDN + Babel Standalone, JSX inline em `index.html`. Sem build.
- PHP 8.1+ com PDO SQLite. Sem Composer.
- SQLite num ficheiro só, com backup diário e restauro pela UI.
- SMTP próprio em `mailer.php` (STARTTLS ou SSL directo).
- CSS modular em `css/`.

## Setup
```
cd C:\xampp\htdocs
git clone <repo> <pasta>
cd <pasta>
cp config.example.php config.php
```

Edita `config.php` (SMTP, super_admins, default_users) e abre a pasta no browser via XAMPP. Os utilizadores em `default_users` são criados na primeira execução.

Para o backup diário, agendar no Task Scheduler:

```
C:\xampp\php\php.exe "<caminho>\backup_cron.php"
```

Se a tarefa falhar, há um fallback no `api.php` que cria o backup no primeiro login do dia.

## Estrutura

```
index.html              SPA React (JSX in-browser)
api.php                 endpoints POST/GET
security.php            CSRF, headers, sessões, screenshots
mailer.php              cliente SMTP
backup_cron.php         backup diário
excel_manager.html      exportação Excel
config.example.php      template
css/                    base, layout, components, modules
uploads/                docs por colaborador
backups/                snapshots SQLite
```

`config.php`, `rh_manager.sqlite`, `uploads/` e `backups/` estão no `.gitignore`.

## Notas

- Sem build: o JSX compila no browser via Babel Standalone. Inicial pesa, mas evita pipeline.
- Estado global no componente `App`. `useState` chega.
- `applyDataMigrations()` no api.php corrige inconsistências antigas no momento de gravar/ler.
- No restauro de backup é fechada a ligação à BD antes da cópia (file-locking do Windows).
