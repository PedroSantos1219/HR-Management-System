# Changelog

Notable changes since the project was brought under version control. Format
loosely follows [Keep a Changelog](https://keepachangelog.com/).

## Unreleased

### Added
- First-run setup wizard for the initial admin account, with an SMTP
  status banner.
- Office LAN deployment guide at `docs/DEPLOY.md`.
- Hardening checklist at `docs/SECURITY.md` covering NTFS permissions,
  off-site backup, HTTPS and subnet restriction.
- Login rate-limit: 5 failed attempts per IP every 5 minutes triggers
  a temporary block.
- Defensive security headers in `.htaccess` (X-Frame-Options,
  X-Content-Type-Options, Referrer-Policy) and a commented-out
  `Require ip` block ready to enable for LAN-only access.
- GitHub Actions workflow that runs `php -l` on every PHP change.
- CI and license badges in the README.
- MIT `LICENSE` file.
- This `CHANGELOG.md`.
- `config['companies']`: the list of operating entities (name, slug,
  color, `isFabril` flag) now drives every dropdown, chart, filter pill
  and PDF header. Loaded into the frontend on `check_session`/`login`
  via `initCompanies()`.
- `config['excel_files']`: filenames of the Excel templates served by
  the Excel Manager — out of the codebase now.
- `docs/screenshots/` with seven captures of a fictional dataset
  (anonymised as `Empresa 1–4`). Linked from the README in both EN and
  PT sections.

### Changed
- README rewritten in English with a short Portuguese summary.
- `config.example.php` rewritten in English; `default_users` is now
  optional because the setup wizard handles first-run.
- Email templates no longer contain decorative unicode emoji — plain
  text headings render cleanly in Outlook and other strict clients.
- Dashboard hides SEF, seniority bonuses, driving licences and ADR cards
  when the company filter targets a factory-only company (`isFabril`).
- Product renamed to **HR Management** across titles, header logo, PDF
  footers and email subjects.
- Generic placeholder logo (SVG) in `css/assets/Logo-header.svg`.
- Hardcoded `'Pit Evolution'` checks replaced by the `isFabril` flag
  read from `APP_COMPANIES`.

### Refactored
- index.html went from one giant file to a thin shell that loads
  numbered JSX modules. Extracted in order:
  - `js/04-dashboard.js`
  - `js/05-ferias.js`
  - `js/06-contratos.js`
  - `js/07-relatorios.js`
  - `js/08-training.js`
  - `js/09-epi.js`
  - `js/10-farda.js`
  - `js/11-admin.js` (users, backups, security logs)
  - `js/12-employees.js`
  - `js/13-docs.js` (employee document tab)

### Fixed
- API returns a clear 503 with a JSON message when `config.php` is
  missing, instead of failing later with an opaque PHP notice.

### Removed
- Hard-coded `forceActive` migration for legacy IDs in
  `applyDataMigrations()` — it was undoing manual deactivations every
  time the page loaded.

## 2026-05-21 — Initial commit

Project brought under git after several months of in-place development
on the office server. Split into three commits for clarity:

- Project setup (gitignore, .htaccess, README, config example)
- PHP backend (api, security, mailer, backup_cron)
- React SPA frontend with modular CSS/JS
