from __future__ import annotations

import argparse
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "docs" / "guides" / "taxops-za-codebase-learning-guide.md"
DEFAULT_OUTPUT = ROOT / "output" / "pdf" / "taxops-za-codebase-learning-guide.pdf"

PAGE_WIDTH = 595
PAGE_HEIGHT = 842
MARGIN_X = 54
TOP_Y = 790
BOTTOM_Y = 54
CONTENT_WIDTH = PAGE_WIDTH - (MARGIN_X * 2)


@dataclass
class Block:
    kind: str
    text: str | list[str]


def wrap_text(text: str, max_chars: int) -> list[str]:
    words = text.split()
    if not words:
      return [""]

    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        candidate = f"{current} {word}"
        if len(candidate) <= max_chars:
            current = candidate
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def parse_markdown(markdown: str) -> list[Block]:
    lines = markdown.splitlines()
    blocks: list[Block] = []
    paragraph_buffer: list[str] = []
    code_buffer: list[str] = []
    in_code = False

    def flush_paragraph() -> None:
        if paragraph_buffer:
            text = " ".join(part.strip() for part in paragraph_buffer if part.strip())
            if text:
                blocks.append(Block("paragraph", text))
            paragraph_buffer.clear()

    for raw_line in lines:
        line = raw_line.rstrip()

        if line.startswith("```"):
            flush_paragraph()
            if in_code:
                blocks.append(Block("code", code_buffer.copy()))
                code_buffer.clear()
                in_code = False
            else:
                in_code = True
            continue

        if in_code:
            code_buffer.append(line)
            continue

        if not line.strip():
            flush_paragraph()
            blocks.append(Block("spacer", ""))
            continue

        if line == "---":
            flush_paragraph()
            blocks.append(Block("rule", ""))
            continue

        if line.startswith("# "):
            flush_paragraph()
            blocks.append(Block("h1", line[2:].strip()))
            continue

        if line.startswith("## "):
            flush_paragraph()
            blocks.append(Block("h2", line[3:].strip()))
            continue

        if line.startswith("### "):
            flush_paragraph()
            blocks.append(Block("h3", line[4:].strip()))
            continue

        if line.startswith("- "):
            flush_paragraph()
            blocks.append(Block("bullet", line[2:].strip()))
            continue

        if re.match(r"^\d+\.\s", line):
            flush_paragraph()
            blocks.append(Block("numbered", line))
            continue

        paragraph_buffer.append(line)

    flush_paragraph()
    if code_buffer:
        blocks.append(Block("code", code_buffer.copy()))

    return blocks


def escape_pdf_text(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


class PdfBuilder:
    def __init__(self) -> None:
        self.page_streams: list[str] = []
        self.current_stream: list[str] = []
        self.y = TOP_Y
        self.page_number = 1

    def start_page(self) -> None:
        self.current_stream = []
        self.y = TOP_Y
        self.draw_footer(self.page_number)

    def finish_page(self) -> None:
        self.page_streams.append("\n".join(self.current_stream))
        self.page_number += 1

    def ensure_space(self, needed_height: int) -> None:
        if self.y - needed_height < BOTTOM_Y:
            self.finish_page()
            self.start_page()

    def add_text_line(self, x: int, y: int, text: str, font: str, size: int) -> None:
        escaped = escape_pdf_text(text)
        self.current_stream.append(
            f"BT /{font} {size} Tf 1 0 0 1 {x} {y} Tm ({escaped}) Tj ET"
        )

    def add_rule(self) -> None:
        self.ensure_space(20)
        self.current_stream.append(f"0.75 w {MARGIN_X} {self.y} m {PAGE_WIDTH - MARGIN_X} {self.y} l S")
        self.y -= 18

    def add_heading(self, text: str, level: int) -> None:
        if level == 1:
            font, size, gap = "F2", 22, 30
        elif level == 2:
            font, size, gap = "F2", 16, 22
        else:
            font, size, gap = "F2", 12, 18
        self.ensure_space(gap)
        self.add_text_line(MARGIN_X, self.y, text, font, size)
        self.y -= gap

    def add_paragraph(self, text: str) -> None:
        max_chars = 92
        lines = wrap_text(text, max_chars)
        self.ensure_space((len(lines) * 15) + 8)
        for line in lines:
            self.add_text_line(MARGIN_X, self.y, line, "F1", 11)
            self.y -= 15
        self.y -= 6

    def add_bullet(self, text: str) -> None:
        max_chars = 84
        lines = wrap_text(text, max_chars)
        self.ensure_space((len(lines) * 15) + 4)
        for index, line in enumerate(lines):
            prefix = "- " if index == 0 else "  "
            self.add_text_line(MARGIN_X + 12, self.y, f"{prefix}{line}", "F1", 11)
            self.y -= 15
        self.y -= 4

    def add_numbered(self, text: str) -> None:
        max_chars = 88
        lines = wrap_text(text, max_chars)
        self.ensure_space((len(lines) * 15) + 4)
        for line in lines:
            self.add_text_line(MARGIN_X + 6, self.y, line, "F1", 11)
            self.y -= 15
        self.y -= 4

    def add_code(self, lines: Iterable[str]) -> None:
        prepared_lines: list[str] = []
        for line in lines:
            if not line:
                prepared_lines.append("")
                continue
            remaining = line
            while len(remaining) > 84:
                prepared_lines.append(remaining[:84])
                remaining = remaining[84:]
            prepared_lines.append(remaining)

        height = (len(prepared_lines) * 12) + 10
        self.ensure_space(height)
        for line in prepared_lines:
            self.add_text_line(MARGIN_X + 12, self.y, line, "F3", 9)
            self.y -= 12
        self.y -= 6

    def add_spacer(self, amount: int = 8) -> None:
        self.y -= amount

    def draw_footer(self, page_number: int) -> None:
        self.current_stream.append(
            f"BT /F1 9 Tf 1 0 0 1 {MARGIN_X} 28 Tm (TaxOps ZA coding guide - page {page_number}) Tj ET"
        )

    def build(self, blocks: list[Block]) -> bytes:
        self.start_page()

        for block in blocks:
            if block.kind == "h1":
                self.add_heading(str(block.text), 1)
            elif block.kind == "h2":
                self.add_heading(str(block.text), 2)
            elif block.kind == "h3":
                self.add_heading(str(block.text), 3)
            elif block.kind == "paragraph":
                self.add_paragraph(str(block.text))
            elif block.kind == "bullet":
                self.add_bullet(str(block.text))
            elif block.kind == "numbered":
                self.add_numbered(str(block.text))
            elif block.kind == "code":
                self.add_code(block.text if isinstance(block.text, list) else [str(block.text)])
            elif block.kind == "rule":
                self.add_rule()
            elif block.kind == "spacer":
                self.add_spacer()

        self.finish_page()
        return self.to_pdf_bytes()

    def to_pdf_bytes(self) -> bytes:
        objects: list[bytes] = []

        def add_object(content: str | bytes) -> int:
            data = content.encode("latin-1", "replace") if isinstance(content, str) else content
            objects.append(data)
            return len(objects)

        font_helvetica = add_object("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
        font_bold = add_object("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
        font_code = add_object("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>")

        content_ids: list[int] = []
        page_ids: list[int] = []

        for stream in self.page_streams:
            stream_bytes = stream.encode("latin-1", "replace")
            content_id = add_object(
                b"<< /Length " + str(len(stream_bytes)).encode("ascii") + b" >>\nstream\n" + stream_bytes + b"\nendstream"
            )
            content_ids.append(content_id)
            page_ids.append(0)

        # The /Pages tree is written after all page objects, so each page must
        # point to that future object number rather than the next page.
        pages_id_placeholder = len(objects) + len(content_ids) + 1

        for index, content_id in enumerate(content_ids):
            page_content = (
                f"<< /Type /Page /Parent {pages_id_placeholder} 0 R "
                f"/MediaBox [0 0 {PAGE_WIDTH} {PAGE_HEIGHT}] "
                f"/Resources << /Font << /F1 {font_helvetica} 0 R /F2 {font_bold} 0 R /F3 {font_code} 0 R >> >> "
                f"/Contents {content_id} 0 R >>"
            )
            page_ids[index] = add_object(page_content)

        pages_kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
        pages_id = add_object(f"<< /Type /Pages /Count {len(page_ids)} /Kids [{pages_kids}] >>")
        catalog_id = add_object(f"<< /Type /Catalog /Pages {pages_id} 0 R >>")

        result = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        offsets = [0]

        for index, obj in enumerate(objects, start=1):
            offsets.append(len(result))
            result.extend(f"{index} 0 obj\n".encode("ascii"))
            result.extend(obj)
            result.extend(b"\nendobj\n")

        xref_offset = len(result)
        result.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
        result.extend(b"0000000000 65535 f \n")
        for offset in offsets[1:]:
            result.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
        result.extend(
            f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\nstartxref\n{xref_offset}\n%%EOF".encode(
                "ascii"
            )
        )
        return bytes(result)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a simple PDF from a markdown guide.")
    parser.add_argument("--source", default=str(DEFAULT_SOURCE), help="Path to the markdown source file.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Path to the generated PDF output.")
    args = parser.parse_args()

    source = Path(args.source)
    output = Path(args.output)

    markdown = source.read_text(encoding="utf-8")
    blocks = parse_markdown(markdown)
    pdf_bytes = PdfBuilder().build(blocks)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(pdf_bytes)
    print(f"Wrote {output}")


if __name__ == "__main__":
    main()
