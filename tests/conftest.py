"""Konfigurasi pytest: paket CLI dan validator dapat diimpor tanpa instalasi."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "cli" / "src"
SCRIPTS = ROOT / "scripts"

for candidate in (SRC, SCRIPTS):
    if str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))
