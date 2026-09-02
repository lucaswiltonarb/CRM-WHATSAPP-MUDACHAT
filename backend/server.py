"""
MudaChat backend: Evolution API webhook receiver + automation engine.
Ported from Node.js/Express to FastAPI.
"""
import os
import json
import time
import math
import asyncio
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Optional
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mudachat")

app = FastAPI(title="MudaChat Backend")

CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")
origins = ["*"] if CORS_ORIGINS == "*" else [o.strip() for o in CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PUBLIC_URL = os.environ.get("PUBLIC_URL", "https://discount-aloof-familiar.ngrok-free.dev").rstrip("/")
DATA_FILE = Path(os.environ.get("DATA_FILE") or (Path(__file__).parent / "data.json"))

# ---------- persistence ----------
def _default_db():
    return {
        "instances": [],
        "automations": [],
        "integrations": {},
        "orders": [],
        "products": [],
        "coupons": [],
        "storeSettings": None,
        "funnels": [],
        "classifications": [],
        "leads": [],
        "igAccounts": [],
    }

def _default_store_settings():
    return {
        "brandName": "",
        "accentColor": "#ec4899",
        "seoTitle": "",
        "seoDescription": "",
        "address": "",
        "whatsapp": "",
        "enablePickup": True,
        "enableDelivery": True,
    }

db = _default_db()
try:
    if DATA_FILE.exists():
        db = json.loads(DATA_FILE.read_text("utf-8"))
except Exception:
    pass

def ensure_db_shape():
    if not isinstance(db.get("instances"), list):
        db["instances"] = []
    if not isinstance(db.get("automations"), list):
        db["automations"] = []
    if not isinstance(db.get("integrations"), dict):
        db["integrations"] = {}
    if not isinstance(db.get("orders"), list):
        db["orders"] = []
    if not isinstance(db.get("products"), list):
        db["products"] = []
    if not isinstance(db.get("coupons"), list):
        db["coupons"] = []
    if not isinstance(db.get("storeSettings"), dict):
        db["storeSettings"] = _default_store_settings()
    if not isinstance(db.get("funnels"), list):
        db["funnels"] = []
    if not isinstance(db.get("classifications"), list):
        db["classifications"] = []
    if not isinstance(db.get("leads"), list):
        db["leads"] = []
    if not isinstance(db.get("igAccounts"), list):
        db["igAccounts"] = []

ensure_db_shape()

def persist():
    try:
        DATA_FILE.write_text(json.dumps(db, indent=2, ensure_ascii=False), "utf-8")
    except Exception:
        pass

processed = set()

events: list[dict] = []

def log_event(e: dict):
    eid = f"{int(time.time()*1000)}-{os.urandom(4).hex()}"
    events.append({"id": eid, "ts": int(time.time() * 1000), **e})
    if len(events) > 800:
        del events[: len(events) - 800]

# ---------- Evolution helpers ----------
def clean_url(u: str) -> str:
    return str(u or "").rstrip("/")

def evo_headers(api_key: str) -> dict:
    return {"Content-Type": "application/json", "apikey": api_key}

def is_instagram_inst(inst: dict) -> bool:
    return str((inst or {}).get("provider") or "").lower() == "instagram"

async def ig_send_text_inst(inst: dict, number: str, text: str) -> bool:
    """Envia DM do Instagram a partir de uma automacao."""
    import httpx
    ig_user_id = inst.get("igUserId")
    token = inst.get("accessToken")
    if not (ig_user_id and token):
        logger.warning("[ig sendText] instancia sem credenciais")
        return False
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.post(
                f"{IG_GRAPH_URL}/v23.0/{ig_user_id}/messages",
                headers={"Authorization": f"Bearer {token}"},
                json={"recipient": {"id": str(number)}, "message": {"text": text}},
            )
            if not res.is_success:
                logger.warning(f"[ig sendText] HTTP {res.status_code} {res.text[:200]}")
            return res.is_success
    except Exception as e:
        logger.warning(f"[ig sendText] error {e}")
        return False

def is_uazapi(inst: dict) -> bool:
    return str((inst or {}).get("provider") or "").lower() == "uazapi"

def uaz_headers(token: str) -> dict:
    return {"Content-Type": "application/json", "token": token}

async def uaz_send_text(inst: dict, number: str, text: str) -> bool:
    import httpx
    url = f"{clean_url(inst['serverUrl'])}/send/text"
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.post(url, headers=uaz_headers(inst["apiKey"]),
                                    json={"number": number, "text": text})
            if not res.is_success:
                logger.warning(f"[uaz sendText] HTTP {res.status_code} {res.text[:200]}")
            return res.is_success
    except Exception as e:
        logger.warning(f"[uaz sendText] error {e}")
        return False

async def uaz_set_webhook(inst: dict) -> bool:
    import httpx
    url = f"{clean_url(inst['serverUrl'])}/webhook"
    hook = f"{PUBLIC_URL}/webhook/{inst.get('instanceName') or ''}"
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.post(url, headers=uaz_headers(inst["apiKey"]), json={
                "enabled": True,
                "url": hook,
                "events": ["messages", "connection"],
                "excludeMessages": ["fromMe"],
                "action": "add",
            })
            if not res.is_success:
                logger.warning(f"[uaz setWebhook] HTTP {res.status_code} {res.text[:200]}")
            return res.is_success
    except Exception as e:
        logger.warning(f"[uaz setWebhook] error {e}")
        return False

async def evo_send_text(inst: dict, number: str, text: str) -> bool:
    if is_instagram_inst(inst):
        return await ig_send_text_inst(inst, number, text)
    if is_uazapi(inst):
        return await uaz_send_text(inst, number, text)
    import httpx
    url = f"{clean_url(inst['serverUrl'])}/message/sendText/{inst['instanceName']}"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(url, headers=evo_headers(inst["apiKey"]),
                                    json={"number": number, "text": text, "delay": 0})
            if not res.is_success:
                logger.warning(f"[sendText] HTTP {res.status_code}")
            return res.is_success
    except Exception as e:
        logger.warning(f"[sendText] error {e}")
        return False

async def evo_send_catalog(inst: dict, number: str, products: list) -> bool:
    lines = ["🛍️ *Catálogo de Produtos*"]
    for idx, p in enumerate(products):
        price = f"{float(p.get('price', 0)):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        lines.append(f"{idx+1}. {p.get('name','')} - R$ {price}")
    lines += ["", "Responda com o número do item para comprar."]
    return await evo_send_text(inst, number, "\n".join(lines))

async def evo_set_webhook(inst: dict) -> bool:
    if is_instagram_inst(inst):
        return True  # o webhook do Instagram e configurado no app da Meta
    if is_uazapi(inst):
        return await uaz_set_webhook(inst)
    import httpx
    url = f"{clean_url(inst['serverUrl'])}/webhook/set/{inst['instanceName']}"
    webhook_url = f"{PUBLIC_URL}/webhook"
    ev = ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
    bodies = [
        {"webhook": {"enabled": True, "url": webhook_url, "webhookByEvents": False, "webhookBase64": False, "events": ev}},
        {"url": webhook_url, "enabled": True, "webhook_by_events": False, "events": ev},
        {"enabled": True, "url": webhook_url, "events": ev},
    ]
    for body in bodies:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                res = await client.post(url, headers=evo_headers(inst["apiKey"]), json=body)
                if res.is_success:
                    logger.info(f"[webhook] registrado em {inst['instanceName']} -> {webhook_url}")
                    return True
        except Exception:
            pass
    logger.warning(f"[webhook] falha ao registrar em {inst['instanceName']}")
    return False

# ---------- automation engine ----------
def ig_account_as_instance(acc: dict) -> dict:
    """Converte uma conta do Instagram no mesmo formato usado pelo motor de fluxos."""
    return {
        "provider": "instagram",
        "instanceName": f"ig-{acc.get('userId')}",
        "channelId": acc.get("channelId"),
        "igUserId": str(acc.get("userId") or ""),
        "accessToken": acc.get("accessToken") or "",
        "username": acc.get("username") or "",
    }


def find_instance(instance_name: str) -> Optional[dict]:
    found = next((i for i in db["instances"] if i.get("instanceName") == instance_name), None)
    if found:
        return found
    # contas do Instagram tambem executam automacoes
    for acc in db.get("igAccounts") or []:
        if f"ig-{acc.get('userId')}" == instance_name:
            return ig_account_as_instance(acc)
    return None

def next_block(automation: dict, block_id: str, handle: str = None):
    conns = [c for c in automation.get("connections", []) if c.get("sourceBlockId") == block_id]
    if handle:
        m = next((c for c in conns if c.get("sourceHandle") == handle), None)
        if m:
            return next((b for b in automation.get("blocks", []) if b["id"] == m["targetBlockId"]), None)
    first = next((c for c in conns if not c.get("sourceHandle")), None) or (conns[0] if conns else None)
    return next((b for b in automation.get("blocks", []) if b["id"] == first["targetBlockId"]), None) if first else None

import re
def apply_vars(text: str, ctx: dict) -> str:
    text = str(text or "")
    text = re.sub(r"\{\{\s*nome\s*\}\}", ctx.get("name", ""), text, flags=re.IGNORECASE)
    text = re.sub(r"\{\{\s*name\s*\}\}", ctx.get("name", ""), text, flags=re.IGNORECASE)
    text = re.sub(r"\{\{\s*telefone\s*\}\}", ctx.get("number", ""), text, flags=re.IGNORECASE)
    text = re.sub(r"\{\{\s*numero\s*\}\}", ctx.get("number", ""), text, flags=re.IGNORECASE)
    text = re.sub(r"\{\{\s*mensagem\s*\}\}", ctx.get("text", ""), text, flags=re.IGNORECASE)
    text = re.sub(r"\{\{\s*ultima_mensagem\s*\}\}", ctx.get("text", ""), text, flags=re.IGNORECASE)
    text = re.sub(r"\{\{\s*email\s*\}\}", ctx.get("email", ""), text, flags=re.IGNORECASE)
    return text

def asaas_cfg():
    return db.get("integrations", {}).get("asaas")

async def fetch_asaas_payment_details(payment_id: str):
    cfg = asaas_cfg()
    if not cfg or not cfg.get("apiKey") or not payment_id:
        return None
    import httpx
    base = str(cfg.get("baseUrl", "https://sandbox.asaas.com/api/v3")).rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(f"{base}/payments/{payment_id}",
                                 headers={"Content-Type": "application/json", "access_token": cfg["apiKey"]})
            if not r.is_success:
                return None
            payment = r.json()
            pix = None
            if str(payment.get("billingType", "")).upper() == "PIX":
                pr = await client.get(f"{base}/payments/{payment_id}/pixQrCode",
                                      headers={"Content-Type": "application/json", "access_token": cfg["apiKey"]})
                if pr.is_success:
                    pix = pr.json()
            return {"payment": payment, "pix": pix}
    except Exception:
        return None

async def create_asaas_payment(customer_name: str, customer_phone: str, value: float, description: str, method: str = "PIX"):
    cfg = asaas_cfg()
    if not cfg or not cfg.get("apiKey"):
        return {"ok": False, "error": "ASAAS não configurado"}
    import httpx
    base = str(cfg.get("baseUrl", "https://sandbox.asaas.com/api/v3")).rstrip("/")
    phone = re.sub(r"\D", "", str(customer_phone or ""))
    cpf_cnpj = str(cfg.get("defaultCpfCnpj", "11111111111"))

    async with httpx.AsyncClient(timeout=20) as client:
        # Customer
        cr = await client.post(f"{base}/customers",
                               headers={"Content-Type": "application/json", "access_token": cfg["apiKey"]},
                               json={"name": customer_name or "Cliente WhatsApp", "cpfCnpj": cpf_cnpj, "mobilePhone": phone or None})
        if not cr.is_success:
            return {"ok": False, "error": f"ASAAS customer HTTP {cr.status_code}"}
        cj = cr.json()
        customer = cj.get("id")
        if not customer:
            return {"ok": False, "error": "ASAAS customer inválido"}

        # Payment
        from datetime import timedelta
        due = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
        billing_type = "UNDEFINED" if method == "CARD" else "PIX"
        pr = await client.post(f"{base}/payments",
                               headers={"Content-Type": "application/json", "access_token": cfg["apiKey"]},
                               json={"customer": customer, "billingType": billing_type, "value": value,
                                     "dueDate": due, "description": description or "Pagamento via WhatsApp"})
        if not pr.is_success:
            return {"ok": False, "error": f"ASAAS payment HTTP {pr.status_code}"}
        pj = pr.json()
        if not pj.get("id"):
            return {"ok": False, "error": "ASAAS payment inválido"}

        # PIX
        qj = None
        if billing_type == "PIX":
            qr = await client.get(f"{base}/payments/{pj['id']}/pixQrCode",
                                  headers={"Content-Type": "application/json", "access_token": cfg["apiKey"]})
            if not qr.is_success:
                return {"ok": False, "error": f"ASAAS pix HTTP {qr.status_code}"}
            qj = qr.json()

        pix_copy = ""
        pix_qr = ""
        if qj:
            pix_copy = qj.get("payload") or qj.get("encodedImage") or qj.get("qrCode", {}).get("payload") or qj.get("pixCopiaECola") or ""
            pix_qr = qj.get("encodedImage") or qj.get("qrCode", {}).get("encodedImage") or qj.get("base64Image") or ""
        invoice_url = pj.get("invoiceUrl") or pj.get("bankSlipUrl") or pj.get("transactionReceiptUrl") or ""

        return {
            "ok": True,
            "paymentId": pj["id"],
            "invoiceUrl": invoice_url,
            "pixCopyPaste": pix_copy,
            "pixQrCode": pix_qr,
            "billingType": billing_type,
            "value": value,
        }

async def run_flow(automation: dict, inst: dict, ctx: dict):
    start = next((b for b in automation.get("blocks", []) if b.get("type") == "start"), None)
    if not start:
        return
    trg = start.get("config") or {}
    trigger = trg.get("trigger", "message_received")
    message_triggers = ["message_received", "new_message", "keyword", "chat_started"]
    if trigger not in message_triggers:
        return
    if trg.get("channelId") and trg["channelId"] != ctx.get("channelId"):
        return
    keyword = trg.get("keyword")
    if keyword:
        text_lower = ctx.get("text", "").lower()
        kw = str(keyword).lower()
        match_mode = trg.get("keywordMatch", "contains")
        match = False
        if match_mode == "contains":
            match = kw in text_lower
        elif match_mode == "equals":
            match = text_lower == kw
        elif match_mode == "starts":
            match = text_lower.startswith(kw)
        elif match_mode == "regex":
            try:
                match = bool(re.search(kw, ctx.get("text", ""), re.IGNORECASE))
            except Exception:
                match = False
        if not match:
            return

    node = next_block(automation, start["id"])
    steps = 0
    while node and steps < 40:
        steps += 1
        c = node.get("config") or {}
        if node["type"] == "message":
            wait_before = min(float(c.get("waitBeforeSend", 0)), 30)
            if wait_before > 0:
                await asyncio.sleep(wait_before)
            out = apply_vars(c.get("text", ""), ctx)
            if c.get("showTyping"):
                await asyncio.sleep(1)
            await evo_send_text(inst, ctx["number"], out)
            log_event({"instance": ctx["instance"], "channelId": ctx.get("channelId"), "number": ctx["number"],
                        "name": ctx.get("name", ""), "direction": "out", "text": out,
                        "platform": ctx.get("platform", "whatsapp")})
            node = next_block(automation, node["id"])
        elif node["type"] == "menu":
            opts = "\n".join(filter(None, str(c.get("menuOptions", "")).split("\n")))
            parts = [p for p in [c.get("menuText"), opts] if p]
            body = apply_vars("\n\n".join(parts), ctx)
            if body:
                await evo_send_text(inst, ctx["number"], body)
                log_event({"instance": ctx["instance"], "channelId": ctx.get("channelId"), "number": ctx["number"],
                            "name": ctx.get("name", ""), "direction": "out", "text": body,
                            "platform": ctx.get("platform", "whatsapp")})
            node = next_block(automation, node["id"])
        elif node["type"] == "wait":
            units = {"seconds": 1, "minutes": 60, "hours": 3600, "days": 86400}
            secs = float(c.get("waitValue", 1)) * units.get(c.get("waitUnit"), 60)
            await asyncio.sleep(min(secs, 15))
            node = next_block(automation, node["id"])
        elif node["type"] == "condition":
            passed = True
            if (c.get("condType") or "keyword") == "keyword":
                passed = str(c.get("condValue", "")).lower() in ctx.get("text", "").lower()
            node = next_block(automation, node["id"], "yes" if passed else "no")
        else:
            node = next_block(automation, node["id"])

async def handle_incoming(instance_name: str, number: str, text: str, name: str, platform: str = "whatsapp"):
    inst = find_instance(instance_name)
    if not inst:
        logger.warning(f"[engine] instancia desconhecida: {instance_name}")
        return
    log_event({"instance": instance_name, "channelId": inst.get("channelId"), "number": number,
                "name": name or "", "direction": "in", "text": text or "",
                "platform": platform})
    active = [a for a in db["automations"]
              if a.get("isActive") and (not a.get("channelId") or a.get("channelId") == inst.get("channelId"))]
    if not active:
        logger.info(f"[engine] nenhuma automacao ativa para {instance_name}")
        return
    ctx = {"number": number, "text": text or "", "name": name or "",
           "channelId": inst.get("channelId"), "instance": instance_name,
           "platform": platform}
    for a in active:
        logger.info(f'[engine] executando "{a.get("name")}" para {number}: "{text}"')
        try:
            await run_flow(a, inst, ctx)
        except Exception as e:
            logger.warning(f"[engine] erro {e}")

# ---------- Meta Cloud API helpers ----------
GRAPH_URL = "https://graph.facebook.com/v21.0"

def find_meta_instance(phone_number_id: str) -> Optional[dict]:
    """Find a Meta Cloud API instance by phoneNumberId."""
    return next((i for i in db["instances"] if i.get("phoneNumberId") == phone_number_id), None)

async def meta_send_text(phone_number_id: str, access_token: str, to: str, text: str) -> bool:
    import httpx
    number = re.sub(r"\D", "", str(to))
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(
                f"{GRAPH_URL}/{phone_number_id}/messages",
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {access_token}"},
                json={"messaging_product": "whatsapp", "to": number, "type": "text", "text": {"body": text}},
            )
            if not res.is_success:
                logger.warning(f"[meta-send] HTTP {res.status_code}: {res.text[:200]}")
            return res.is_success
    except Exception as e:
        logger.warning(f"[meta-send] error {e}")
        return False

async def meta_send_interactive_cta(phone_number_id: str, access_token: str, to: str, body_text: str, button_text: str, url: str) -> bool:
    import httpx
    number = re.sub(r"\D", "", str(to))
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(
                f"{GRAPH_URL}/{phone_number_id}/messages",
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {access_token}"},
                json={
                    "messaging_product": "whatsapp", "to": number, "type": "interactive",
                    "interactive": {
                        "type": "cta_url",
                        "body": {"text": body_text},
                        "action": {"name": "cta_url", "parameters": {"display_text": button_text, "url": url}},
                    },
                },
            )
            return res.is_success
    except Exception as e:
        logger.warning(f"[meta-cta] error {e}")
        return False

# ---------- uid helper ----------
def uid():
    return f"id-{int(time.time()*1000)}-{os.urandom(4).hex()}"

# ---------- API routes ----------
@app.get("/api/health")
async def health():
    return {"ok": True, "publicUrl": PUBLIC_URL,
            "instances": len(db.get("instances", [])),
            "automations": len(db.get("automations", []))}

@app.get("/api/events")
async def get_events(since: int = 0):
    return {"now": int(time.time() * 1000),
            "events": [e for e in events if e.get("ts", 0) > since]}

@app.post("/api/sync")
async def sync(request: Request):
    body = await request.json()
    instances = body.get("instances")
    automations = body.get("automations")
    integrations = body.get("integrations")
    if isinstance(instances, list):
        db["instances"] = [i for i in instances if i and i.get("serverUrl") and i.get("apiKey") and i.get("instanceName")]
    if isinstance(automations, list):
        db["automations"] = automations
    ig_accounts = body.get("igAccounts")
    if isinstance(ig_accounts, list):
        db["igAccounts"] = [
            a for a in ig_accounts
            if a and a.get("userId") and a.get("accessToken")
        ]
    if integrations and isinstance(integrations, (dict, list)):
        if isinstance(integrations, list):
            mapped = {}
            for item in integrations:
                if item and item.get("id") and item.get("connected") and item.get("credentials"):
                    mapped[item["id"]] = item["credentials"]
            db["integrations"] = mapped
        else:
            db["integrations"] = integrations
    persist()
    results = []
    for inst in db["instances"]:
        ok = await evo_set_webhook(inst)
        results.append({"instance": inst["instanceName"], "webhook": ok})
    return {"ok": True, "webhookUrl": f"{PUBLIC_URL}/webhook",
            "instances": len(db["instances"]), "automations": len(db["automations"]), "results": results}

@app.post("/api/crm/sync")
async def crm_sync(request: Request):
    ensure_db_shape()
    body = await request.json()
    funnel = body.get("funnel") or {}
    leads_data = body.get("leads")
    if not funnel.get("id"):
        return {"ok": False, "error": "Funil inválido"}
    now = datetime.now(timezone.utc).isoformat()
    normalized_stages = []
    for idx, stage in enumerate(funnel.get("stages") or []):
        normalized_stages.append({
            **stage,
            "funnelId": funnel["id"],
            "order": int(stage.get("order") or idx + 1),
            "createdAt": stage.get("createdAt") or now,
            "updatedAt": now,
        })
    saved_funnel = {**funnel, "stages": normalized_stages, "updatedAt": now}
    fi = next((i for i, f in enumerate(db["funnels"]) if f and f.get("id") == funnel["id"]), -1)
    if fi >= 0:
        db["funnels"][fi] = {**db["funnels"][fi], **saved_funnel}
    else:
        db["funnels"].append({"createdAt": now, **saved_funnel})
    db["classifications"] = [c for c in db["classifications"] if c.get("funnelId") != funnel["id"]] + normalized_stages
    if isinstance(leads_data, list):
        scoped = [{**lead, "funnelId": funnel["id"], "updatedAt": now, "createdAt": lead.get("createdAt") or now} for lead in leads_data]
        db["leads"] = [l for l in db["leads"] if l.get("funnelId") != funnel["id"]] + scoped
    persist()
    return {"ok": True, "funnel": saved_funnel, "classifications": normalized_stages}

@app.post("/api/instance/webhook")
async def instance_webhook(request: Request):
    inst = await request.json()
    if not inst.get("serverUrl") or not inst.get("apiKey") or not inst.get("instanceName"):
        return {"ok": False, "error": "creds incompletas"}
    existing = find_instance(inst["instanceName"])
    if existing:
        existing.update(inst)
    else:
        db["instances"].append(inst)
    persist()
    ok = await evo_set_webhook(inst)
    return {"ok": ok, "webhookUrl": f"{PUBLIC_URL}/webhook"}

@app.post("/api/payments/create")
async def payments_create(request: Request):
    ensure_db_shape()
    body = await request.json()
    instance_name = body.get("instanceName")
    number = body.get("number")
    customer_name = body.get("customerName")
    product_id = body.get("productId")
    amount = body.get("amount")
    description = body.get("description")
    method = body.get("method", "PIX")
    original_amount = body.get("originalAmount")
    discount_amount = body.get("discountAmount")

    inst = find_instance(instance_name)
    if not inst:
        return {"ok": False, "error": "Instância não encontrada"}
    product = next((p for p in db["products"] if p.get("id") == product_id), None)
    base_value = float(original_amount or amount or (product.get("price") if product else 0) or 0)
    norm_discount = max(0, float(discount_amount or 0))
    value = max(0, round(base_value - norm_discount, 2))
    if not value or value <= 0:
        return {"ok": False, "error": "Valor inválido"}

    result = await create_asaas_payment(
        customer_name=customer_name or "Cliente WhatsApp",
        customer_phone=number,
        value=value,
        description=description or (f"Compra de {product['name']}" if product else "Compra via WhatsApp"),
        method=method,
    )
    if not result.get("ok"):
        return result

    order = {
        "id": f"ord-{int(time.time()*1000)}-{os.urandom(4).hex()}",
        "instanceName": instance_name,
        "conversationId": body.get("conversationId"),
        "contactId": body.get("contactId"),
        "channelId": body.get("channelId") or inst.get("channelId"),
        "agentId": body.get("agentId"),
        "agentName": body.get("agentName"),
        "number": number,
        "customerPhone": number,
        "customerName": customer_name or "Cliente WhatsApp",
        "productId": product_id,
        "productName": product["name"] if product else (description or "Pedido"),
        "productCategory": product.get("category") if product else None,
        "originalAmount": base_value,
        "discountAmount": norm_discount,
        "couponCode": body.get("couponCode"),
        "couponType": body.get("couponType"),
        "couponValue": body.get("couponValue"),
        "amount": value,
        "total": value,
        "paymentId": result["paymentId"],
        "paymentMethod": method,
        "invoiceUrl": result.get("invoiceUrl", ""),
        "status": "pending",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "source": "chat",
    }
    db["orders"].append(order)
    persist()

    price_str = f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    payment_msg_parts = [
        f"✅ Pedido criado: *{order['productName']}*",
        f"💳 Valor: *R$ {price_str}*",
        "💠 Forma: *Cartão de crédito*" if method == "CARD" else "💠 Forma: *PIX*",
        "",
    ]
    if method != "CARD" and result.get("pixCopyPaste"):
        payment_msg_parts += ["🔑 *PIX copia e cola:*", result["pixCopyPaste"], ""]
    if result.get("invoiceUrl"):
        payment_msg_parts.append(f"🔗 Finalizar pagamento: {result['invoiceUrl']}")
    payment_msg_parts += ["", "Assim que o pagamento for confirmado, você receberá a confirmação automática aqui ✅"]
    payment_msg = "\n".join(payment_msg_parts)

    sent = await evo_send_text(inst, number, payment_msg)
    if not sent:
        return {"ok": False, "error": "Pagamento criado no Asaas, mas falhou ao enviar mensagem no WhatsApp.",
                "order": order, "payment": result}
    log_event({"instance": instance_name, "channelId": inst.get("channelId"), "number": number,
                "name": customer_name or "", "direction": "out", "text": payment_msg})
    return {"ok": True, "order": order, "payment": result}

@app.get("/api/store/orders")
async def store_orders():
    ensure_db_shape()
    orders = sorted(db["orders"], key=lambda o: o.get("createdAt", ""), reverse=True)
    return {"ok": True, "orders": orders}

@app.get("/api/store/orders/{order_id}")
async def store_order_detail(order_id: str):
    ensure_db_shape()
    order = next((o for o in db["orders"] if o.get("id") == order_id), None)
    if not order:
        return {"ok": False, "error": "Pedido não encontrado"}
    payment_details = await fetch_asaas_payment_details(order.get("paymentId"))
    return {"ok": True, "order": order, "paymentDetails": payment_details}

@app.delete("/api/store/orders/{order_id}")
async def store_order_delete(order_id: str):
    ensure_db_shape()
    before = len(db["orders"])
    db["orders"] = [o for o in db["orders"] if o.get("id") != order_id]
    persist()
    return {"ok": True, "deleted": before != len(db["orders"])}

@app.get("/api/store/products")
async def store_products():
    ensure_db_shape()
    return {"ok": True, "products": db["products"]}

@app.post("/api/store/products")
async def store_product_create(request: Request):
    ensure_db_shape()
    data = await request.json()
    if not str(data.get("name", "")).strip():
        return {"ok": False, "error": "Nome do produto é obrigatório"}
    created = {
        "id": data.get("id") or f"prd-{int(time.time()*1000)}-{os.urandom(4).hex()}",
        "name": str(data.get("name", "")).strip(),
        "sku": str(data.get("sku", "")).strip(),
        "category": str(data.get("category", "")).strip(),
        "price": float(data.get("price", 0)),
        "stock": int(data.get("stock", 0)),
        "active": data.get("active") is not False,
        "createdAt": data.get("createdAt") or datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    db["products"].insert(0, created)
    persist()
    return {"ok": True, "product": created}

@app.put("/api/store/products/{product_id}")
async def store_product_update(product_id: str, request: Request):
    ensure_db_shape()
    idx = next((i for i, p in enumerate(db["products"]) if p.get("id") == product_id), -1)
    if idx < 0:
        return {"ok": False, "error": "Produto não encontrado"}
    body = await request.json()
    current = db["products"][idx]
    updated = {
        **current, **body,
        "id": current["id"],
        "price": float(body.get("price", current.get("price", 0))),
        "stock": int(body.get("stock", current.get("stock", 0))),
        "active": bool(body["active"]) if "active" in body else current.get("active", True),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    db["products"][idx] = updated
    persist()
    return {"ok": True, "product": updated}

@app.delete("/api/store/products/{product_id}")
async def store_product_delete(product_id: str):
    ensure_db_shape()
    before = len(db["products"])
    db["products"] = [p for p in db["products"] if p.get("id") != product_id]
    persist()
    return {"ok": True, "deleted": before != len(db["products"])}

@app.get("/api/store/coupons")
async def store_coupons():
    ensure_db_shape()
    return {"ok": True, "coupons": db["coupons"]}

@app.post("/api/store/coupons")
async def store_coupon_create(request: Request):
    ensure_db_shape()
    data = await request.json()
    if not str(data.get("code", "")).strip():
        return {"ok": False, "error": "Código do cupom é obrigatório"}
    created = {
        "id": data.get("id") or f"cpn-{int(time.time()*1000)}-{os.urandom(4).hex()}",
        "code": str(data.get("code", "")).strip().upper(),
        "type": "fixed" if data.get("type") == "fixed" else "percent",
        "value": float(data.get("value", 0)),
        "active": data.get("active") is not False,
        "createdAt": data.get("createdAt") or datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    db["coupons"].insert(0, created)
    persist()
    return {"ok": True, "coupon": created}

@app.put("/api/store/coupons/{coupon_id}")
async def store_coupon_update(coupon_id: str, request: Request):
    ensure_db_shape()
    idx = next((i for i, c in enumerate(db["coupons"]) if c.get("id") == coupon_id), -1)
    if idx < 0:
        return {"ok": False, "error": "Cupom não encontrado"}
    body = await request.json()
    current = db["coupons"][idx]
    ctype = body.get("type", current.get("type", "percent"))
    if ctype not in ("fixed", "percent"):
        ctype = current.get("type", "percent")
    updated = {
        **current, **body,
        "id": current["id"],
        "code": str(body.get("code", current.get("code", ""))).strip().upper(),
        "type": ctype,
        "value": float(body.get("value", current.get("value", 0))),
        "active": bool(body["active"]) if "active" in body else current.get("active", True),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    db["coupons"][idx] = updated
    persist()
    return {"ok": True, "coupon": updated}

@app.delete("/api/store/coupons/{coupon_id}")
async def store_coupon_delete(coupon_id: str):
    ensure_db_shape()
    before = len(db["coupons"])
    db["coupons"] = [c for c in db["coupons"] if c.get("id") != coupon_id]
    persist()
    return {"ok": True, "deleted": before != len(db["coupons"])}

@app.get("/api/store/settings")
async def store_settings_get():
    ensure_db_shape()
    return {"ok": True, "settings": db["storeSettings"]}

@app.put("/api/store/settings")
async def store_settings_update(request: Request):
    ensure_db_shape()
    body = await request.json()
    db["storeSettings"] = {**_default_store_settings(), **(db["storeSettings"] or {}), **body}
    persist()
    return {"ok": True, "settings": db["storeSettings"]}

@app.post("/api/store/send-catalog")
async def store_send_catalog(request: Request):
    body = await request.json()
    instance_name = body.get("instanceName")
    number = body.get("number")
    products = body.get("products")
    inst = find_instance(instance_name)
    if not inst:
        return {"ok": False, "error": "Instância não encontrada"}
    product_list = products if isinstance(products, list) and products else db["products"][:20]
    ok = await evo_send_catalog(inst, number, product_list)
    if not ok:
        return {"ok": False, "error": "Falha ao enviar catálogo"}
    log_event({"instance": instance_name, "channelId": inst.get("channelId"), "number": number,
                "name": "", "direction": "out", "text": "Catálogo enviado"})
    return {"ok": True}

@app.post("/api/asaas/webhook")
async def asaas_webhook(request: Request):
    sig = request.headers.get("asaas-access-token") or request.headers.get("x-asaas-signature")
    cfg = asaas_cfg()
    if cfg and cfg.get("webhookToken") and sig and str(sig) != str(cfg["webhookToken"]):
        return {"ok": False, "error": "assinatura inválida"}
    payload = await request.json()
    evt = str(payload.get("event", ""))
    payment = payload.get("payment") or {}
    payment_id = payment.get("id")
    if not payment_id:
        return {"ok": True}
    order = next((o for o in db["orders"] if o.get("paymentId") == payment_id), None)
    if not order:
        return {"ok": True}
    if "PAYMENT_CONFIRMED" in evt or "PAYMENT_RECEIVED" in evt:
        order["status"] = "paid"
        order["paidAt"] = datetime.now(timezone.utc).isoformat()
        order["updatedAt"] = datetime.now(timezone.utc).isoformat()
        if order.get("productId"):
            product = next((p for p in db["products"] if p.get("id") == order["productId"]), None)
            if product and isinstance(product.get("stock"), (int, float)):
                product["stock"] = max(0, int(product.get("stock", 0)) - 1)
                product["updatedAt"] = datetime.now(timezone.utc).isoformat()
        persist()
        inst = find_instance(order.get("instanceName"))
        if inst:
            price_str = f"{float(order.get('amount', 0)):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            txt = f"🎉 Pagamento confirmado com sucesso!\nPedido: *{order.get('productName')}*\nValor: *R$ {price_str}*"
            await evo_send_text(inst, order["number"], txt)
            log_event({"instance": order["instanceName"], "channelId": inst.get("channelId"),
                        "number": order["number"], "name": order.get("customerName", ""),
                        "direction": "out", "text": txt})
    return {"ok": True}

# ---------- Webhook endpoints ----------
async def process_webhook(request: Request, instance: str = None, event_name: str = None):
    payload = await request.json()
    evt = str(payload.get("event") or payload.get("type") or payload.get("EventType") or "").lower().replace("_", ".")
    instance_name = payload.get("instance") or payload.get("instanceName") or instance

    # ---- formato uazapi: {event: "message"|"messages", instance, data|message: {...}} ----
    if evt in ("message", "messages"):
        uaz_msg = payload.get("message") or payload.get("data") or {}
        if isinstance(uaz_msg, dict) and ("sender" in uaz_msg or "chatid" in uaz_msg):
            if uaz_msg.get("fromMe") or uaz_msg.get("isGroup"):
                return {"received": True}
            mid = uaz_msg.get("messageid") or uaz_msg.get("id")
            if mid and mid in processed:
                return {"received": True}
            if mid:
                processed.add(mid)
                if len(processed) > 5000:
                    processed.clear()
            raw_sender = str(uaz_msg.get("sender") or uaz_msg.get("chatid") or "")
            number = raw_sender.split("@")[0].split(":")[0]
            text = str(uaz_msg.get("text") or uaz_msg.get("content") or "")
            if number:
                asyncio.create_task(handle_incoming(instance_name, number, text, uaz_msg.get("senderName", "")))
            return {"received": True}

    if evt not in ("messages.upsert", "messages.update"):
        return {"received": True}

    data_raw = payload.get("data")
    items = data_raw if isinstance(data_raw, list) else [data_raw]
    for data in items:
        if not data or not data.get("key"):
            continue
        if data["key"].get("fromMe"):
            continue
        remote_jid = data["key"].get("remoteJid", "")
        if remote_jid.endswith("@g.us"):
            continue
        msg_id = data["key"].get("id")
        if msg_id and msg_id in processed:
            continue
        if msg_id:
            processed.add(msg_id)
            if len(processed) > 5000:
                processed.clear()
        number = remote_jid.split("@")[0]
        m = data.get("message") or {}
        text = (m.get("conversation")
                or (m.get("extendedTextMessage") or {}).get("text")
                or (m.get("imageMessage") or {}).get("caption")
                or (m.get("videoMessage") or {}).get("caption")
                or (m.get("buttonsResponseMessage") or {}).get("selectedButtonId")
                or ((m.get("listResponseMessage") or {}).get("singleSelectReply") or {}).get("selectedRowId")
                or "")
        if not number:
            continue
        asyncio.create_task(handle_incoming(instance_name, number, text, data.get("pushName", "")))
    return {"received": True}

@app.post("/api/webhook")
async def webhook_root(request: Request):
    return await process_webhook(request)

@app.post("/api/webhook/{instance}")
async def webhook_instance(instance: str, request: Request):
    return await process_webhook(request, instance=instance)

@app.post("/api/webhook/{instance}/{event_name}")
async def webhook_instance_event(instance: str, event_name: str, request: Request):
    return await process_webhook(request, instance=instance, event_name=event_name)

@app.post("/api/meta/send-text")
async def meta_send_text_endpoint(request: Request):
    """Send a text message via Meta Cloud API."""
    body = await request.json()
    phone_number_id = body.get("phoneNumberId")
    access_token = body.get("accessToken")
    to = body.get("to")
    text = body.get("text")
    if not phone_number_id or not access_token or not to or not text:
        return {"ok": False, "error": "Parâmetros obrigatórios: phoneNumberId, accessToken, to, text"}
    ok = await meta_send_text(phone_number_id, access_token, to, text)
    return {"ok": ok}

@app.post("/api/meta/send-pix")
async def meta_send_pix_endpoint(request: Request):
    """Send a PIX payment message via Meta Cloud API."""
    body = await request.json()
    phone_number_id = body.get("phoneNumberId")
    access_token = body.get("accessToken")
    to = body.get("to")
    product_name = body.get("productName", "Produto")
    amount = float(body.get("amount", 0))
    pix_copy_paste = body.get("pixCopyPaste", "")
    invoice_url = body.get("invoiceUrl", "")

    if not phone_number_id or not access_token or not to or amount <= 0:
        return {"ok": False, "error": "Parâmetros inválidos"}

    price_str = f"{amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    lines = [
        "✅ *Cobrança PIX*", "",
        f"Produto: *{product_name}*",
        f"Valor: *R$ {price_str}*", "",
    ]
    if pix_copy_paste:
        lines += ["🔑 *Código PIX (copie e cole):*", pix_copy_paste, ""]
    if invoice_url:
        lines.append(f"🔗 Pagar online: {invoice_url}")
    lines += ["", "Após o pagamento, envie o comprovante aqui para confirmação ✅"]
    text = "\n".join(lines)

    if invoice_url:
        ok = await meta_send_interactive_cta(phone_number_id, access_token, to, text, "💳 Pagar agora", invoice_url)
    else:
        ok = await meta_send_text(phone_number_id, access_token, to, text)

    log_event({"instance": f"meta-{phone_number_id}", "number": to, "direction": "out", "text": text, "name": ""})
    return {"ok": ok}

@app.get("/api/meta/webhook")
async def meta_webhook_verify(request: Request):
    """Meta webhook verification (GET)."""
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    # Accept any verify token for now; in production, match against stored token
    if mode == "subscribe" and challenge:
        return Response(content=challenge, media_type="text/plain")
    return Response(content="Forbidden", status_code=403)

@app.post("/api/meta/webhook")
async def meta_webhook_receive(request: Request):
    """Receive incoming messages from Meta Cloud API webhook."""
    payload = await request.json()
    entries = payload.get("entry", [])
    for entry in entries:
        for change in entry.get("changes", []):
            value = change.get("value", {})
            messages = value.get("messages", [])
            metadata = value.get("metadata", {})
            phone_number_id = metadata.get("phone_number_id", "")
            contacts = value.get("contacts", [])

            for msg in messages:
                if msg.get("type") != "text":
                    continue
                from_number = msg.get("from", "")
                text = msg.get("text", {}).get("body", "")
                contact_name = ""
                if contacts:
                    profile = contacts[0].get("profile", {})
                    contact_name = profile.get("name", "")

                log_event({
                    "instance": f"meta-{phone_number_id}",
                    "number": from_number,
                    "name": contact_name,
                    "direction": "in",
                    "text": text,
                })

                # Try to run automations for this Meta channel
                inst = find_meta_instance(phone_number_id)
                if inst:
                    ctx = {"number": from_number, "text": text, "name": contact_name,
                           "channelId": inst.get("channelId"), "instance": f"meta-{phone_number_id}"}
                    active = [a for a in db["automations"]
                              if a.get("isActive") and (not a.get("channelId") or a.get("channelId") == inst.get("channelId"))]
                    for a in active:
                        asyncio.create_task(run_flow(a, inst, ctx))
    return {"ok": True}

# Also support without /api prefix for Evolution compatibility
@app.post("/webhook")
async def webhook_noapi(request: Request):
    return await process_webhook(request)

@app.post("/webhook/{instance}")
async def webhook_noapi_instance(instance: str, request: Request):
    return await process_webhook(request, instance=instance)

@app.post("/webhook/{instance}/{event_name}")
async def webhook_noapi_instance_event(instance: str, event_name: str, request: Request):
    return await process_webhook(request, instance=instance, event_name=event_name)


# ============================================================
# UAZAPI: proxy server-side (evita CORS no navegador)
# ============================================================

UAZAPI_TIMEOUT = 30
UAZAPI_ALLOWED_METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE"}


@app.post("/api/uazapi/proxy")
async def uazapi_proxy(request: Request):
    """Encaminha uma chamada para a uazapi.

    Body: { baseUrl, path, method, token?, admintoken?, body? }
    """
    import httpx

    body = await request.json()
    base_url = clean_url(str(body.get("baseUrl") or ""))
    path = str(body.get("path") or "")
    method = str(body.get("method") or "GET").upper()
    token = body.get("token")
    admintoken = body.get("admintoken")
    payload = body.get("body")

    if not base_url or not path:
        return {"ok": False, "error": "baseUrl e path sao obrigatorios"}
    if method not in UAZAPI_ALLOWED_METHODS:
        return {"ok": False, "error": f"metodo {method} nao permitido"}
    if not base_url.startswith("http"):
        base_url = f"https://{base_url}"
    if not path.startswith("/"):
        path = "/" + path

    headers = {"Content-Type": "application/json"}
    if token:
        headers["token"] = str(token)
    if admintoken:
        headers["admintoken"] = str(admintoken)

    try:
        async with httpx.AsyncClient(timeout=UAZAPI_TIMEOUT) as client:
            resp = await client.request(
                method,
                f"{base_url}{path}",
                headers=headers,
                json=payload if method != "GET" else None,
            )
        try:
            data = resp.json()
        except Exception:
            data = {"raw": resp.text}
        return {"ok": resp.status_code < 400, "status": resp.status_code, "data": data}
    except Exception as e:
        logger.warning("uazapi proxy error: %s", e)
        return {"ok": False, "error": str(e)}


# ============================================================
# Instagram: Login com Instagram (Instagram API with Instagram Login)
# ============================================================

IG_AUTH_URL = "https://www.instagram.com/oauth/authorize"
IG_TOKEN_URL = "https://api.instagram.com/oauth/access_token"
IG_GRAPH_URL = "https://graph.instagram.com"
IG_DEFAULT_SCOPES = "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments"

# resultados temporarios do OAuth, consumidos uma unica vez pelo frontend
IG_SESSIONS: dict = {}


def ig_config() -> dict:
    """Credenciais do app global do Instagram. Env vars tem prioridade."""
    saved = (db.get("integrations") or {}).get("instagram_app") or {}
    return {
        "appId": os.environ.get("IG_APP_ID") or saved.get("appId") or "",
        "appSecret": os.environ.get("IG_APP_SECRET") or saved.get("appSecret") or "",
        "redirectUri": os.environ.get("IG_REDIRECT_URI") or saved.get("redirectUri") or f"{PUBLIC_URL}/instagram/callback",
        "scopes": saved.get("scopes") or IG_DEFAULT_SCOPES,
        "verifyToken": os.environ.get("IG_VERIFY_TOKEN") or saved.get("verifyToken") or "",
        "fromEnv": bool(os.environ.get("IG_APP_ID")),
    }


@app.get("/api/integrations/instagram/config")
async def ig_get_config():
    cfg = ig_config()
    return {
        "ok": True,
        "appId": cfg["appId"],
        "redirectUri": cfg["redirectUri"],
        "scopes": cfg["scopes"],
        "verifyToken": cfg["verifyToken"],
        "webhookUrl": f"{PUBLIC_URL}/instagram/webhook",
        "hasSecret": bool(cfg["appSecret"]),
        "fromEnv": cfg["fromEnv"],
        "configured": bool(cfg["appId"] and cfg["appSecret"]),
    }


@app.post("/api/integrations/instagram/config")
async def ig_save_config(request: Request):
    body = await request.json()
    integrations = db.get("integrations")
    if not isinstance(integrations, dict):
        integrations = {}
    current = integrations.get("instagram_app") or {}
    app_id = str(body.get("appId") or "").strip()
    app_secret = str(body.get("appSecret") or "").strip()
    redirect_uri = str(body.get("redirectUri") or "").strip()
    scopes = str(body.get("scopes") or "").strip()

    current["appId"] = app_id or current.get("appId", "")
    # secret vazio no formulario significa "manter o que ja esta salvo"
    if app_secret:
        current["appSecret"] = app_secret
    current["redirectUri"] = redirect_uri or current.get("redirectUri", "")
    current["scopes"] = scopes or current.get("scopes", IG_DEFAULT_SCOPES)
    verify_token = str(body.get("verifyToken") or "").strip()
    current["verifyToken"] = verify_token or current.get("verifyToken") or os.urandom(12).hex()

    integrations["instagram_app"] = current
    db["integrations"] = integrations
    persist()
    return await ig_get_config()


@app.get("/api/instagram/auth-url")
async def ig_auth_url(state: str = ""):
    """Monta a URL de autorizacao mantendo o app id no servidor."""
    cfg = ig_config()
    if not cfg["appId"] or not cfg["appSecret"]:
        return {"ok": False, "error": "App do Instagram nao configurado no Administrativo Geral."}
    if not state:
        state = uid()
    from urllib.parse import urlencode

    query = urlencode({
        "client_id": cfg["appId"],
        "redirect_uri": cfg["redirectUri"],
        "response_type": "code",
        "scope": cfg["scopes"],
        "state": state,
    })
    return {"ok": True, "url": f"{IG_AUTH_URL}?{query}", "state": state, "redirectUri": cfg["redirectUri"]}


def _ig_popup_html(title: str, message: str, payload: dict) -> str:
    safe = json.dumps(payload)
    return f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>{title}</title>
<style>
 body{{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0f1a2e;color:#fff;display:flex;
 align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:2rem}}
 .box{{max-width:420px}} h1{{font-size:1.2rem;margin:0 0 .5rem}} p{{color:#aab3c5;font-size:.9rem;line-height:1.5}}
</style></head>
<body><div class="box"><h1>{title}</h1><p>{message}</p></div>
<script>
 var payload = {safe};
 try {{ if (window.opener) window.opener.postMessage({{ source: 'leadflow-instagram', payload: payload }}, '*'); }} catch (e) {{}}
 setTimeout(function () {{ window.close(); }}, 2500);
</script></body></html>"""


@app.get("/api/instagram/callback")
async def ig_callback(code: str = "", state: str = "", error: str = "", error_description: str = ""):
    """Recebe o retorno do Instagram, troca o code por token de longa duracao."""
    import httpx

    if error:
        payload = {"ok": False, "error": error_description or error}
        if state:
            IG_SESSIONS[state] = payload
        return Response(
            content=_ig_popup_html("Autorizacao cancelada", error_description or error, payload),
            media_type="text/html",
        )

    cfg = ig_config()
    if not cfg["appId"] or not cfg["appSecret"]:
        payload = {"ok": False, "error": "App do Instagram nao configurado."}
        if state:
            IG_SESSIONS[state] = payload
        return Response(content=_ig_popup_html("Configuracao ausente", payload["error"], payload), media_type="text/html")

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # 1) code -> token de curta duracao
            short = await client.post(
                IG_TOKEN_URL,
                data={
                    "client_id": cfg["appId"],
                    "client_secret": cfg["appSecret"],
                    "grant_type": "authorization_code",
                    "redirect_uri": cfg["redirectUri"],
                    "code": code,
                },
            )
            short_data = short.json()
            if short.status_code >= 400 or not short_data.get("access_token"):
                raise RuntimeError(short_data.get("error_message") or short_data.get("error") or "Falha ao trocar o code por token")

            short_token = short_data["access_token"]
            ig_user_id = str(short_data.get("user_id") or "")

            # 2) token de curta -> longa duracao (60 dias)
            long_resp = await client.get(
                f"{IG_GRAPH_URL}/access_token",
                params={
                    "grant_type": "ig_exchange_token",
                    "client_secret": cfg["appSecret"],
                    "access_token": short_token,
                },
            )
            long_data = long_resp.json()
            access_token = long_data.get("access_token") or short_token
            expires_in = long_data.get("expires_in")

            # 3) dados do perfil conectado
            profile = {}
            try:
                me = await client.get(
                    f"{IG_GRAPH_URL}/v23.0/me",
                    params={
                        "fields": "user_id,username,name,profile_picture_url,account_type",
                        "access_token": access_token,
                    },
                )
                if me.status_code < 400:
                    profile = me.json()
            except Exception:
                profile = {}

        payload = {
            "ok": True,
            "accessToken": access_token,
            "userId": str(profile.get("user_id") or ig_user_id),
            "username": profile.get("username") or "",
            "name": profile.get("name") or "",
            "profilePicture": profile.get("profile_picture_url") or "",
            "accountType": profile.get("account_type") or "",
            "expiresIn": expires_in,
            "connectedAt": datetime.now(timezone.utc).isoformat(),
        }
        if state:
            IG_SESSIONS[state] = payload
        return Response(
            content=_ig_popup_html(
                "Instagram conectado",
                f"Conta @{payload['username'] or payload['userId']} autorizada. Pode fechar esta janela.",
                payload,
            ),
            media_type="text/html",
        )
    except Exception as e:
        logger.warning("instagram callback error: %s", e)
        payload = {"ok": False, "error": str(e)}
        if state:
            IG_SESSIONS[state] = payload
        return Response(content=_ig_popup_html("Falha na conexao", str(e), payload), media_type="text/html")


@app.get("/api/instagram/result")
async def ig_result(state: str):
    """O frontend consulta aqui o resultado do popup (consumido uma unica vez)."""
    if state in IG_SESSIONS:
        return {"ok": True, "ready": True, "result": IG_SESSIONS.pop(state)}
    return {"ok": True, "ready": False}


@app.post("/api/instagram/send-text")
async def ig_send_text(request: Request):
    """Envia DM pelo Instagram usando o token da conta conectada."""
    import httpx

    body = await request.json()
    access_token = str(body.get("accessToken") or "")
    ig_user_id = str(body.get("userId") or "")
    recipient = str(body.get("to") or "")
    text = str(body.get("text") or "")
    if not (access_token and ig_user_id and recipient and text):
        return {"ok": False, "error": "accessToken, userId, to e text sao obrigatorios"}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                f"{IG_GRAPH_URL}/v23.0/{ig_user_id}/messages",
                headers={"Authorization": f"Bearer {access_token}"},
                json={"recipient": {"id": recipient}, "message": {"text": text}},
            )
        data = resp.json() if resp.content else {}
        return {"ok": resp.status_code < 400, "status": resp.status_code, "data": data}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ------------------------------------------------------------
# Instagram: webhook de mensagens (entra no Atendimento)
# ------------------------------------------------------------

# cache de nomes de usuario do Instagram (IGSID -> username)
IG_NAME_CACHE: dict = {}


def find_ig_account(ig_user_id: str) -> Optional[dict]:
    """Localiza a conta conectada dona da mensagem recebida."""
    target = str(ig_user_id or "")
    for acc in db.get("igAccounts") or []:
        if str(acc.get("userId") or "") == target:
            return acc
    return None


async def ig_lookup_username(igsid: str, access_token: str) -> str:
    """Busca o @ do remetente para o Atendimento nao mostrar so o ID."""
    if not igsid:
        return ""
    if igsid in IG_NAME_CACHE:
        return IG_NAME_CACHE[igsid]
    import httpx
    name = ""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"{IG_GRAPH_URL}/v23.0/{igsid}",
                params={"fields": "name,username", "access_token": access_token},
            )
            if r.status_code < 400:
                d = r.json()
                name = d.get("username") or d.get("name") or ""
    except Exception as e:
        logger.info("ig username lookup falhou: %s", e)
    IG_NAME_CACHE[igsid] = name
    if len(IG_NAME_CACHE) > 2000:
        IG_NAME_CACHE.clear()
    return name


@app.get("/api/instagram/webhook")
async def ig_webhook_verify(request: Request):
    """Validacao do webhook exigida pela Meta ao cadastrar a URL."""
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge") or ""
    expected = ig_config().get("verifyToken") or ""
    if mode == "subscribe" and expected and token == expected:
        return Response(content=challenge, media_type="text/plain")
    return Response(content="forbidden", status_code=403, media_type="text/plain")


@app.post("/api/instagram/webhook")
async def ig_webhook_receive(request: Request):
    """Recebe DMs do Instagram e publica no fluxo de eventos do Atendimento."""
    try:
        payload = await request.json()
    except Exception:
        return {"received": True}

    if str(payload.get("object") or "") not in ("instagram", "page"):
        return {"received": True}

    for entry in payload.get("entry") or []:
        recipient_hint = str(entry.get("id") or "")
        for ev in entry.get("messaging") or []:
            msg = ev.get("message") or {}
            if msg.get("is_echo"):
                continue
            mid = msg.get("mid")
            if mid and mid in processed:
                continue
            if mid:
                processed.add(mid)
                if len(processed) > 5000:
                    processed.clear()

            sender_id = str((ev.get("sender") or {}).get("id") or "")
            recipient_id = str((ev.get("recipient") or {}).get("id") or "") or recipient_hint
            text = str(msg.get("text") or "")
            if not text:
                # anexos sem texto entram como aviso para o atendente
                atts = msg.get("attachments") or []
                if atts:
                    kinds = ", ".join(str(a.get("type") or "arquivo") for a in atts)
                    text = f"[anexo recebido: {kinds}]"
            if not sender_id or not text:
                continue

            acc = find_ig_account(recipient_id)
            if not acc:
                logger.info("instagram: conta %s nao encontrada no sync", recipient_id)
                continue

            username = await ig_lookup_username(sender_id, acc.get("accessToken") or "")
            # handle_incoming registra o evento no Atendimento E dispara as automacoes
            asyncio.create_task(
                handle_incoming(f"ig-{recipient_id}", sender_id, text, username or sender_id, "instagram")
            )
    return {"received": True}
