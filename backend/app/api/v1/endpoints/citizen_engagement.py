"""
Citizen engagement and gamification endpoints.
"""
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel

from app.core.database import citizen_rewards_col, complaints_col, notifications_col
from app.core.security import get_current_user

router = APIRouter(prefix="/citizen", tags=["Citizen Engagement"])

CERTIFICATE_NAME = "Road Safety Contributor Certificate"

BADGE_MILESTONES = [
    (1, "First Reporter"),
    (10, "Active Reporter Badge"),
    (25, "City Guardian Badge"),
    (50, "Road Safety Hero"),
]


class CitizenReportPayload(BaseModel):
    complaint_id: str
    occurred_at: Optional[datetime] = None


class CitizenVerifyPayload(BaseModel):
    complaint_id: str
    occurred_at: Optional[datetime] = None


def _rank_for_tokens(tokens: int) -> str:
    if tokens <= 20:
        return "Beginner Reporter"
    if tokens <= 50:
        return "Active Reporter"
    if tokens <= 100:
        return "Road Guardian"
    if tokens <= 200:
        return "City Guardian"
    return "National Road Hero"


def _new_badges(reports_submitted: int, existing_badges: List[str]) -> List[str]:
    existing = set(existing_badges)
    unlocked: List[str] = []
    for threshold, badge in BADGE_MILESTONES:
        if reports_submitted >= threshold and badge not in existing:
            unlocked.append(badge)
    return unlocked


def _pdf_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _build_certificate_pdf(full_name: str, tokens: int, issued_at: datetime) -> bytes:
    lines = [
        (28, "Road Safety Contributor Certificate"),
        (16, "Presented to"),
        (24, full_name),
        (14, f"For outstanding citizen contribution to road safety. Tokens earned: {tokens}"),
        (12, f"Issued on: {issued_at.strftime('%Y-%m-%d')}")
    ]

    text_lines: List[str] = []
    y = 760
    for size, text in lines:
        escaped = _pdf_escape(text)
        text_lines.append(f"BT /F1 {size} Tf 72 {y} Td ({escaped}) Tj ET")
        y -= 42 if size >= 24 else 28

    stream = "\n".join(text_lines).encode("latin-1", errors="replace")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]

    pdf = b"%PDF-1.4\n"
    offsets = [0]
    for idx, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf += f"{idx} 0 obj\n".encode("ascii") + obj + b"\nendobj\n"

    xref_start = len(pdf)
    pdf += f"xref\n0 {len(objects) + 1}\n".encode("ascii")
    pdf += b"0000000000 65535 f \n"
    for off in offsets[1:]:
        pdf += f"{off:010d} 00000 n \n".encode("ascii")
    pdf += (
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_start}\n%%EOF"
    ).encode("ascii")
    return pdf


def _serialize_notification(doc: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(doc.get("_id")),
        "title": doc.get("title", "Notification"),
        "message": doc.get("message", ""),
        "created_at": doc.get("created_at"),
        "is_read": bool(doc.get("is_read", False)),
    }


async def _create_notification(user_id: str, title: str, message: str, complaint_id: Optional[str] = None) -> None:
    await notifications_col().insert_one(
        {
            "recipient_user_id": user_id,
            "recipient_role": "citizen",
            "title": title,
            "message": message,
            "complaint_id": complaint_id,
            "created_at": datetime.utcnow(),
            "is_read": False,
        }
    )


async def _find_complaint(complaint_id: str) -> Optional[Dict[str, Any]]:
    collection = complaints_col()
    search: List[Dict[str, Any]] = [
        {"complaint_id": complaint_id},
        {"complaint_number": complaint_id},
    ]
    try:
        search.insert(0, {"_id": ObjectId(complaint_id)})
    except Exception:
        pass

    for query in search:
        doc = await collection.find_one(query)
        if doc:
            return doc
    return None


async def _ensure_reward_profile(current_user: Dict[str, Any]) -> Dict[str, Any]:
    col = citizen_rewards_col()
    user_id = str(current_user.get("id"))
    existing = await col.find_one({"user_id": user_id})
    now = datetime.utcnow()
    if existing:
        await col.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "email": current_user.get("email", existing.get("email", "")),
                    "full_name": current_user.get("full_name", existing.get("full_name", "Citizen User")),
                    "updated_at": now,
                }
            },
        )
        existing["email"] = current_user.get("email", existing.get("email", ""))
        existing["full_name"] = current_user.get("full_name", existing.get("full_name", "Citizen User"))
        existing["updated_at"] = now
        return existing

    profile = {
        "user_id": user_id,
        "email": current_user.get("email", ""),
        "full_name": current_user.get("full_name", "Citizen User"),
        "reports_submitted": 0,
        "reports_verified": 0,
        "tokens_earned": 0,
        "current_streak": 0,
        "last_report_date": None,
        "rank": "Beginner Reporter",
        "badges": [],
        "certificates": [],
        "submitted_complaint_ids": [],
        "rewarded_complaint_ids": [],
        "created_at": now,
        "updated_at": now,
    }
    await col.insert_one(profile)
    return profile


async def _build_stats(profile: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    solved_complaints = await complaints_col().count_documents(
        {
            "reported_by": user_id,
            "status": {"$regex": "^verified$", "$options": "i"},
        }
    )
    return {
        "solved_complaints": solved_complaints,
        "reports_submitted": int(profile.get("reports_submitted", 0)),
        "reports_verified": int(profile.get("reports_verified", 0)),
        "tokens_earned": int(profile.get("tokens_earned", 0)),
        "current_streak": int(profile.get("current_streak", 0)),
        "last_report_date": profile.get("last_report_date"),
        "rank": profile.get("rank", "Beginner Reporter"),
        "badges": profile.get("badges", []),
        "certificates": profile.get("certificates", []),
    }


@router.get("/stats")
async def citizen_stats(current_user: Dict[str, Any] = Depends(get_current_user)):
    profile = await _ensure_reward_profile(current_user)
    return await _build_stats(profile, str(current_user.get("id")))


@router.post("/report")
async def record_citizen_report(payload: CitizenReportPayload, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = str(current_user.get("id"))
    complaint = await _find_complaint(payload.complaint_id)
    if complaint:
        await complaints_col().update_one(
            {"_id": complaint["_id"]},
            {
                "$set": {
                    "reported_by": user_id,
                    "verified_by_citizen": bool(complaint.get("verified_by_citizen", False)),
                    "repair_completed_at": complaint.get("repair_completed_at"),
                    "updated_at": datetime.utcnow(),
                }
            },
        )

    profile = await _ensure_reward_profile(current_user)
    submitted_ids = list(profile.get("submitted_complaint_ids", []))
    if payload.complaint_id in submitted_ids:
        stats = await _build_stats(profile, user_id)
        stats.update({"new_badges": [], "streak_updated": False})
        return stats

    event_time = payload.occurred_at or datetime.utcnow()
    event_date = event_time.date()
    current_streak = int(profile.get("current_streak", 0))
    last_report_raw = profile.get("last_report_date")

    if last_report_raw:
        try:
            last_report_date = date.fromisoformat(str(last_report_raw))
            day_gap = (event_date - last_report_date).days
            if day_gap == 1:
                current_streak += 1
            elif day_gap == 0:
                current_streak = max(current_streak, 1)
            else:
                current_streak = 1
        except ValueError:
            current_streak = 1
    else:
        current_streak = 1

    reports_submitted = int(profile.get("reports_submitted", 0)) + 1
    badges = list(profile.get("badges", []))
    unlocked_badges = _new_badges(reports_submitted, badges)
    if unlocked_badges:
        badges.extend(unlocked_badges)

    submitted_ids.append(payload.complaint_id)

    await citizen_rewards_col().update_one(
        {"user_id": user_id},
        {
            "$set": {
                "reports_submitted": reports_submitted,
                "current_streak": current_streak,
                "last_report_date": event_date.isoformat(),
                "badges": badges,
                "submitted_complaint_ids": submitted_ids,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    for badge in unlocked_badges:
        await _create_notification(
            user_id,
            "Badge Unlocked",
            f"Congratulations! You unlocked the '{badge}' achievement.",
            payload.complaint_id,
        )

    updated_profile = await citizen_rewards_col().find_one({"user_id": user_id})
    stats = await _build_stats(updated_profile, user_id)
    stats.update({"new_badges": unlocked_badges, "streak_updated": True})
    return stats


@router.post("/verify")
async def record_citizen_verification(payload: CitizenVerifyPayload, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = str(current_user.get("id"))
    complaint = await _find_complaint(payload.complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    reported_by = complaint.get("reported_by")
    if reported_by and str(reported_by) != user_id:
        raise HTTPException(status_code=403, detail="You can only verify your own reported complaints")

    await complaints_col().update_one(
        {"_id": complaint["_id"]},
        {
            "$set": {
                "status": "verified",
                "verified_by_citizen": True,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    profile = await _ensure_reward_profile(current_user)
    rewarded_ids = list(profile.get("rewarded_complaint_ids", []))
    already_rewarded = payload.complaint_id in rewarded_ids

    new_badges: List[str] = []
    certificate_unlocked = False
    awarded_tokens = 0

    if not already_rewarded:
        reports_verified = int(profile.get("reports_verified", 0)) + 1
        tokens_earned = int(profile.get("tokens_earned", 0)) + 5
        rank = _rank_for_tokens(tokens_earned)
        badges = list(profile.get("badges", []))
        certificates = list(profile.get("certificates", []))

        new_badges = _new_badges(int(profile.get("reports_submitted", 0)), badges)
        if new_badges:
            badges.extend(new_badges)

        if tokens_earned >= 100 and CERTIFICATE_NAME not in certificates:
            certificates.append(CERTIFICATE_NAME)
            certificate_unlocked = True

        rewarded_ids.append(payload.complaint_id)

        await citizen_rewards_col().update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "reports_verified": reports_verified,
                    "tokens_earned": tokens_earned,
                    "rank": rank,
                    "badges": badges,
                    "certificates": certificates,
                    "rewarded_complaint_ids": rewarded_ids,
                    "updated_at": datetime.utcnow(),
                }
            },
        )

        awarded_tokens = 5
        await _create_notification(
            user_id,
            "Tokens Awarded",
            "Your reported pothole has been repaired. +5 tokens earned.",
            payload.complaint_id,
        )

        for badge in new_badges:
            await _create_notification(
                user_id,
                "Badge Unlocked",
                f"Congratulations! You unlocked the '{badge}' achievement.",
                payload.complaint_id,
            )

        if certificate_unlocked:
            await _create_notification(
                user_id,
                "Certificate Unlocked",
                "You unlocked the Road Safety Contributor Certificate. Download it from your dashboard.",
                payload.complaint_id,
            )

    updated_profile = await citizen_rewards_col().find_one({"user_id": user_id})
    stats = await _build_stats(updated_profile, user_id)
    stats.update(
        {
            "reward_granted": not already_rewarded,
            "awarded_tokens": awarded_tokens,
            "new_badges": new_badges,
            "certificate_unlocked": certificate_unlocked,
        }
    )
    return stats


@router.get("/leaderboard")
async def citizen_leaderboard(limit: int = Query(10, ge=1, le=100)):
    cursor = (
        citizen_rewards_col()
        .find({})
        .sort([("reports_verified", -1), ("tokens_earned", -1), ("reports_submitted", -1)])
        .limit(limit)
    )

    output: List[Dict[str, Any]] = []
    rank = 1
    async for doc in cursor:
        output.append(
            {
                "rank": rank,
                "name": doc.get("full_name") or doc.get("email", "Citizen User"),
                "reports": int(doc.get("reports_verified", 0)),
                "tokens": int(doc.get("tokens_earned", 0)),
            }
        )
        rank += 1

    return output


@router.get("/notifications")
async def citizen_notifications(
    limit: int = Query(20, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = str(current_user.get("id"))
    cursor = notifications_col().find({"recipient_user_id": user_id}).sort("created_at", -1).limit(limit)
    notifications: List[Dict[str, Any]] = []
    async for doc in cursor:
        notifications.append(_serialize_notification(doc))
    return notifications


@router.get("/certificate")
async def citizen_certificate(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = str(current_user.get("id"))
    profile = await _ensure_reward_profile(current_user)

    tokens_earned = int(profile.get("tokens_earned", 0))
    certificates = list(profile.get("certificates", []))
    if tokens_earned < 100 and CERTIFICATE_NAME not in certificates:
        raise HTTPException(status_code=403, detail="Certificate unlocks at 100 tokens")

    if CERTIFICATE_NAME not in certificates:
        certificates.append(CERTIFICATE_NAME)
        await citizen_rewards_col().update_one(
            {"user_id": user_id},
            {"$set": {"certificates": certificates, "updated_at": datetime.utcnow()}},
        )

    full_name = current_user.get("full_name") or profile.get("full_name") or "Citizen User"
    issued_at = datetime.utcnow()
    payload = _build_certificate_pdf(full_name=full_name, tokens=tokens_earned, issued_at=issued_at)
    safe_name = "road_safety_contributor_certificate.pdf"
    headers = {
        "Content-Disposition": f'attachment; filename="{safe_name}"'
    }
    return Response(content=payload, media_type="application/pdf", headers=headers)
