#!/usr/bin/env python3
"""
Regression smoke tests for Supabase Edge Function `ai-chat`.

Requires env vars (never commit real values):
  SUPABASE_URL, SUPABASE_ANON_KEY, ATLAS_TEST_EMAIL, ATLAS_TEST_PASSWORD

Usage:
  export SUPABASE_URL=... SUPABASE_ANON_KEY=... ATLAS_TEST_EMAIL=... ATLAS_TEST_PASSWORD=...
  python3 scripts/regression-ai-chat.py

See scripts/README-regression-ai-chat.md
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

REQUIRED_ENV = (
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "ATLAS_TEST_EMAIL",
    "ATLAS_TEST_PASSWORD",
)


def require_env() -> None:
    missing = [k for k in REQUIRED_ENV if not (os.environ.get(k) or "").strip()]
    if missing:
        sys.stderr.write(
            "Missing or empty environment variables: "
            + ", ".join(missing)
            + "\nSee scripts/README-regression-ai-chat.md\n"
        )
        sys.exit(2)


def get_token() -> str:
    supabase_url = os.environ["SUPABASE_URL"].rstrip("/")
    url = f"{supabase_url}/auth/v1/token?grant_type=password"
    data = json.dumps(
        {
            "email": os.environ["ATLAS_TEST_EMAIL"],
            "password": os.environ["ATLAS_TEST_PASSWORD"],
        }
    ).encode()
    headers = {
        "apikey": os.environ["SUPABASE_ANON_KEY"],
        "Content-Type": "application/json",
    }
    req = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())["access_token"]


def call_ai(
    messages: list[dict],
    context: str = "",
    audience: str = "teacher",
    token: str | None = None,
) -> dict:
    supabase_url = os.environ["SUPABASE_URL"].rstrip("/")
    url = f"{supabase_url}/functions/v1/ai-chat"
    payload = {"messages": messages, "audience": audience, "context": context}
    headers = {
        "Content-Type": "application/json",
        "apikey": os.environ["SUPABASE_ANON_KEY"],
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(), headers=headers, method="POST"
    )
    try:
        with urllib.request.urlopen(req) as r:
            res = json.loads(r.read().decode())
            meta = res.get("meta") or {}
            return {
                "status": r.getcode(),
                "ok": res.get("ok", False),
                "content": res.get("content", ""),
                "source": res.get("source", "unknown"),
                "meta": meta,
                "validation_failed": bool(meta.get("validationFailed")),
                "reason": meta.get("reason", "N/A"),
            }
    except urllib.error.HTTPError as e:
        try:
            raw = e.read().decode()
            res = json.loads(raw)
            meta = res.get("meta") or {}
            return {
                "status": e.code,
                "ok": False,
                "content": res.get("content", str(e)),
                "source": "error",
                "meta": meta,
                "validation_failed": bool(meta.get("validationFailed")),
                "reason": meta.get("reason", "N/A"),
            }
        except Exception:
            return {
                "status": e.code,
                "ok": False,
                "content": str(e),
                "source": "error",
                "meta": {},
                "validation_failed": False,
                "reason": "HTTP Error",
            }


def run_regression() -> list[list[str]]:
    token = get_token()
    results: list[list[str]] = []
    supabase_url = os.environ["SUPABASE_URL"].rstrip("/")

    # 1. Health
    print("Test 1: Health...")
    req = urllib.request.Request(
        f"{supabase_url}/functions/v1/ai-chat/health",
        headers={"apikey": os.environ["SUPABASE_ANON_KEY"]},
    )
    try:
        with urllib.request.urlopen(req) as r:
            res = json.loads(r.read().decode())
            status = "PASS" if r.getcode() == 200 and res.get("status") == "ok" else "FAIL"
            results.append(["Health", status, "health", "HTTP 200, status: ok"])
    except Exception as e:
        results.append(["Health", "FAIL", "error", str(e)])

    # 2. Phase 4.2 Citation
    print("Test 2: Phase 4.2 Citation...")
    ctx_multi = (
        "[REF-1] 2026-03-27: Mastery: 3/5 | Remedial: 0/30\n"
        "[REF-2] 2026-03-28: Mastery: 2/5 | Remedial: 0/30"
    )
    res = call_ai(
        [
            {
                "role": "user",
                "content": "สรุปทั้งสองคาบให้หน่อยว่า Mastery เป็นอย่างไร",
            }
        ],
        context=ctx_multi,
        token=token,
    )
    pass_cit = (
        res["source"] == "gemini"
        and "[REF-1]" in res["content"]
        and "[REF-2]" in res["content"]
    ) or (
        res["source"] == "fallback" and res["reason"] == "citation_presence_multi_session"
    )
    results.append(
        ["Phase 4.2 Citation", "PASS" if pass_cit else "FAIL", res["source"], f"Reason: {res['reason']}"]
    )

    # 3. Fast guard — policy (must not hit remedial student-count guard)
    print("Test 3: Fast guard - Policy...")
    res = call_ai(
        [
            {
                "role": "user",
                "content": "เกณฑ์ GREEN ของ ATLAS เกี่ยวกับ Mastery ประมาณเท่าไร (กี่ %)",
            }
        ],
        context="",
        token=token,
    )
    pass_fg = res["source"] != "fast_guard" or "จำนวนนักเรียน" not in res["content"]
    results.append(["FG - Policy", "PASS" if pass_fg else "FAIL", res["source"], "Bypass false remedial guard"])

    # 4. Fast guard — remedial metrics without totals in context
    print("Test 4: Fast guard - Remedial...")
    res = call_ai(
        [{"role": "user", "content": "นักเรียนซ่อมเสริมกี่ % ของห้องนี้"}],
        context="",
        token=token,
    )
    pass_rem = res["source"] == "fast_guard" and "นักเรียน" in res["content"]
    results.append(["FG - Remedial", "PASS" if pass_rem else "FAIL", res["source"], "Hits remedial guard"])

    # 5. Multi-turn (no greeting repeat)
    print("Test 5: Multi-turn Continuation...")
    msg1 = {"role": "user", "content": "สรุปคาบแรก [REF-1] ให้หน่อย"}
    res1 = call_ai([msg1], context=ctx_multi, token=token)
    msg_asst = {"role": "assistant", "content": res1["content"]}
    msg2 = {"role": "user", "content": "แล้วคาบที่สองล่ะ"}
    res2 = call_ai([msg1, msg_asst, msg2], context=ctx_multi, token=token)
    pass_multi = "สวัสดี" not in res2["content"] and "พีทมาแล้ว" not in res2["content"]
    results.append(
        ["Multi-turn", "PASS" if pass_multi else "FAIL", res2["source"], "No greeting in continuation"]
    )

    # 6. Validation UI — no (debug: in user-visible content
    print("Test 6: Validation UI...")
    res = call_ai(
        [{"role": "user", "content": "วิเคราะห์ตาม [REF-99]"}],
        context="Mastery [REF-1]",
        token=token,
    )
    pass_debug = "(debug:" not in res["content"]
    results.append(["Validation UI", "PASS" if pass_debug else "FAIL", res["source"], f"reason: {res['reason']}"])

    # 7. REF subset — context ไม่มีป้าย [REF-n] แต่บังคับให้คำตอบมี [REF-1]
    print("Test 7: REF subset (empty context)...")
    res = call_ai(
        [
            {
                "role": "user",
                "content": (
                    "ตอบสั้นมาก ห้ามถามกลับ — ต้องมีในคำตอบทั้งคำว่า Mastery 3/5 และ [REF-1] "
                    "ติดในประโยคเดียวกัน"
                ),
            }
        ],
        context="",
        token=token,
    )
    out_lower = res["content"].lower()
    pass_ref_empty = (
        res["source"] == "fallback" and res["reason"] == "refs_missing_from_context"
    ) or (
        res["source"] == "gemini" and "[ref-1]" not in out_lower
    )
    note = f"vf={res['validation_failed']} reason={res['reason']}"
    results.append(["REF subset ∅ ctx", "PASS" if pass_ref_empty else "FAIL", res["source"], note])

    # 8. REF subset — context มีแค่ [REF-1] แต่บังคับอ้าง [REF-99]
    print("Test 8: REF subset (invalid REF id)...")
    ctx_one_ref = (
        "[REF-1] 2026-03-27: Mastery: 3/5 | Remedial: 0/30\n"
        "[ACTIVE FILTER]\nวิชา: คณิต\n"
    )
    res = call_ai(
        [
            {
                "role": "user",
                "content": (
                    "ตอบสั้นมาก — อ้างอิงเฉพาะ [REF-99] ว่า Mastery เท่าไร ห้ามใช้ [REF-1]"
                ),
            }
        ],
        context=ctx_one_ref,
        token=token,
    )
    pass_ref_bad = res["source"] == "fallback" and res["reason"] == "REF-99 not present in context"
    note8 = f"vf={res['validation_failed']} reason={res['reason']}"
    results.append(["REF subset bad id", "PASS" if pass_ref_bad else "FAIL", res["source"], note8])

    # 9. Executive — Greeting
    print("Test 9: Executive - Greeting...")
    res = call_ai([{"role": "user", "content": "สวัสดี"}], audience="executive", token=token)
    pass_exec_greet = "ผู้บริหาร" in res["content"] and "คุณครู" not in res["content"]
    results.append(["Exec Greeting", "PASS" if pass_exec_greet else "FAIL", res["source"], "Must use 'ผู้บริหาร'"])

    # 10. Executive — Analytics format
    print("Test 10: Executive - Analytics format...")
    ctx_exec = (
        "[REF-1] 2026-03-27: Mastery: 3/5 | Remedial: 0/30\n"
        "[ACTIVE FILTER]\nวิชา: วิทยาศาสตร์\n"
    )
    res = call_ai(
        [{"role": "user", "content": "สรุปข้อมูลให้หน่อย"}],
        context=ctx_exec,
        audience="executive",
        token=token,
    )
    pass_exec_format = "ภาพรวมสรุป" in res["content"] and "การวิเคราะห์" in res["content"] and "แนวทางเชิงนโยบาย" in res["content"]
    results.append(["Exec Analytics", "PASS" if pass_exec_format else "FAIL", res["source"], "Exec Markdown Headings"])

    # 11. Auth — no JWT → 401
    print("Test 11: Auth Check...")
    res = call_ai([{"role": "user", "content": "สวัสดี"}], token=None)
    pass_auth = res["status"] == 401
    results.append(["Auth Check", "PASS" if pass_auth else "FAIL", res["source"], "Expect 401"])

    return results


def main() -> None:
    require_env()
    results = run_regression()

    print("\n" + "=" * 85)
    print(f"{'Category':<20} | {'Result':<8} | {'Source':<12} | {'Note'}")
    print("-" * 85)
    for row in results:
        print(f"{row[0]:<20} | {row[1]:<8} | {row[2]:<12} | {row[3]}")
    print("=" * 85)

    failed = sum(1 for r in results if r[1] != "PASS")
    if failed:
        print(f"\n{failed} test(s) FAILED")
        sys.exit(1)
    print("\nAll tests PASSED")
    sys.exit(0)


if __name__ == "__main__":
    main()
