# Changelog

Notable changes since the project was brought under version control. Format
loosely follows [Keep a Changelog](https://keepachangelog.com/).

## Unreleased

### Added
- Dashboard component lives in its own file (`js/04-dashboard.js`).
- Dashboard hides SEF, seniority bonuses, driving licences and ADR cards
  when the company filter is set to Pit Evolution.
- First-run setup wizard for the initial admin account, with an SMTP
  status banner.
- Office LAN deployment guide at `docs/DEPLOY.md`.
- GitHub Actions workflow that runs `php -l` on every PHP change.
- CI and license badges in the README.

### Changed
- README rewritten in English with a short Portuguese summary.
- `config.example.php` rewritten in English; `default_users` is now
  optional because the setup wizard handles first-run.
- Email templates no longer contain decorative unicode emoji — plain
  text headings render cleanly in Outlook and other strict clients.

### Removed
- Hard-coded `forceActive` migration for legacy Arlize IDs in
  `applyDataMigrations()` — it was undoing manual deactivations every
  time the page loaded.

## 2026-05-21 — Initial commit

Project brought under git after several months of in-place development
on the office server. Split into three commits for clarity:

- Project setup (gitignore, .htaccess, README, config example)
- PHP backend (api, security, mailer, backup_cron)
- React SPA frontend with modular CSS/JS
