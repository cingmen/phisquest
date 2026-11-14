"""Konfigurasi pytest server: jangan membuat database default saat impor."""

import os

os.environ["PQ_SKIP_DEFAULT_APP"] = "1"
