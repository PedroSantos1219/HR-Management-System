# HR Management

[![PHP lint](https://github.com/PedroSantos1219/HR-Management-System/actions/workflows/php-lint.yml/badge.svg)](https://github.com/PedroSantos1219/HR-Management-System/actions/workflows/php-lint.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

In-house HR app for a group of companies managed by a single HR team.
Geared towards road-transport operators — alongside the usual staff,
contracts, vacations and uniform tracking, it also handles the things
that only matter on the transport side: **SEF declarations, driving
licences, CAM/CQC, tachograph cards, ADR** and recurring training.

Multi-company by design: the list of companies (and their colors) lives
in `config.php`, so the same install drives one HR team across several
operating entities. One of them can be flagged as `isFabril` to skip
the driver-only rules (CAM, tachograph, ADR, SEF).

![Dashboard](docs/screenshots/01-dashboard.png)

## Screenshots

| Dashboard | Employees |
|---|---|
| ![Dashboard](docs/screenshots/01-dashboard.png) | ![Employees](docs/screenshots/02-colaboradores.png) |

| New employee | Seniority bonuses |
|---|---|
| ![New employee](docs/screenshots/03-novo-colaborador.png) | ![Seniority bonuses](docs/screenshots/04-diuturnidades.png) |

| Birthdays | Contracts |
|---|---|
| ![Birthdays](docs/screenshots/05-aniversarios.png) | ![Contracts](docs/screenshots/06-contratos.png) |

| Users |
|---|
| ![Users](docs/screenshots/07-utilizadores.png) |

Captures show a fictional dataset (companies anonymised as "Empresa 1–4"
and employees generated at random).

## Stack

- React 18 + Babel Standalone loaded straight from a CDN. JSX is
  compiled in the browser — there is no build step on purpose.
- PHP 8.1+ with PDO SQLite. No Composer, no framework.
- SQLite in a single file, with a daily backup task and a restore button
  in the UI.
- A small SMTP client in `mailer.php` (STARTTLS or implicit SSL). Used
  for account verification, password reset and admin 2FA codes.
- CSS split into base / layout / components / modules under `css/`.

## Local setup

```
cd C:\xampp\htdocs
git clone https://github.com/PedroSantos1219/HR-Management-System.git
cd HR-Management-System
copy config.example.php config.php
```

Open `config.php` and fill in:

- SMTP credentials
- `super_admins` (emails that can revoke sessions and see security logs)
- `default_users` (optional seed for first run — the in-browser setup
  wizard also handles it)
- `companies` (the list of operating entities the HR team manages)
- `excel_files` (file names of the Excel templates on the server, if you
  use the Excel manager)

To make the daily backup happen automatically, schedule the script in
Windows Task Scheduler:

```
C:\xampp\php\php.exe "<full path>\backup_cron.php"
```

If that task ever fails, `api.php` has a fallback that creates the
backup on the first login of the day.

For the full office LAN setup (static IP, firewall, restoring across
machines) see [`docs/DEPLOY.md`](./docs/DEPLOY.md). Before opening the
server to the rest of the office, read [`docs/SECURITY.md`](./docs/SECURITY.md) —
the NTFS permissions section in particular.

## Modules

- **Dashboard** — KPIs per company, expiring documents, driver availability
- **Employees** — full record, documents, training history, EPI/uniform
- **SEF / Border declarations** — validity tracking with WhatsApp share
- **Occupational medicine** — last exam, next due date, notes
- **Seniority bonuses (diuturnidades)** — automatic count under CCT
- **Driving licences + CAM/CQC + tachograph + ADR**
- **Training** — internal/external, by employee or by session
- **PPE (EPIs) and uniforms** — issuance + stock
- **Vacations** — annual map + per-employee sheet + PDF
- **Contracts** — type, status, trial end, second-contract end
- **Birthdays + WhatsApp share**
- **Reports** — multi-section PDF (admin only)
- **Audit log + security log + active sessions + backups**

## Project layout

```
index.html             React SPA — dashboard, employees, modules, PDFs
api.php                POST/GET endpoints, all server-side logic
security.php           CSRF, security headers, sessions, screenshots
mailer.php             minimal SMTP client
backup_cron.php        daily backup runner
excel_manager.html     standalone Excel export tool
config.example.php     template — copy to config.php
css/                   base, layout, components, modules
js/                    helpers and screens extracted from index.html
uploads/               documents uploaded by users (gitignored)
backups/               SQLite snapshots (gitignored)
```

`config.php`, `rh_manager.sqlite`, `uploads/` and `backups/` are
gitignored. So is the `EXCEL/` folder with company data.

## Notes worth knowing

- **No build step**: the first page load is heavier (Babel compiles JSX
  on the fly) but it avoids a whole pipeline. Trade-off was made on
  purpose for a small in-house tool.
- **Global state lives in the `App` component**. Plain `useState` is
  enough — there is no Redux or Zustand and there shouldn't be.
- **Optimistic locking on `save_data`**: every write checks
  `__dataVersion__` against the last value the client saw. If two people
  edit at the same time, the second `save` is rejected and the page
  reloads with a clear message rather than silently overwriting.
- **Backup restore closes the SQLite connection before the file copy**
  because Windows holds an exclusive lock on the file otherwise.
- **Daily migration in `applyDataMigrations()`** quietly cleans up
  legacy inconsistencies from older Excel imports each time data is
  loaded or saved.

## License

MIT — see [`LICENSE`](./LICENSE).

---

### 🇵🇹 Resumo

Aplicação interna de RH para um grupo de empresas geridas pelo mesmo
departamento de Recursos Humanos. Pensada para o sector dos transportes
— além dos campos típicos (colaboradores, contratos, férias, fardas)
trata também das validades específicas dessa actividade: **declarações
SEF, cartas de condução, CAM/CQC, cartão tacógrafo, ADR** e formação
contínua.

Multi-empresa por configuração: a lista de empresas vive em
`config.php`, a mesma instalação serve várias entidades operacionais. A
flag `isFabril` numa empresa esconde os campos que só fazem sentido em
transportadoras (CAM, tacógrafo, ADR, SEF).

Stack: PHP 8 + SQLite + React 18 via CDN (Babel in-browser, sem build
step). Edita o `config.php` (SMTP, super_admins, default_users,
empresas, ficheiros Excel) e abre no browser via XAMPP.

#### Capturas

| Dashboard | Colaboradores |
|---|---|
| ![Dashboard](docs/screenshots/01-dashboard.png) | ![Colaboradores](docs/screenshots/02-colaboradores.png) |

| Novo Colaborador | Diuturnidades |
|---|---|
| ![Novo Colaborador](docs/screenshots/03-novo-colaborador.png) | ![Diuturnidades](docs/screenshots/04-diuturnidades.png) |

| Aniversários | Contratos |
|---|---|
| ![Aniversários](docs/screenshots/05-aniversarios.png) | ![Contratos](docs/screenshots/06-contratos.png) |

| Utilizadores |
|---|
| ![Utilizadores](docs/screenshots/07-utilizadores.png) |
