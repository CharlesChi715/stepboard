import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from serve import FOCUS_IN, PIECE, typed

checks = []


def ok(label, passed):
    checks.append(f"{'PASS' if passed else 'FAIL'}  {label}")


ok("a short message goes through untouched", typed("hello there") == "hello there")
ok("a trailing ';' is escaped so tmux keeps it", typed("x = 1;") == "x = 1\\;")
long = "a" * 1500
out = typed(long)
ok("a long message becomes typed pieces", out.replace(FOCUS_IN, "") == long)
ok("no piece is longer than the paste threshold allows",
   all(len(p) <= PIECE for p in out.split(FOCUS_IN)))
ok("a long message never ends in ';'", not typed("b" * 900 + ";").endswith(";"))
ok("emoji-only text stays under 800 UTF-16 units per piece",
   all(len(p.encode("utf-16-le")) // 2 <= 800 for p in typed("🙂" * 1000).split(FOCUS_IN)))

print("— typed —")
print("\n".join(checks))
passed = sum(c.startswith("PASS") for c in checks)
print(f"SUMMARY: {passed}/{len(checks)} passed")
sys.exit(0 if passed == len(checks) else 1)
