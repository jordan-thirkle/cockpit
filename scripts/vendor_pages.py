#!/usr/bin/env python3
"""Recursively vendor Hermes dashboard pages + their import closure into
src/hermes/vendor/, rewriting aliases and adding a @ts-nocheck header.

Mirrors the previous subagent's vendoring convention (see vendor/README.md):
  - @/lib/api                -> @/hermes/api
  - @/X/...                  -> @/hermes/vendor/X/...
  - @hermes/shared/X         -> @/hermes/vendor/shared/X
  - @nous-research/ui/...    left as-is (resolved by vite alias + installed pkg)
  - bare package imports     left as-is
"""
import os
import re
import sys

SRC_ROOT = "C:/Users/jorda/AppData/Local/hermes/hermes-agent/web/src"
VENDOR = "D:/Projects/cockpit/src/hermes/vendor"
SHARED_ROOT = "C:/Users/jorda/AppData/Local/hermes/hermes-agent/apps/shared/src"
EXTS = [".tsx", ".ts", ".jsx", ".js"]

TS_NOCHECK = "// @ts-nocheck -- vendored verbatim from hermes-agent/web/src; not type-owned by Cockpit\n"

TARGET_PAGES = [
    "pages/EnvPage",
    "pages/FilesPage",
    "pages/LogsPage",
    "pages/WebhooksPage",
    "pages/PairingPage",
    "pages/ProfilesPage",
    "pages/SystemPage",
    "pages/DocsPage",
    "pages/ChannelsPage",
]

# specifier -> (rewritten_spec, source_file_or_None)
def resolve(spec, current_file):
    if spec.startswith("@/"):
        rest = spec[2:]
        if rest == "lib/api":
            return "@/hermes/api", None
        target = "@/hermes/vendor/" + rest
        return target, os.path.join(SRC_ROOT, rest)
    if spec.startswith("@hermes/shared"):
        rest = spec[len("@hermes/shared"):].lstrip("/")
        return "@/hermes/vendor/shared/" + rest, os.path.join(SHARED_ROOT, rest)
    if spec.startswith("."):
        # resolve relative to current file, then map into web/src if under it
        cur = os.path.dirname(current_file)
        abs = os.path.normpath(os.path.join(cur, spec))
        if abs.startswith(SRC_ROOT):
            rel = os.path.relpath(abs, SRC_ROOT).replace(os.sep, "/")
            rel, _ext = split_ext(rel)
            return "@/hermes/vendor/" + rel, abs
        return None, None  # external relative (unlikely)
    return None, None  # bare package -> leave unchanged


def split_ext(path):
    for ext in EXTS:
        if path.endswith(ext):
            return path[: -len(ext)], ext
    return path, ""


def find_src(base):
    """base is a path without extension; return existing file or None."""
    if os.path.isfile(base):
        return base
    for ext in EXTS:
        if os.path.isfile(base + ext):
            return base + ext
    for ext in EXTS:
        idx = os.path.join(base, "index" + ext)
        if os.path.isfile(idx):
            return idx
    return None


IMP_RE = re.compile(r'((?:from|import)\s*\(?\s*)([\'"])([^\'"]+)([\'"])')

def rewrite_imports(content, current_file):
    missing = []
    def repl(m):
        prefix, q1, spec, q2 = m.group(1), m.group(2), m.group(3), m.group(4)
        new_spec, src = resolve(spec, current_file)
        if new_spec is None:
            return m.group(0)  # bare package, leave
        if src is None:
            # mapped to @/hermes/api (no file to copy) or external
            return prefix + q1 + new_spec + q2
        f = find_src(src)
        if f is None:
            missing.append(spec)
            # Still rewrite to the vendor alias so the file at least references
            # a consistent path; build will surface the missing module.
            return prefix + q1 + new_spec + q2
        enqueue(f)
        return prefix + q1 + new_spec + q2
    new = IMP_RE.sub(repl, content)
    return new, missing


queue = []
seen = set()
copied = []
missing_specs = set()

def enqueue(src_file):
    if src_file not in seen:
        seen.add(src_file)
        queue.append(src_file)

# seed
for p in TARGET_PAGES:
    f = find_src(os.path.join(SRC_ROOT, p))
    if not f:
        print("SEED MISSING:", p)
    else:
        enqueue(f)

while queue:
    src = queue.pop(0)
    try:
        with open(src, "r", encoding="utf-8") as fh:
            content = fh.read()
    except Exception as e:
        print("READ ERR", src, e)
        continue
    # compute vendor target path
    rel = os.path.relpath(src, SRC_ROOT).replace(os.sep, "/")
    rel, ext = split_ext(rel)
    target = os.path.join(VENDOR, rel) + ext
    new_content, missing = rewrite_imports(content, src)
    for ms in missing:
        missing_specs.add(ms)
    os.makedirs(os.path.dirname(target), exist_ok=True)
    with open(target, "w", encoding="utf-8") as fh:
        # Prepend ts-nocheck only if not already present.
        if not content.lstrip().startswith("// @ts-nocheck"):
            fh.write(TS_NOCHECK)
        fh.write(new_content)
    copied.append(target)

print("COPIED", len(copied), "files")
for c in sorted(copied):
    print("  ", os.path.relpath(c, VENDOR))
if missing_specs:
    print("MISSING SOURCE MODULES:")
    for m in sorted(missing_specs):
        print("  ", m)
