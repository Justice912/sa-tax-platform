#!/usr/bin/env python3
"""TaxOps ZA deceased-estate API client (stdlib only).

Env: TAXOPS_URL (default https://sa-tax-platform.vercel.app), TAXOPS_API_KEY (txo_...).
Usage: python3 taxops_estate.py <command> [args]   (run with no args for help)
"""
import json, mimetypes, os, sys, urllib.error, urllib.request, uuid

BASE = os.environ.get("TAXOPS_URL", "https://sa-tax-platform.vercel.app").rstrip("/")
KEY = os.environ.get("TAXOPS_API_KEY", "")


def call(method, path, payload=None, raw=None, ctype=None, expect_binary=False):
    url = path if path.startswith("http") else f"{BASE}/api/v1{path}"
    headers = {"Authorization": f"Bearer {KEY}", "Accept": "application/json"}
    data = None
    if payload is not None:
        data = json.dumps(payload).encode()
        headers["Content-Type"] = "application/json"
    elif raw is not None:
        data, headers["Content-Type"] = raw, ctype
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=120) as res:
            body = res.read()
            if expect_binary:
                return body
            return json.loads(body or b"{}")
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        sys.exit(f"HTTP {e.code} {method} {url}\n{detail}")
    except urllib.error.URLError as e:
        sys.exit(f"Cannot reach {url}: {e.reason}. Check TAXOPS_URL / network access.")


def load(arg):
    """JSON from a file path, inline JSON, or '-' for stdin."""
    if arg == "-":
        return json.load(sys.stdin)
    if os.path.exists(arg):
        with open(arg, encoding="utf-8") as f:
            return json.load(f)
    return json.loads(arg)


def out(obj):
    print(json.dumps(obj, indent=2, ensure_ascii=False))


def request_id(estate, code_or_id):
    reqs = call("GET", f"/estates/{estate}/document-requests")["requests"]
    for r in reqs:
        if code_or_id in (r["id"], r["code"]):
            return r["id"]
    sys.exit(f"No document request '{code_or_id}'. Known codes: {', '.join(r['code'] for r in reqs)}")


def upload(estate, file_path, req=None):
    name = os.path.basename(file_path)
    mime = mimetypes.guess_type(name)[0] or "application/pdf"
    size = os.path.getsize(file_path)
    rid = request_id(estate, req) if req else None
    meta = {"fileName": name, "mimeType": mime, "fileSizeBytes": size, **({"requestId": rid} if rid else {})}
    ticket = call("POST", f"/estates/{estate}/documents/sign", meta)
    with open(file_path, "rb") as f:
        content = f.read()
    if ticket.get("mode") == "supabase":
        put = urllib.request.Request(ticket["signedUrl"], data=content, method="PUT", headers={"Content-Type": mime, "x-upsert": "false"})
        try:
            urllib.request.urlopen(put, timeout=300).read()
            return call("POST", f"/estates/{estate}/documents/complete", {**meta, "storageKey": ticket["storageKey"]})
        except urllib.error.URLError as e:
            if size > 4 * 1024 * 1024:
                sys.exit(f"Signed upload failed: {e}")
    boundary = uuid.uuid4().hex
    parts = []
    if rid:
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="requestId"\r\n\r\n{rid}\r\n'.encode())
    parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{name}"\r\nContent-Type: {mime}\r\n\r\n'.encode() + content + b"\r\n")
    parts.append(f"--{boundary}--\r\n".encode())
    return call("POST", f"/estates/{estate}/documents", raw=b"".join(parts), ctype=f"multipart/form-data; boundary={boundary}")


def intake(plan):
    """Create an estate end to end from one JSON plan (see SKILL.md)."""
    estate_id = plan.get("estateId")
    if not estate_id:
        created = call("POST", "/estates", {**plan["estate"], "administration": plan.get("administration", {})})
        estate_id = created["estate"]["id"]
    elif plan.get("administration"):
        call("PUT", f"/estates/{estate_id}/administration", plan["administration"])
    ben_ids = {}
    for b in plan.get("beneficiaries", []):
        key = b.pop("key", None)
        res = call("POST", f"/estates/{estate_id}/beneficiaries", b)
        if key:
            ben_ids[key] = res["id"]
    for a in plan.get("assets", []):
        if a.get("beneficiaryKey"):
            a["beneficiaryId"] = ben_ids[a.pop("beneficiaryKey")]
        call("POST", f"/estates/{estate_id}/assets", a)
    for l in plan.get("liabilities", []):
        call("POST", f"/estates/{estate_id}/liabilities", l)
    call("POST", f"/estates/{estate_id}/workflow/init", {})
    return {"estateId": estate_id, "beneficiaryIds": ben_ids, "status": call("GET", f"/estates/{estate_id}/status")}


def save(path, data):
    with open(path, "wb") as f:
        f.write(data)
    print(f"saved {path} ({len(data)} bytes)")


HELP = """commands:
  me | routes | list
  intake PLAN.json                       create estate + beneficiaries + assets + liabilities + workflow
  get ESTATE | status ESTATE | init ESTATE
  admin ESTATE JSON                      PUT administration (type, masterReference, sarsCaseNumber, workpaper{})
  add ESTATE assets|liabilities|beneficiaries JSON
  update ESTATE assets|liabilities|beneficiaries ID JSON
  requests ESTATE | request ESTATE JSON | request-status ESTATE CODE STATUS
  link ESTATE "Recipient" [email] [days]  secure upload link for outstanding requests
  upload ESTATE FILE [REQUEST_CODE]       | docs ESTATE | review ESTATE DOC_ID ACCEPTED|REJECTED [note]
  download ESTATE DOC_ID OUT
  ld ESTATE [--input] | ld-docx ESTATE OUT.docx
  sars ESTATE | sars-set ESTATE CODE JSON
  pack ESTATE sars|master OUT.zip | stage ESTATE"""


def main(argv):
    if not argv or argv[0] in ("-h", "--help", "help"):
        print(HELP); return
    if not KEY and argv[0] != "help":
        sys.exit("Set TAXOPS_API_KEY (create one in the app: Admin > API keys).")
    c, a = argv[0], argv[1:]
    if c == "me": out(call("GET", "/me"))
    elif c == "routes": out(call("GET", "/openapi"))
    elif c == "list": out([{k: e.get(k) for k in ("id", "estateReference", "deceasedName", "currentStage", "status")} for e in call("GET", "/estates")["estates"]])
    elif c == "intake": out(intake(load(a[0])))
    elif c == "get": out(call("GET", f"/estates/{a[0]}"))
    elif c == "status": out(call("GET", f"/estates/{a[0]}/status"))
    elif c == "init": out(call("POST", f"/estates/{a[0]}/workflow/init", {}))
    elif c == "admin": out(call("PUT", f"/estates/{a[0]}/administration", load(a[1])))
    elif c == "add": out(call("POST", f"/estates/{a[0]}/{a[1]}", load(a[2])))
    elif c == "update": out(call("PUT", f"/estates/{a[0]}/{a[1]}/{a[2]}", load(a[3])))
    elif c == "requests": out([{k: r[k] for k in ("id", "code", "title", "audience", "status")} for r in call("GET", f"/estates/{a[0]}/document-requests")["requests"]])
    elif c == "request": out(call("POST", f"/estates/{a[0]}/document-requests", load(a[1])))
    elif c == "request-status": out(call("PATCH", f"/estates/{a[0]}/document-requests/{request_id(a[0], a[1])}", {"status": a[2]}))
    elif c == "link": out(call("POST", f"/estates/{a[0]}/upload-links", {"recipientName": a[1], **({"recipientEmail": a[2]} if len(a) > 2 and a[2] else {}), "expiresInDays": int(a[3]) if len(a) > 3 else 14}))
    elif c == "upload": out(upload(a[0], a[1], a[2] if len(a) > 2 else None))
    elif c == "docs": out(call("GET", f"/estates/{a[0]}/documents"))
    elif c == "review": out(call("PATCH", f"/estates/{a[0]}/documents/{a[1]}", {"status": a[2], **({"reviewNote": a[3]} if len(a) > 3 else {})}))
    elif c == "download": save(a[2], call("GET", f"/estates/{a[0]}/documents/{a[1]}/download", expect_binary=True))
    elif c == "ld": out(call("GET", f"/estates/{a[0]}/ld" + ("?includeInput=1" if "--input" in a else "")))
    elif c == "ld-docx": save(a[1], call("GET", f"/estates/{a[0]}/ld?format=docx", expect_binary=True))
    elif c == "sars": out(call("GET", f"/estates/{a[0]}/sars-obligations"))
    elif c == "sars-set": out(call("PATCH", f"/estates/{a[0]}/sars-obligations/{a[1]}", load(a[2])))
    elif c == "pack": save(a[2], call("GET", f"/estates/{a[0]}/packs/{a[1]}", expect_binary=True))
    elif c == "stage": out(call("POST", f"/estates/{a[0]}/stage", {}))
    else: sys.exit(HELP)


if __name__ == "__main__":
    main(sys.argv[1:])
