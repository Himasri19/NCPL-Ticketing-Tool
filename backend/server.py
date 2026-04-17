"""NCPL Ticketing Tool — FastAPI backend."""
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File, Form, Header, Query
from fastapi.responses import Response as FastAPIResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
from pathlib import Path
from datetime import datetime, timezone, timedelta
import os
import logging
import uuid
import requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------- Config ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
ADMIN_EMAILS = {e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()}
APP_NAME = os.environ.get("APP_NAME", "ncpl-ticketing")

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
AUTH_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

SEED_DEPARTMENTS = ["HR", "Sales", "Training", "Mentoring", "Finance", "Hrudai"]
TICKET_STATUSES = ["Open", "In Progress", "Pending", "Resolved", "Closed"]
TICKET_PRIORITIES = ["Low", "Medium", "High", "Urgent"]

# ---------- MongoDB ----------
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ---------- Logging ----------
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("ticketing")

# ---------- Storage helpers ----------
_storage_key: Optional[str] = None


def init_storage() -> Optional[str]:
    global _storage_key
    if _storage_key:
        return _storage_key
    if not EMERGENT_LLM_KEY:
        logger.warning("EMERGENT_LLM_KEY not set — attachments disabled.")
        return None
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
        resp.raise_for_status()
        _storage_key = resp.json()["storage_key"]
        logger.info("Object storage initialised.")
        return _storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not initialised")
    r = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    r.raise_for_status()
    return r.json()


def get_object(path: str) -> tuple[bytes, str]:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not initialised")
    r = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60,
    )
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")


# ---------- Models ----------
class UserOut(BaseModel):
    user_id: str
    email: EmailStr
    name: str
    picture: Optional[str] = None
    role: Literal["admin", "employee"] = "employee"
    department: Optional[str] = None
    created_at: str


class UpdateEmployee(BaseModel):
    role: Optional[Literal["admin", "employee"]] = None
    department: Optional[str] = None


class DepartmentIn(BaseModel):
    name: str
    description: Optional[str] = ""


class DepartmentOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    created_at: str


class TicketCreate(BaseModel):
    title: str
    description: str
    department: str
    priority: Literal["Low", "Medium", "High", "Urgent"] = "Medium"


class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    department: Optional[str] = None
    priority: Optional[Literal["Low", "Medium", "High", "Urgent"]] = None
    status: Optional[Literal["Open", "In Progress", "Pending", "Resolved", "Closed"]] = None
    assignee_id: Optional[str] = None
    due_at: Optional[str] = None


class TicketOut(BaseModel):
    id: str
    code: str  # e.g. NCP-0001
    title: str
    description: str
    department: str
    priority: str
    status: str
    created_by: str
    created_by_name: str
    created_by_email: str
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    due_at: Optional[str] = None
    created_at: str
    updated_at: str
    attachments_count: int = 0
    comments_count: int = 0
    is_escalated: bool = False


class CommentIn(BaseModel):
    body: str
    is_internal: bool = False


class CommentOut(BaseModel):
    id: str
    ticket_id: str
    author_id: str
    author_name: str
    author_role: str
    body: str
    is_internal: bool
    created_at: str


class AssignIn(BaseModel):
    assignee_id: Optional[str] = None  # null = unassign


class StatusIn(BaseModel):
    status: Literal["Open", "In Progress", "Pending", "Resolved", "Closed"]


class SessionIn(BaseModel):
    session_id: str


# ---------- App setup ----------
app = FastAPI(title="NCPL Ticketing Tool")
api = APIRouter(prefix="/api")


# ---------- Auth helpers ----------
async def _get_user_from_token(session_token: Optional[str]) -> Optional[dict]:
    if not session_token:
        return None
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        return None
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        return None
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    return user


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1].strip()
    user = await _get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ---------- Auth routes ----------
@api.post("/auth/session")
async def create_session(payload: SessionIn, response: Response):
    """Exchange Emergent session_id for session_token; upsert user."""
    try:
        r = requests.get(AUTH_SESSION_URL, headers={"X-Session-ID": payload.session_id}, timeout=15)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        logger.error(f"Emergent auth failure: {e}")
        raise HTTPException(status_code=401, detail="Invalid session_id")

    email = data["email"].lower()
    name = data.get("name") or email.split("@")[0]
    picture = data.get("picture")
    session_token = data["session_token"]

    # Upsert user
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        update = {"name": name, "picture": picture, "last_login_at": datetime.now(timezone.utc).isoformat()}
        # Auto-promote whitelisted admin emails
        if email in ADMIN_EMAILS and existing.get("role") != "admin":
            update["role"] = "admin"
        await db.users.update_one({"user_id": user_id}, {"$set": update})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        role = "admin" if email in ADMIN_EMAILS else "employee"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": role,
            "department": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_login_at": datetime.now(timezone.utc).isoformat(),
        })

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60,
    )

    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": user}


@api.get("/auth/me", response_model=UserOut)
async def auth_me(request: Request):
    user = await get_current_user(request)
    return UserOut(**user)


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token") or request.headers.get("Authorization", "").replace("Bearer ", "")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


@api.post("/auth/preview-employee")
async def preview_employee(request: Request, response: Response):
    """Admin-only: swap current session for a seeded demo employee session so
    the admin can preview the Employee Portal without logging out.
    """
    await require_admin(request)

    demo_email = "demo.employee@ncpl.preview"
    demo = await db.users.find_one({"email": demo_email}, {"_id": 0})
    if not demo:
        demo = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": demo_email,
            "name": "Demo Employee",
            "picture": None,
            "role": "employee",
            "department": "HR",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(demo)
        demo.pop("_id", None)

    # Create a preview session token
    preview_token = f"preview_emp_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(hours=2)
    await db.user_sessions.insert_one({
        "session_token": preview_token,
        "user_id": demo["user_id"],
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_preview": True,
    })

    response.set_cookie(
        key="session_token",
        value=preview_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=2 * 60 * 60,
    )
    return {"user": demo, "preview": True}


# ---------- Departments ----------
@api.get("/departments", response_model=List[DepartmentOut])
async def list_departments(request: Request):
    await get_current_user(request)
    rows = await db.departments.find({}, {"_id": 0}).sort("name", 1).to_list(500)
    return [DepartmentOut(**r) for r in rows]


@api.post("/departments", response_model=DepartmentOut)
async def create_department(body: DepartmentIn, request: Request):
    await require_admin(request)
    existing = await db.departments.find_one({"name": body.name}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Department already exists")
    doc = {
        "id": f"dept_{uuid.uuid4().hex[:10]}",
        "name": body.name,
        "description": body.description or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.departments.insert_one(doc)
    doc.pop("_id", None)
    return DepartmentOut(**doc)


@api.patch("/departments/{dept_id}", response_model=DepartmentOut)
async def update_department(dept_id: str, body: DepartmentIn, request: Request):
    await require_admin(request)
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.departments.update_one({"id": dept_id}, {"$set": update})
    doc = await db.departments.find_one({"id": dept_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return DepartmentOut(**doc)


@api.delete("/departments/{dept_id}")
async def delete_department(dept_id: str, request: Request):
    await require_admin(request)
    await db.departments.delete_one({"id": dept_id})
    return {"ok": True}


# ---------- Employees (users) ----------
@api.get("/employees", response_model=List[UserOut])
async def list_employees(request: Request):
    await require_admin(request)
    rows = await db.users.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return [UserOut(**r) for r in rows]


@api.patch("/employees/{user_id}", response_model=UserOut)
async def update_employee(user_id: str, body: UpdateEmployee, request: Request):
    await require_admin(request)
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.users.update_one({"user_id": user_id}, {"$set": update})
    doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut(**doc)


@api.get("/employees/assignable", response_model=List[UserOut])
async def assignable_employees(request: Request):
    """Admins and employees who can be assigned tickets."""
    await get_current_user(request)
    rows = await db.users.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return [UserOut(**r) for r in rows]


# ---------- Tickets ----------
async def _next_ticket_code() -> str:
    counter = await db.counters.find_one_and_update(
        {"_id": "ticket"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq = counter.get("seq", 1) if counter else 1
    return f"NCP-{seq:04d}"


async def _enrich_ticket(t: dict) -> dict:
    # attachments & comments count
    t["attachments_count"] = await db.attachments.count_documents({"ticket_id": t["id"], "is_deleted": {"$ne": True}})
    t["comments_count"] = await db.comments.count_documents({"ticket_id": t["id"]})
    # Escalated = High/Urgent + overdue OR explicitly escalated flag
    t["is_escalated"] = bool(t.get("is_escalated", False))
    return t


@api.post("/tickets", response_model=TicketOut)
async def create_ticket(body: TicketCreate, request: Request):
    user = await get_current_user(request)
    dept = await db.departments.find_one({"name": body.department}, {"_id": 0})
    if not dept:
        raise HTTPException(status_code=400, detail="Invalid department")
    code = await _next_ticket_code()
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": f"tkt_{uuid.uuid4().hex[:12]}",
        "code": code,
        "title": body.title,
        "description": body.description,
        "department": body.department,
        "priority": body.priority,
        "status": "Open",
        "created_by": user["user_id"],
        "created_by_name": user["name"],
        "created_by_email": user["email"],
        "assignee_id": None,
        "assignee_name": None,
        "due_at": None,
        "created_at": now,
        "updated_at": now,
        "is_escalated": False,
    }
    await db.tickets.insert_one(doc)
    doc.pop("_id", None)
    doc = await _enrich_ticket(doc)
    return TicketOut(**doc)


@api.get("/tickets", response_model=List[TicketOut])
async def list_tickets(
    request: Request,
    status: Optional[str] = None,
    department: Optional[str] = None,
    priority: Optional[str] = None,
    assignee_id: Optional[str] = None,
    scope: Optional[str] = Query(None, description="mine|unassigned|assigned_to_me|escalated|overdue|high_priority|active|resolved|closed"),
    q: Optional[str] = None,
):
    user = await get_current_user(request)
    query: dict = {}

    if user["role"] != "admin":
        # Employees only see their own tickets
        query["created_by"] = user["user_id"]

    if status:
        query["status"] = status
    if department:
        query["department"] = department
    if priority:
        query["priority"] = priority
    if assignee_id:
        query["assignee_id"] = assignee_id

    if scope:
        if scope == "mine":
            query["created_by"] = user["user_id"]
        elif scope == "unassigned":
            query["assignee_id"] = None
        elif scope == "assigned_to_me":
            query["assignee_id"] = user["user_id"]
        elif scope == "escalated":
            query["is_escalated"] = True
        elif scope == "high_priority":
            query["priority"] = {"$in": ["High", "Urgent"]}
        elif scope == "active":
            query["status"] = {"$in": ["Open", "In Progress", "Pending"]}
        elif scope == "resolved":
            query["status"] = "Resolved"
        elif scope == "closed":
            query["status"] = "Closed"
        elif scope == "overdue":
            now_iso = datetime.now(timezone.utc).isoformat()
            query["due_at"] = {"$lt": now_iso, "$ne": None}
            query["status"] = {"$nin": ["Resolved", "Closed"]}

    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"code": {"$regex": q, "$options": "i"}},
        ]

    rows = await db.tickets.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    out = []
    for t in rows:
        t = await _enrich_ticket(t)
        out.append(TicketOut(**t))
    return out


@api.get("/tickets/{ticket_id}", response_model=TicketOut)
async def get_ticket(ticket_id: str, request: Request):
    user = await get_current_user(request)
    t = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    if user["role"] != "admin" and t["created_by"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    t = await _enrich_ticket(t)
    return TicketOut(**t)


@api.patch("/tickets/{ticket_id}", response_model=TicketOut)
async def update_ticket(ticket_id: str, body: TicketUpdate, request: Request):
    user = await get_current_user(request)
    t = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    if user["role"] != "admin" and t["created_by"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    update = {k: v for k, v in body.model_dump().items() if v is not None}

    if user["role"] != "admin":
        # Employees can only update title/description of own ticket while Open, and close it
        allowed = {}
        if "status" in update and update["status"] == "Closed" and t["status"] == "Resolved":
            allowed["status"] = "Closed"
        if t["status"] == "Open":
            for k in ("title", "description"):
                if k in update:
                    allowed[k] = update[k]
        update = allowed
        if not update:
            raise HTTPException(status_code=403, detail="Not allowed")

    if "assignee_id" in update:
        if update["assignee_id"]:
            assignee = await db.users.find_one({"user_id": update["assignee_id"]}, {"_id": 0})
            if not assignee:
                raise HTTPException(status_code=400, detail="Invalid assignee")
            update["assignee_name"] = assignee["name"]
        else:
            update["assignee_name"] = None

    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.tickets.update_one({"id": ticket_id}, {"$set": update})
    t = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    t = await _enrich_ticket(t)
    return TicketOut(**t)


@api.post("/tickets/{ticket_id}/assign", response_model=TicketOut)
async def assign_ticket(ticket_id: str, body: AssignIn, request: Request):
    await require_admin(request)
    t = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    update = {
        "assignee_id": body.assignee_id,
        "assignee_name": None,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if body.assignee_id:
        a = await db.users.find_one({"user_id": body.assignee_id}, {"_id": 0})
        if not a:
            raise HTTPException(status_code=400, detail="Invalid assignee")
        update["assignee_name"] = a["name"]
        if t["status"] == "Open":
            update["status"] = "In Progress"
    await db.tickets.update_one({"id": ticket_id}, {"$set": update})
    t = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    t = await _enrich_ticket(t)
    return TicketOut(**t)


@api.post("/tickets/{ticket_id}/status", response_model=TicketOut)
async def change_status(ticket_id: str, body: StatusIn, request: Request):
    user = await get_current_user(request)
    t = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    if user["role"] != "admin":
        # Employees can only close own resolved tickets
        if t["created_by"] != user["user_id"] or not (t["status"] == "Resolved" and body.status == "Closed"):
            raise HTTPException(status_code=403, detail="Forbidden")
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$set": {"status": body.status, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    t = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    t = await _enrich_ticket(t)
    return TicketOut(**t)


@api.post("/tickets/{ticket_id}/escalate", response_model=TicketOut)
async def escalate(ticket_id: str, request: Request):
    await require_admin(request)
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$set": {"is_escalated": True, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    t = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    t = await _enrich_ticket(t)
    return TicketOut(**t)


# ---------- Comments ----------
@api.get("/tickets/{ticket_id}/comments", response_model=List[CommentOut])
async def list_comments(ticket_id: str, request: Request):
    user = await get_current_user(request)
    t = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    if user["role"] != "admin" and t["created_by"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    query = {"ticket_id": ticket_id}
    if user["role"] != "admin":
        query["is_internal"] = False
    rows = await db.comments.find(query, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return [CommentOut(**r) for r in rows]


@api.post("/tickets/{ticket_id}/comments", response_model=CommentOut)
async def add_comment(ticket_id: str, body: CommentIn, request: Request):
    user = await get_current_user(request)
    t = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    if user["role"] != "admin" and t["created_by"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    doc = {
        "id": f"cm_{uuid.uuid4().hex[:12]}",
        "ticket_id": ticket_id,
        "author_id": user["user_id"],
        "author_name": user["name"],
        "author_role": user["role"],
        "body": body.body,
        "is_internal": bool(body.is_internal) if user["role"] == "admin" else False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.comments.insert_one(doc)
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    doc.pop("_id", None)
    return CommentOut(**doc)


# ---------- Attachments ----------
@api.post("/tickets/{ticket_id}/attachments")
async def upload_attachment(ticket_id: str, request: Request, file: UploadFile = File(...)):
    user = await get_current_user(request)
    t = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    if user["role"] != "admin" and t["created_by"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    object_path = f"{APP_NAME}/tickets/{ticket_id}/{uuid.uuid4().hex}.{ext}"
    data = await file.read()
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 15MB)")
    result = put_object(object_path, data, file.content_type or "application/octet-stream")

    doc = {
        "id": f"att_{uuid.uuid4().hex[:12]}",
        "ticket_id": ticket_id,
        "storage_path": result["path"],
        "filename": file.filename,
        "content_type": file.content_type or "application/octet-stream",
        "size": result.get("size", len(data)),
        "uploaded_by": user["user_id"],
        "uploaded_by_name": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_deleted": False,
    }
    await db.attachments.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/tickets/{ticket_id}/attachments")
async def list_attachments(ticket_id: str, request: Request):
    user = await get_current_user(request)
    t = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    if user["role"] != "admin" and t["created_by"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    rows = await db.attachments.find({"ticket_id": ticket_id, "is_deleted": False}, {"_id": 0}).to_list(500)
    return rows


@api.get("/attachments/{attachment_id}/download")
async def download_attachment(attachment_id: str, request: Request, auth: Optional[str] = None):
    # Allow auth via cookie OR ?auth= query for <img>/<a> tags
    token = request.cookies.get("session_token") or auth
    user = await _get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    att = await db.attachments.find_one({"id": attachment_id, "is_deleted": False}, {"_id": 0})
    if not att:
        raise HTTPException(status_code=404, detail="Not found")
    t = await db.tickets.find_one({"id": att["ticket_id"]}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if user["role"] != "admin" and t["created_by"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    data, ctype = get_object(att["storage_path"])
    return FastAPIResponse(
        content=data,
        media_type=att.get("content_type") or ctype,
        headers={"Content-Disposition": f'inline; filename="{att["filename"]}"'},
    )


# ---------- Dashboard & Reports ----------
@api.get("/dashboard/stats")
async def dashboard_stats(request: Request):
    user = await get_current_user(request)
    scope = {} if user["role"] == "admin" else {"created_by": user["user_id"]}

    total = await db.tickets.count_documents(scope)
    active = await db.tickets.count_documents({**scope, "status": {"$in": ["Open", "In Progress", "Pending"]}})
    unassigned = await db.tickets.count_documents({**scope, "assignee_id": None, "status": {"$nin": ["Resolved", "Closed"]}})
    resolved = await db.tickets.count_documents({**scope, "status": "Resolved"})
    closed = await db.tickets.count_documents({**scope, "status": "Closed"})
    high = await db.tickets.count_documents({**scope, "priority": {"$in": ["High", "Urgent"]}, "status": {"$nin": ["Resolved", "Closed"]}})
    escalated = await db.tickets.count_documents({**scope, "is_escalated": True})

    # by status
    by_status = []
    for s in TICKET_STATUSES:
        c = await db.tickets.count_documents({**scope, "status": s})
        by_status.append({"status": s, "count": c})

    # by department
    by_dept = []
    depts = await db.departments.find({}, {"_id": 0}).to_list(100)
    for d in depts:
        c = await db.tickets.count_documents({**scope, "department": d["name"]})
        by_dept.append({"department": d["name"], "count": c})

    # by priority
    by_priority = []
    for p in TICKET_PRIORITIES:
        c = await db.tickets.count_documents({**scope, "priority": p})
        by_priority.append({"priority": p, "count": c})

    # last 7 days created
    trend = []
    now = datetime.now(timezone.utc)
    for i in range(6, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        c = await db.tickets.count_documents({
            **scope,
            "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()},
        })
        trend.append({"date": day_start.strftime("%b %d"), "count": c})

    return {
        "total": total,
        "active": active,
        "unassigned": unassigned,
        "resolved": resolved,
        "closed": closed,
        "high_priority": high,
        "escalated": escalated,
        "by_status": by_status,
        "by_department": by_dept,
        "by_priority": by_priority,
        "trend_7d": trend,
    }


# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    # Seed departments
    for name in SEED_DEPARTMENTS:
        existing = await db.departments.find_one({"name": name})
        if not existing:
            await db.departments.insert_one({
                "id": f"dept_{uuid.uuid4().hex[:10]}",
                "name": name,
                "description": f"{name} department",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
    # Seed admin whitelist
    for email in ADMIN_EMAILS:
        existing = await db.users.find_one({"email": email}, {"_id": 0})
        if existing and existing.get("role") != "admin":
            await db.users.update_one({"email": email}, {"$set": {"role": "admin"}})
    # Init storage
    init_storage()
    logger.info("Startup complete. %d departments seeded.", len(SEED_DEPARTMENTS))


@app.on_event("shutdown")
async def shutdown():
    client.close()


# ---------- Health ----------
@api.get("/")
async def root():
    return {"service": "NCPL Ticketing", "status": "ok"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)
