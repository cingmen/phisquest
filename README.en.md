# 🎣 PhishQuest

> **Spot the bait before you get hooked.**

PhishQuest is an Indonesian-language anti-phishing education game. Players read simulated
emails, SMS, and WhatsApp messages — a suspicious Rp2,400,000 bank transaction, a held
parcel, a fake scholarship — then decide whether the message is **phishing or legit**,
pick the **best action**, or **point at the red flag**. Every answer returns instant
feedback: highlighted red flags, a plain-language explanation, and how to verify safely.

One JSON content source powers two interfaces: a **static web app** (no framework, no
build step) and a **Python CLI** built with Rich.

[Dokumentasi Bahasa Indonesia](README.md) · [PRD](docs/PRD.md) ·
[API spec](docs/api-specification.md)

---

![PhishQuest demo: pick a pack, read the message, answer, see the feedback](docs/assets/web-demo.gif)

## Play

### Web

**Live demo:** <https://cingmen.github.io/phisquest/>

Run locally:

```bash
python -m http.server 8000
# open http://localhost:8000/web/
```

Pure HTML/CSS/JS. No bundler, no JS dependencies (only Google Fonts). The GitHub Pages
workflow assembles `web/` plus `content/` on every push to `main`.

### CLI

```bash
pipx install ./cli
phishquest play --pack ewallet-bank
phishquest stats
phishquest badges
```

Progress lives in `~/.phishquest/progress.json`, written atomically. Nothing is sent
over the network.

## Content

Four packs × ten scenarios: 🏦 E-Wallet & Bank, 🏢 Office Life, 📦 Shopping & Courier,
🎓 Campus & Government. All messages use fictional brands (BankNusa, DompetKu, TokoKilat,
KargoCepat, KampusNusantara, SIBANTAR, AsurKita, LapakRia) and cover all 12 red-flag
categories.

> For v1.0 the game content and UI are Indonesian by design (D4 in the PRD); English UI
> strings are planned for v2.

## Scoring

Correct answer +10 XP, streak bonus `min((streak−1)×2, 10)`, wrong answer 0 XP and the
streak resets. Five levels at 0 / 100 / 250 / 450 / 650 XP and ten badges. The rules live
in `cli/src/phishquest/engine.py` and `web/js/engine.js`, which are held to the same
shared golden fixture (`tests/fixtures/golden.json`).

## Development

```bash
python scripts/validate_content.py content/
pip install -e "cli/[test]"
ruff check --config cli/pyproject.toml cli/ scripts/ tests/
python -m pytest tests/
node --test web/test/*.test.js
```

## Ethics & legal

> PhishQuest is an educational simulation. Every email, brand, and domain in it is
> fictional. No data is collected.

- Never sends real email/SMS/WhatsApp messages and never harvests credentials.
- No accounts, no tracking cookies, no analytics; progress stays on the device.
- Content teaches recognition only — it is not a phishing template.
- MIT licensed, aligned with Indonesia's ITE Law and PDP Law No. 27/2022 (data
  minimization, no data leaves the device).
