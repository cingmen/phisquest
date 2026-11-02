"""Komponen tampilan Rich untuk PhishQuest CLI."""

from __future__ import annotations

import sys

from rich import box
from rich.console import Console, Group
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from .content import ManifestPack
from .models import (
    BADGE_BY_ID,
    BADGES,
    LEVEL_EMOJI,
    LEVEL_NAMES,
    RED_FLAG_LABELS,
    AnswerResult,
    Progress,
    Scenario,
    SessionSummary,
    level_for,
    level_progress,
)

DISCLAIMER = (
    "PhishQuest adalah simulasi edukasi. Semua email, brand, dan domain di dalamnya fiktif. "
    "Tidak ada data yang dikumpulkan."
)

CHANNEL_LABEL = {
    "email": "✉️  Email",
    "sms": "📱 SMS",
    "whatsapp": "💬 WhatsApp",
}

CHANNEL_STYLE = {"email": "cyan", "sms": "green", "whatsapp": "bright_green"}


def _tolerant_stdout() -> object:
    """Aktifkan ``errors='replace'`` agar emoji tidak memicu UnicodeEncodeError.

    Konsol Windows lama memakai cp1252 sehingga karakter emoji tidak dapat di-encode.
    Dengan mode replace, CLI tetap berjalan (glyph diganti tanda tanya) alih-alih crash.

    Returns:
        Stream stdout yang sudah disesuaikan, atau stdout apa adanya.
    """
    stream = sys.stdout
    if stream is None:
        return stream
    try:
        stream.reconfigure(errors="replace")
    except (AttributeError, ValueError, OSError):
        return stream
    return stream


console = Console(file=_tolerant_stdout(), highlight=False)


def print_disclaimer() -> None:
    """Cetak disclaimer etika satu baris."""
    console.print(Text(DISCLAIMER, style="dim italic"))


def level_line(progress: Progress) -> str:
    """Ringkasan level + XP untuk header."""
    level, current, needed = level_progress(progress.total_xp)
    emoji = LEVEL_EMOJI.get(level, "🐣")
    name = LEVEL_NAMES.get(level, level)
    if needed == 0:
        return f"{emoji} {name} · {progress.total_xp} XP (level maksimum)"
    return f"{emoji} {name} · {current}/{needed} XP ke level berikutnya"


def render_header(
    pack_name: str,
    index: int,
    total: int,
    score: int,
    progress: Progress,
    streak: int,
) -> Panel:
    """Panel header sesi: pack, skor, streak, dan progres soal."""
    bar_width = 20
    filled = int(bar_width * (index / total)) if total else 0
    bar = "█" * filled + "░" * (bar_width - filled)
    lines = [
        f"[bold]{pack_name}[/bold] · Soal {index}/{total}",
        f"[green]{bar}[/green]  skor {score} · streak 🔥{streak}",
        f"[yellow]{level_line(progress)}[/yellow]",
    ]
    return Panel(
        Group(*[Text.from_markup(line) for line in lines]),
        title="🎣 PhishQuest",
        border_style="magenta",
        box=box.ROUNDED,
    )


def render_message(scenario: Scenario) -> Panel:
    """Kartu pesan email/SMS/WhatsApp yang sedang dinilai."""
    channel = CHANNEL_LABEL.get(scenario.channel, scenario.channel.upper())
    lines: list[Text] = [
        Text.from_markup(
            f"[bold]Dari[/bold]   : {scenario.sender['name']} <{scenario.sender['address']}>"
        ),
    ]
    if scenario.subject:
        lines.append(Text.from_markup(f"[bold]Subjek[/bold] : {scenario.subject}"))
    lines.append(Text.from_markup(f"[bold]Waktu[/bold]  : {scenario.datetime}"))
    if scenario.attachment:
        attachment = scenario.attachment
        lines.append(
            Text.from_markup(
                f"[bold]Lampiran[/bold]: 📎 {attachment.get('name')} "
                f"({attachment.get('size_kb')} KB)"
            )
        )
    if scenario.link:
        lines.append(
            Text.from_markup(
                f"[bold]Tautan[/bold] : [cyan]{scenario.link.get('text')}[/cyan] "
                f"→ [dim]{scenario.link.get('href')}[/dim]"
            )
        )
    lines.append(Text(""))
    lines.extend(Text(line) for line in scenario.body.splitlines())
    return Panel(
        Group(*lines),
        title=f"{channel}",
        border_style=CHANNEL_STYLE.get(scenario.channel, "cyan"),
        box=box.ROUNDED,
    )


def render_question(scenario: Scenario) -> None:
    """Cetak pertanyaan dan pilihan jawaban sesuai tipe soal."""
    if scenario.type == "phish_or_legit":
        console.print(
            Text.from_markup("\n[bold]Phishing atau Legit?[/bold]  [P] Phishing  [L] Legit")
        )
        return
    title = (
        "Tindakan terbaik apa yang Anda pilih?"
        if scenario.type == "best_action"
        else ("Bagian mana yang paling mencurigakan?")
    )
    table = Table(box=box.SIMPLE, show_header=False, pad_edge=False)
    for option in scenario.options or []:
        table.add_row(
            Text(f" {option.get('id')} ", style="bold yellow"),
            Text(str(option.get("text"))),
        )
    console.print(Text.from_markup(f"\n[bold]{title}[/bold]"))
    console.print(table)


def render_feedback(result: AnswerResult) -> None:
    """Panel umpan balik setelah menjawab."""
    if result.correct:
        title = "✅ Benar!"
        style = "green"
    else:
        title = "❌ Belum tepat"
        style = "red"
    lines = [
        Text.from_markup(
            f"[bold]{title}[/bold] +{result.xp_gained} XP "
            f"(dasar {result.xp_base}, bonus {result.xp_bonus}) · streak 🔥{result.streak_after}"
        )
    ]
    if result.level_up:
        emoji = LEVEL_EMOJI.get(result.level_up, "⬆️")
        lines.append(
            Text.from_markup(
                f"[yellow]{emoji} Naik level: {LEVEL_NAMES.get(result.level_up)}[/yellow]"
            )
        )
    if result.badges_earned:
        names = ", ".join(
            f"{BADGE_BY_ID[badge].emoji} {BADGE_BY_ID[badge].name}"
            for badge in result.badges_earned
            if badge in BADGE_BY_ID
        )
        lines.append(Text.from_markup(f"[yellow]🏅 Lencana baru: {names}[/yellow]"))
    if result.red_flags:
        flags = " · ".join(RED_FLAG_LABELS.get(code, code) for code in result.red_flags)
        lines.append(Text.from_markup(f"[red]🚩 Red flag:[/red] {flags}"))
    else:
        lines.append(Text.from_markup("[green]Tidak ada red flag — pesan ini wajar.[/green]"))
    lines.append(Text(""))
    lines.append(Text(result.explanation))
    lines.append(Text(""))
    lines.append(Text.from_markup(f"💡 [italic]{result.teach['tip']}[/italic]"))
    lines.append(Text.from_markup(f"🔎 Verifikasi: {result.teach['verify_how']}"))
    console.print(Panel(Group(*lines), title="Umpan balik", border_style=style, box=box.ROUNDED))


def render_recap(summary: SessionSummary, progress: Progress) -> None:
    """Layar recap akhir sesi."""
    accuracy = f"{summary.accuracy * 100:.0f}%"
    lines = [
        Text.from_markup(f"[bold]Skor sesi[/bold]  : {summary.score} XP"),
        Text.from_markup(f"[bold]XP dasar[/bold]   : {summary.max_score} poin maksimum"),
        Text.from_markup(f"[bold]Akurasi[/bold]    : {accuracy}"),
        Text.from_markup(f"[bold]Streak terbaik[/bold]: 🔥{summary.best_streak_in_session}"),
        Text.from_markup(
            f"[bold]Level[/bold]      : {LEVEL_NAMES.get(summary.level_after)} "
            f"{level_line(progress)}"
        ),
    ]
    if summary.badges_earned:
        names = ", ".join(
            f"{BADGE_BY_ID[badge].emoji} {BADGE_BY_ID[badge].name}"
            for badge in summary.badges_earned
            if badge in BADGE_BY_ID
        )
        lines.append(Text.from_markup(f"[bold]Lencana baru[/bold]: {names}"))
    if summary.mistakes:
        lines.append(Text(""))
        lines.append(Text.from_markup("[bold]Kesalahan untuk ditinjau[/bold]"))
        for mistake in summary.mistakes:
            lines.append(
                Text.from_markup(
                    f" • {mistake['scenario_id']}: Anda menjawab "
                    f"[red]{mistake['chosen']}[/red], "
                    f"kunci [green]{mistake['correct_answer']}[/green]"
                )
            )
    else:
        lines.append(Text("\n💯 Tanpa kesalahan. Luar biasa!"))
    console.print(
        Panel(
            Group(*lines),
            title="📜 Recap sesi",
            border_style="magenta",
            box=box.ROUNDED,
        )
    )


def render_packs(packs: list[ManifestPack], progress: Progress) -> None:
    """Tabel daftar pack beserta best score pemain."""
    table = Table(title="Pack tersedia", box=box.SIMPLE_HEAVY, show_lines=False)
    table.add_column("#", style="dim", width=3)
    table.add_column("Pack")
    table.add_column("Skenario", justify="right")
    table.add_column("Best score", justify="right")
    for index, pack in enumerate(packs, start=1):
        stats = progress.packs.get(pack.pack_id) or {}
        best = stats.get("best_score")
        table.add_row(
            str(index),
            f"{pack.emoji} {pack.name} [dim]({pack.pack_id})[/dim]",
            str(pack.scenario_count),
            str(best) if best is not None else "—",
        )
    console.print(table)


def render_stats(progress: Progress) -> None:
    """Panel statistik pemain."""
    counters = progress.counters
    answered = int(counters.get("answered", 0))
    correct = int(counters.get("correct", 0))
    accuracy = (correct / answered * 100) if answered else 0.0
    lines = [
        Text.from_markup(f"[bold]Level[/bold]     : {level_line(progress)}"),
        Text.from_markup(f"[bold]Total XP[/bold]  : {progress.total_xp}"),
        Text.from_markup(
            f"[bold]Streak[/bold]    : 🔥{progress.current_streak} (rekor {progress.best_streak})"
        ),
        Text.from_markup(f"[bold]Akurasi[/bold]   : {accuracy:.0f}% ({correct}/{answered} benar)"),
        Text.from_markup(
            f"[bold]Sesi[/bold]      : {counters.get('sessions_completed', 0)} selesai"
        ),
        Text.from_markup(f"[bold]Lencana[/bold]   : {len(progress.badges)}/{len(BADGES)}"),
    ]
    console.print(Panel(Group(*lines), title="Statistik", border_style="cyan", box=box.ROUNDED))
    if progress.history:
        table = Table(title="5 sesi terakhir", box=box.SIMPLE)
        table.add_column("Waktu", style="dim")
        table.add_column("Pack")
        table.add_column("Skor", justify="right")
        table.add_column("Akurasi", justify="right")
        for entry in list(reversed(progress.history))[:5]:
            table.add_row(
                str(entry.get("at", ""))[:16].replace("T", " "),
                str(entry.get("pack_id", "—")),
                str(entry.get("score", 0)),
                f"{float(entry.get('accuracy', 0)) * 100:.0f}%",
            )
        console.print(table)


def render_badges(progress: Progress) -> None:
    """Grid lencana: diperoleh berwarna, belum diperoleh redup."""
    table = Table(title=f"Lencana ({len(progress.badges)}/{len(BADGES)})", box=box.SIMPLE_HEAVY)
    table.add_column("Lencana", width=24)
    table.add_column("Syarat")
    table.add_column("Status", width=12)
    for badge in BADGES:
        earned = badge.badge_id in progress.badges
        name = f"{badge.emoji} {badge.name}"
        if earned:
            table.add_row(
                f"[yellow]{name}[/yellow]", badge.requirement, "[green]✔ diperoleh[/green]"
            )
        else:
            table.add_row(f"[dim]{name}[/dim]", f"[dim]{badge.requirement}[/dim]", "[dim]—[/dim]")
    console.print(table)


def render_summary_line(progress: Progress) -> str:
    """Satu baris ringkas untuk menu."""
    return f"Total XP {progress.total_xp} · {level_line(progress)} · lencana {len(progress.badges)}"


def current_level(progress: Progress) -> str:
    """Id level saat ini dari total XP."""
    return level_for(progress.total_xp)
