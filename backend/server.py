from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, UploadFile, File, Form, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import logging
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta, date
import bcrypt
import jwt
import requests
import re
import ipaddress
import httpx
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---------------- Object Storage ----------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "royalevilla"
storage_key = None

def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": key, "Content-Type": content_type},
                        data=data, timeout=120)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                            headers={"X-Storage-Key": key, "Content-Type": content_type},
                            data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ---------------- Email (Resend managed) ----------------
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Royale Villa Malino")

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)

def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)

def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)

class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []
    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []
    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)
    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []

def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan(); scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")

async def send_email(*, to: str, subject: str, html: str):
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    try:
        async with httpx.AsyncClient(timeout=30) as hc:
            resp = await hc.post(f"{EMAIL_BASE_URL}/api/v1/email/send",
                                 headers={"X-Email-Key": EMAIL_KEY}, json=payload)
        resp.raise_for_status()
        return resp.json().get("id")
    except Exception as e:
        logger.error(f"Email send error: {e}")
        return None

# ---------------- Pricing ----------------
RATES = {
    "Per Lantai": {"weekday": 1400000, "weekend": 1600000},
    "Full Villa": {"weekday": 2700000, "weekend": 3000000},
}

def compute_total(package: str, check_in: str, check_out: str) -> int:
    rate = RATES.get(package, RATES["Per Lantai"])
    total = 0
    for iso in _date_range(check_in, check_out):
        d = date.fromisoformat(iso)
        # Mon=0..Sun=6 -> weekend = Fri(4),Sat(5),Sun(6)
        total += rate["weekend"] if d.weekday() >= 4 else rate["weekday"]
    return total

DEFAULT_SETTINGS = {
    "owner_email": "",
    "bank_name": "Nama Bank",
    "bank_account": "0000-0000-0000",
    "bank_holder": "Atas Nama Pemilik",
}

async def get_settings() -> dict:
    doc = await db.settings.find_one({"key": "main"}, {"_id": 0})
    if not doc:
        return dict(DEFAULT_SETTINGS)
    return {k: doc.get(k, DEFAULT_SETTINGS[k]) for k in DEFAULT_SETTINGS}

# ---------------- Auth helpers ----------------
JWT_ALGORITHM = "HS256"

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:] if auth_header.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("password_hash", None)
        user.pop("_id", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ---------------- Models ----------------
class LoginInput(BaseModel):
    email: EmailStr
    password: str

class BookingCreate(BaseModel):
    name: str
    phone: str
    package: str  # "Per Lantai" | "Full Villa"
    guests: int
    check_in: str  # ISO date YYYY-MM-DD
    check_out: str
    notes: Optional[str] = ""
    dp_amount: Optional[int] = 0

class Booking(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    package: str
    guests: int
    check_in: str
    check_out: str
    notes: str = ""
    total_price: int = 0
    dp_amount: int = 0
    payment_status: str = "unpaid"  # unpaid | proof_uploaded | verified
    payment_proof: str = ""  # storage_path of bukti transfer
    status: str = "pending"  # pending | confirmed | cancelled
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class StatusUpdate(BaseModel):
    status: str

# ---------------- Auth routes ----------------
@api_router.post("/auth/login")
async def login(data: LoginInput):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    token = create_access_token(user["id"], user["email"])
    return {"token": token, "user": {"email": user["email"], "name": user.get("name", "Admin"), "role": user.get("role", "admin")}}

@api_router.get("/auth/me")
async def me(request: Request):
    return await get_current_user(request)

# ---------------- Booking routes ----------------
def _date_range(start: str, end: str):
    d0 = date.fromisoformat(start)
    d1 = date.fromisoformat(end)
    days = []
    cur = d0
    while cur < d1:
        days.append(cur.isoformat())
        cur += timedelta(days=1)
    return days if days else [start]

@api_router.get("/bookings/booked-dates")
async def booked_dates():
    bookings = await db.bookings.find({"status": {"$in": ["pending", "confirmed"]}}, {"_id": 0}).to_list(1000)
    dates = set()
    for b in bookings:
        for d in _date_range(b["check_in"], b["check_out"]):
            dates.add(d)
    return {"booked": sorted(dates)}

@api_router.post("/bookings")
async def create_booking(data: BookingCreate):
    # availability check
    existing = await db.bookings.find({"status": {"$in": ["pending", "confirmed"]}}, {"_id": 0}).to_list(1000)
    requested = set(_date_range(data.check_in, data.check_out))
    for b in existing:
        if requested & set(_date_range(b["check_in"], b["check_out"])):
            raise HTTPException(status_code=409, detail="Tanggal yang dipilih sudah dipesan. Silakan pilih tanggal lain.")
    payload = data.model_dump()
    total = compute_total(data.package, data.check_in, data.check_out)
    payload["total_price"] = total
    payload["dp_amount"] = int(data.dp_amount or 0)
    booking = Booking(**payload)
    await db.bookings.insert_one(booking.model_dump())

    # Notify owner via email (only if owner_email configured)
    settings = await get_settings()
    owner_email = (settings.get("owner_email") or "").strip()
    if owner_email:
        rp = lambda n: f"Rp {n:,.0f}".replace(",", ".")
        subject = f"Booking Baru - {booking.name} ({booking.package})"
        html = (
            f'<table role="presentation" width="100%" style="background:#f4f1eb;padding:24px">'
            f'<tr><td style="font-family:Arial,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto">'
            f'<h2 style="color:#4a6b53;margin:0 0 12px">Booking Baru Masuk</h2>'
            f'<p>Ada permintaan booking baru di {escape(EMAIL_FROM_NAME)}:</p>'
            f'<table role="presentation" width="100%" style="border-collapse:collapse;font-size:14px">'
            f'<tr><td style="padding:6px 0;color:#5c5c5c">Nama</td><td style="padding:6px 0"><strong>{escape(booking.name)}</strong></td></tr>'
            f'<tr><td style="padding:6px 0;color:#5c5c5c">No. HP</td><td style="padding:6px 0">{escape(booking.phone)}</td></tr>'
            f'<tr><td style="padding:6px 0;color:#5c5c5c">Paket</td><td style="padding:6px 0">{escape(booking.package)}</td></tr>'
            f'<tr><td style="padding:6px 0;color:#5c5c5c">Tamu</td><td style="padding:6px 0">{booking.guests} orang</td></tr>'
            f'<tr><td style="padding:6px 0;color:#5c5c5c">Check-in</td><td style="padding:6px 0">{escape(booking.check_in)}</td></tr>'
            f'<tr><td style="padding:6px 0;color:#5c5c5c">Check-out</td><td style="padding:6px 0">{escape(booking.check_out)}</td></tr>'
            f'<tr><td style="padding:6px 0;color:#5c5c5c">Estimasi Total</td><td style="padding:6px 0"><strong>{rp(total)}</strong></td></tr>'
            f'<tr><td style="padding:6px 0;color:#5c5c5c">Catatan</td><td style="padding:6px 0">{escape(booking.notes or "-")}</td></tr>'
            f'</table>'
            f'<p style="font-size:12px;color:#888;margin-top:16px">Buka Panel Admin untuk mengelola booking ini. '
            f'Email dikirim oleh {escape(EMAIL_FROM_NAME)}. Kami tidak pernah meminta password melalui email.</p>'
            f'</td></tr></table>'
        )
        await send_email(to=owner_email, subject=subject, html=html)

    return booking.model_dump()

@api_router.post("/bookings/{booking_id}/proof")
async def upload_proof(booking_id: str, file: UploadFile = File(...)):
    b = await db.bookings.find_one({"id": booking_id})
    if not b:
        raise HTTPException(status_code=404, detail="Booking tidak ditemukan")
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
    path = f"{APP_NAME}/proofs/{booking_id}.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "image/jpeg")
    await db.media.insert_one({
        "storage_path": result["path"], "content_type": file.content_type or "image/jpeg",
        "kind": "proof", "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.bookings.update_one({"id": booking_id}, {"$set": {"payment_proof": result["path"], "payment_status": "proof_uploaded"}})
    return {"ok": True, "path": result["path"]}

@api_router.get("/admin/bookings")
async def list_bookings(request: Request):
    await get_current_user(request)
    bookings = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return bookings

@api_router.patch("/admin/bookings/{booking_id}")
async def update_booking(booking_id: str, data: StatusUpdate, request: Request):
    await get_current_user(request)
    if data.status not in ["pending", "confirmed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Status tidak valid")
    result = await db.bookings.update_one({"id": booking_id}, {"$set": {"status": data.status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking tidak ditemukan")
    return {"ok": True}

@api_router.patch("/admin/bookings/{booking_id}/payment")
async def update_payment(booking_id: str, data: StatusUpdate, request: Request):
    await get_current_user(request)
    if data.status not in ["unpaid", "proof_uploaded", "verified"]:
        raise HTTPException(status_code=400, detail="Status pembayaran tidak valid")
    result = await db.bookings.update_one({"id": booking_id}, {"$set": {"payment_status": data.status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking tidak ditemukan")
    return {"ok": True}

@api_router.get("/admin/analytics")
async def analytics(request: Request):
    await get_current_user(request)
    bookings = await db.bookings.find({}, {"_id": 0}).to_list(2000)
    revenue_statuses = {"confirmed"}
    months = {}
    total_omset = 0
    counts = {"pending": 0, "confirmed": 0, "cancelled": 0}
    for b in bookings:
        counts[b.get("status", "pending")] = counts.get(b.get("status", "pending"), 0) + 1
        mkey = (b.get("check_in") or "")[:7]  # YYYY-MM
        if mkey:
            m = months.setdefault(mkey, {"month": mkey, "bookings": 0, "omset": 0})
            m["bookings"] += 1
            if b.get("status") in revenue_statuses:
                m["omset"] += int(b.get("total_price", 0))
        if b.get("status") in revenue_statuses:
            total_omset += int(b.get("total_price", 0))
    series = [months[k] for k in sorted(months.keys())]
    return {
        "total_bookings": len(bookings),
        "total_omset": total_omset,
        "confirmed": counts.get("confirmed", 0),
        "pending": counts.get("pending", 0),
        "cancelled": counts.get("cancelled", 0),
        "monthly": series,
    }

# ---------------- Settings ----------------
class SettingsInput(BaseModel):
    owner_email: Optional[str] = ""
    bank_name: Optional[str] = ""
    bank_account: Optional[str] = ""
    bank_holder: Optional[str] = ""

@api_router.get("/settings")
async def public_settings():
    s = await get_settings()
    return {"bank_name": s["bank_name"], "bank_account": s["bank_account"], "bank_holder": s["bank_holder"]}

@api_router.get("/admin/settings")
async def admin_get_settings(request: Request):
    await get_current_user(request)
    return await get_settings()

@api_router.put("/admin/settings")
async def admin_put_settings(data: SettingsInput, request: Request):
    await get_current_user(request)
    update = {k: (getattr(data, k) or "") for k in DEFAULT_SETTINGS}
    await db.settings.update_one({"key": "main"}, {"$set": {**update, "key": "main"}}, upsert=True)
    return await get_settings()

# ---------------- Photos (gallery + 360 pano) ----------------
@api_router.post("/admin/photos")
async def upload_photo(request: Request, file: UploadFile = File(...), kind: str = Form("gallery"), label: str = Form("")):
    await get_current_user(request)
    if kind not in ["gallery", "pano"]:
        raise HTTPException(status_code=400, detail="Kind tidak valid")
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
    pid = str(uuid.uuid4())
    path = f"{APP_NAME}/photos/{kind}/{pid}.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "image/jpeg")
    doc = {
        "id": pid, "storage_path": result["path"], "kind": kind,
        "label": label or "Foto Villa", "content_type": file.content_type or "image/jpeg",
        "is_deleted": False, "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.media.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/photos")
async def list_photos(kind: Optional[str] = None):
    q = {"is_deleted": False, "kind": {"$in": ["gallery", "pano"]}}
    if kind in ["gallery", "pano"]:
        q["kind"] = kind
    photos = await db.media.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    return photos

@api_router.delete("/admin/photos/{photo_id}")
async def delete_photo(photo_id: str, request: Request):
    await get_current_user(request)
    await db.media.update_one({"id": photo_id}, {"$set": {"is_deleted": True}})
    return {"ok": True}

# ---------------- Video routes ----------------
@api_router.post("/admin/videos")
async def upload_video(request: Request, file: UploadFile = File(...), title: str = Form("")):
    await get_current_user(request)
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "mp4"
    vid = str(uuid.uuid4())
    path = f"{APP_NAME}/videos/{vid}.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "video/mp4")
    doc = {
        "id": vid,
        "storage_path": result["path"],
        "title": title or file.filename,
        "content_type": file.content_type or "video/mp4",
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.videos.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/videos")
async def list_videos():
    videos = await db.videos.find({"is_deleted": False}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return videos

@api_router.delete("/admin/videos/{video_id}")
async def delete_video(video_id: str, request: Request):
    await get_current_user(request)
    await db.videos.update_one({"id": video_id}, {"$set": {"is_deleted": True}})
    return {"ok": True}

@api_router.get("/media/{path:path}")
async def serve_media(path: str):
    record = await db.videos.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        record = await db.media.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="Media tidak ditemukan")
    data, content_type = get_object(path)
    return Response(content=data, media_type=record.get("content_type", content_type))

@api_router.get("/")
async def root():
    return {"message": "Royale Villa Malino API"}

# ---------------- Startup ----------------
@app.on_event("startup")
async def startup():
    try:
        await db.users.create_index("email", unique=True)
    except Exception as e:
        logger.warning(f"index: {e}")
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin", "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Admin seeded")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
