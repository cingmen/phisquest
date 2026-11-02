"""Antarmuka perintah PhishQuest (argparse + Rich)."""

from __future__ import annotations

import argparse
import time
from pathlib import Path

from . import __version__, engine, leaderboard, storage, ui
from .content import default_content_dir, load_manifest, load_pack
from .models import (
    TIME_LIMIT_MS,
    ContentError,
    PhishQuestError,
    Progress,
    Scenario,
    now_iso,
)

MIN_QUESTIONS = 5
MAX_QUESTIONS = 10
QUIT_TOKENS = ("Q", "KELUAR", "EXIT")


def build_parser() -> argparse.ArgumentParser:
    """Susun parser argparse dengan seluruh subcommand.

    Returns:
        Parser siap dipakai.
    """
    parser = argparse.ArgumentParser(
        prog="phishquest",
        description="Game edukasi anti-phishing berbahasa Indonesia. Semua konten fiktif.",
    )
    parser.add_argument(
        "--content",
        type=Path,
        default=None,
        help="direktori konten alternatif (default: paket bawaan atau ./content)",
    )
    subparsers = parser.add_subparsers(dest="command")

    play = subparsers.add_parser("play", help="mainkan satu sesi")
    play.add_argument("--pack", dest="pack_id", default=None, help="id pack; kosong = Campur")
    play.add_argument("--difficulty", choices=["mudah", "sedang", "sulit"], default=None)
    play.add_argument("--jumlah", type=int, default=10, help="jumlah soal (5–10, default 10)")
    play.add_argument("--seed", type=int, default=None, help="seed agar urutan soal dapat diulang")
    play.add_argument(
        "--mode",
        choices=["classic", "time-attack"],
        default="classic",
        help="classic (default) atau time-attack (20 detik per soal + bonus kecepatan)",
    )

    subparsers.add_parser("packs", help="daftar pack dan best score")
    subparsers.add_parser("stats", help="statistik pemain")
    subparsers.add_parser("badges", help="daftar lencana")
    subparsers.add_parser("leaderboard", help="papan skor lokal perangkat ini")

    export = subparsers.add_parser("export", help="ekspor progres ke JSON")
    export.add_argument("path", nargs="?", default=None, help="tujuan ekspor")

    reset = subparsers.add_parser("reset", help="hapus progres pemain")
    reset.add_argument("--yes", action="store_true", help="lewati konfirmasi")

    subparsers.add_parser("version", help="tampilkan versi")
    return parser


def _content_dir(args: argparse.Namespace) -> Path:
    if args.content is not None:
        return Path(args.content)
    return default_content_dir()


def _pack_label(packs: list) -> str:
    return packs[0].name if len(packs) == 1 else "Campur Semua"


def _ask_answer(scenario: Scenario) -> str:
    """Minta jawaban pemain sampai valid.

    Args:
        scenario: Skenario aktif.

    Returns:
        ``PHISH``/``LEGIT`` atau id opsi.
    """
    if scenario.type == "phish_or_legit":
        prompt = "[bold yellow]Phishing atau Legit? [P/L]: [/bold yellow]"
        while True:
            raw = ui.console.input(prompt).strip().upper()
            if raw in ("P", "PHISH"):
                return "PHISH"
            if raw in ("L", "LEGIT"):
                return "LEGIT"
            if raw in QUIT_TOKENS:
                raise KeyboardInterrupt
            ui.console.print("[red]Ketik P untuk phishing atau L untuk legit.[/red]")
    valid = [str(option.get("id")) for option in (scenario.options or [])]
    prompt = f"[bold yellow]Pilih opsi ({'/'.join(valid)}): [/bold yellow]"
    while True:
        raw = ui.console.input(prompt).strip().upper()
        if raw in valid:
            return raw
        if raw in QUIT_TOKENS:
            raise KeyboardInterrupt
        ui.console.print("[red]Pilihan tidak dikenal, coba salah satu id opsi.[/red]")


def _run_session(
    packs: list,
    *,
    count: int,
    difficulty: str | None,
    seed: int | None,
    progress: Progress,
    mode: str = "classic",
) -> int:
    """Jalankan satu sesi penuh dari soal pertama sampai recap."""
    engine_mode = "time_attack" if mode == "time-attack" else "classic"
    session = engine.start_session(
        packs,
        count=count,
        difficulty=difficulty,
        seed=seed,
        progress=progress,
        mode=engine_mode,
    )
    total = len(session.scenarios)
    label = _pack_label(packs)
    ui.print_disclaimer()
    while engine.has_next(session):
        scenario = engine.current(session)
        assert scenario is not None
        remaining = int(TIME_LIMIT_MS / 1000) if engine_mode == "time_attack" else None
        ui.render_header(
            label,
            session.index + 1,
            total,
            session.score,
            progress,
            session.streak,
            remaining,
        )
        ui.render_message(scenario)
        ui.render_question(scenario)
        started = time.monotonic()
        option_id = _ask_answer(scenario)
        elapsed_ms = int((time.monotonic() - started) * 1000)
        result = engine.answer(session, option_id, elapsed_ms=elapsed_ms)
        ui.render_feedback(result)
        storage.save_progress(progress)
        if engine.has_next(session):
            ui.console.input("[dim]↳ Enter untuk lanjut…[/dim]")

    summary = engine.summary(session)
    storage.save_progress(progress)
    entry = leaderboard.make_entry(
        score=summary.score,
        max_score=summary.max_score,
        accuracy=summary.accuracy,
        pack_id=summary.pack_id,
        mode=summary.mode,
        at=now_iso(),
    )
    entries, rank = storage.record_entry(entry)
    ui.render_recap(summary, progress, entries, rank)
    ui.print_disclaimer()
    return 0


def cmd_play(args: argparse.Namespace) -> int:
    """Handler subcommand ``play``."""
    if not MIN_QUESTIONS <= args.jumlah <= MAX_QUESTIONS:
        ui.console.print(
            f"[red]--jumlah harus {MIN_QUESTIONS}–{MAX_QUESTIONS}, bukan {args.jumlah}.[/red]"
        )
        return 2
    progress = storage.load_progress() or Progress()
    packs = load_pack(_content_dir(args), args.pack_id)
    return _run_session(
        packs,
        count=args.jumlah,
        difficulty=args.difficulty,
        seed=args.seed,
        progress=progress,
        mode=args.mode,
    )


def cmd_packs(args: argparse.Namespace) -> int:
    """Handler subcommand ``packs``."""
    manifest = load_manifest(_content_dir(args))
    progress = storage.load_progress() or Progress()
    ui.render_packs(manifest.packs, progress)
    return 0


def cmd_stats(args: argparse.Namespace) -> int:
    """Handler subcommand ``stats``."""
    progress = storage.load_progress() or Progress()
    ui.render_stats(progress)
    return 0


def cmd_badges(args: argparse.Namespace) -> int:
    """Handler subcommand ``badges``."""
    progress = storage.load_progress() or Progress()
    ui.render_badges(progress)
    return 0


def cmd_leaderboard(args: argparse.Namespace) -> int:
    """Handler subcommand ``leaderboard``."""
    entries = storage.load_leaderboard()
    if not entries:
        ui.console.print(
            "[dim]Belum ada sesi di papan skor perangkat ini. Mainkan satu sesi dulu.[/dim]"
        )
        return 0
    ui.render_leaderboard(entries)
    return 0


def cmd_export(args: argparse.Namespace) -> int:
    """Handler subcommand ``export``."""
    target = storage.export_all(Path(args.path) if args.path else None)
    ui.console.print(f"[green]Progres diekspor ke {target}[/green]")
    return 0


def cmd_reset(args: argparse.Namespace) -> int:
    """Handler subcommand ``reset`` dengan konfirmasi default."""
    if not args.yes:
        answer = (
            ui.console.input(
                "[yellow]Hapus seluruh progres pemain? Ketik 'hapus' untuk lanjut: [/yellow]"
            )
            .strip()
            .lower()
        )
        if answer != "hapus":
            ui.console.print("[dim]Dibatalkan; progres tidak berubah.[/dim]")
            return 0
    storage.reset_all()
    ui.console.print("[green]Progres dihapus. Selamat mulai dari awal![/green]")
    return 0


def cmd_menu(args: argparse.Namespace) -> int:
    """Menu interaktif saat dijalankan tanpa subcommand."""
    progress = storage.load_progress() or Progress()
    manifest = load_manifest(_content_dir(args))
    while True:
        ui.console.print()
        ui.console.print(ui.render_summary_line(progress))
        ui.render_packs(manifest.packs, progress)
        ui.console.print(
            "[dim]Pilih nomor pack · [c] Campur Semua · [s] statistik · "
            "[l] lencana · [t] time attack · [p] papan skor · [k] keluar[/dim]"
        )
        choice = ui.console.input("[bold yellow]> [/bold yellow]").strip().lower()
        if choice in ("k", "q", "keluar", "exit"):
            ui.console.print("[dim]Sampai jumpa! 👋[/dim]")
            return 0
        if choice in ("s", "stats"):
            ui.render_stats(progress)
            continue
        if choice in ("l", "badges", "lencana"):
            ui.render_badges(progress)
            continue
        if choice in ("p", "papan", "leaderboard"):
            cmd_leaderboard(args)
            continue
        if choice in ("t", "time", "time-attack"):
            packs = load_pack(_content_dir(args), None)
            _run_session(
                packs,
                count=MAX_QUESTIONS,
                difficulty=None,
                seed=None,
                progress=progress,
                mode="time-attack",
            )
            continue
        if choice in ("c", "campur"):
            packs = load_pack(_content_dir(args), None)
        elif choice.isdigit() and 1 <= int(choice) <= len(manifest.packs):
            meta = manifest.packs[int(choice) - 1]
            packs = load_pack(_content_dir(args), meta.pack_id)
        else:
            ui.console.print("[red]Pilihan tidak dikenal.[/red]")
            continue
        _run_session(
            packs,
            count=MAX_QUESTIONS,
            difficulty=None,
            seed=None,
            progress=progress,
        )


def main(argv: list[str] | None = None) -> int:
    """Titik masuk CLI.

    Args:
        argv: Argumen baris perintah; default ``sys.argv[1:]``.

    Returns:
        Exit code: 0 sukses, 1 kesalahan runtime, 3 konten tidak valid.
    """
    args = build_parser().parse_args(argv)
    try:
        if args.command == "version":
            ui.console.print(f"PhishQuest {__version__}")
            return 0
        if args.command == "play":
            return cmd_play(args)
        if args.command == "packs":
            return cmd_packs(args)
        if args.command == "stats":
            return cmd_stats(args)
        if args.command == "badges":
            return cmd_badges(args)
        if args.command == "leaderboard":
            return cmd_leaderboard(args)
        if args.command == "export":
            return cmd_export(args)
        if args.command == "reset":
            return cmd_reset(args)
        return cmd_menu(args)
    except ContentError as exc:
        ui.console.print(f"[red]Konten tidak valid: {exc}[/red]")
        return 3
    except PhishQuestError as exc:
        ui.console.print(f"[red]{exc}[/red]")
        return 1
    except (KeyboardInterrupt, EOFError):
        ui.console.print(
            "\n[dim]Sesi dihentikan. Progres yang sudah dijawab tetap tersimpan.[/dim]"
        )
        return 0


def run() -> None:
    """Entry point console_scripts."""
    raise SystemExit(main())


if __name__ == "__main__":
    run()
