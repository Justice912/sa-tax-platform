from __future__ import annotations

import importlib.util
import re
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT_PATH = ROOT / "scripts" / "generate_learning_guide_pdf.py"


def load_module():
    spec = importlib.util.spec_from_file_location("generate_learning_guide_pdf", SCRIPT_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load module from {SCRIPT_PATH}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class GenerateLearningGuidePdfTests(unittest.TestCase):
    def test_multi_page_pdf_uses_pages_tree_as_parent(self) -> None:
        module = load_module()
        blocks = [module.Block("h1", "Multi-page PDF Test")]
        long_paragraph = " ".join(["This is a regression test paragraph for the PDF generator."] * 25)
        for _ in range(180):
            blocks.append(module.Block("paragraph", long_paragraph))

        pdf_bytes = module.PdfBuilder().build(blocks)
        pdf_text = pdf_bytes.decode("latin-1", "replace")

        objects = {
            int(match.group(1)): match.group(2)
            for match in re.finditer(r"(\d+) 0 obj\n(.*?)\nendobj", pdf_text, re.DOTALL)
        }
        pages_objects = {
            object_id: body
            for object_id, body in objects.items()
            if "/Type /Pages" in body
        }
        page_objects = {
            object_id: body
            for object_id, body in objects.items()
            if "/Type /Page" in body and "/Type /Pages" not in body
        }

        self.assertEqual(1, len(pages_objects), "Expected exactly one /Pages object.")
        self.assertGreater(len(page_objects), 1, "Regression test must produce a multi-page PDF.")

        pages_object_id = next(iter(pages_objects))

        for object_id, body in page_objects.items():
            self.assertIn(
                f"/Parent {pages_object_id} 0 R",
                body,
                f"Page object {object_id} does not point to the /Pages tree.",
            )


if __name__ == "__main__":
    unittest.main()
