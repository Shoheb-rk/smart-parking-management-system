import asyncio
from contextlib import asynccontextmanager
from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    WebSocket,
    WebSocketDisconnect
)
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import qrcode
import io
import base64

from database import engine, get_db, Base
import models
import schemas

# Create all tables in database (if they don't exist)
Base.metadata.create_all(bind=engine)

# ─────────────────────────────────────────────────────────────
# WebSocket Connection Manager
# ─────────────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active_connections = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(
            f"WebSocket connected. "
            f"Clients: {len(self.active_connections)}"
        )

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(
            f"WebSocket disconnected. "
            f"Clients: {len(self.active_connections)}"
        )

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                disconnected.append(connection)
        for connection in disconnected:
            self.disconnect(connection)


manager = ConnectionManager()

async def reservation_expiry_worker():
    while True:
        db = next(get_db())
        try:
            now = datetime.now()
            expired_reservations = db.query(
                models.Reservation
            ).filter(
                models.Reservation.status == "active",
                models.Reservation.expires_at < now
            ).all()

            released_slots = []

            for reservation in expired_reservations:
                reservation.status = "expired"
                slot = reservation.slot
                if slot and slot.status == "reserved":
                    slot.status = "free"
                    released_slots.append(slot.slot_name)
                    print(
                        f"Reservation {reservation.id} expired. "
                        f"Slot {slot.slot_name} released."
                    )

            db.commit()

            for slot_name in released_slots:
                await manager.broadcast({
                    "event": "slot_free",
                    "slot":  slot_name
                })

        except Exception as e:
            print("Expiry worker error:", e)
        finally:
            db.close()

        await asyncio.sleep(30)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(
        reservation_expiry_worker()
    )
    yield
    task.cancel()


# Create FastAPI app
app = FastAPI(
    title="Smart Parking Management System",
    description="AI-Powered Parking Management API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── ROOT ENDPOINT ───────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "Smart Parking API is running"}

# ─────────────────────────────────────────────────────────────
# WebSocket Endpoint
# ─────────────────────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ─── GET ALL SLOTS ───────────────────────────────────────────
@app.get("/slots", response_model=list[schemas.SlotResponse])
def get_slots(db: Session = Depends(get_db)):
    slots = db.query(models.ParkingSlot).all()
    return slots

# ─── GET SINGLE SLOT ─────────────────────────────────────────
@app.get("/slots/{slot_id}", response_model=schemas.SlotResponse)
def get_slot(slot_id: int, db: Session = Depends(get_db)):
    slot = db.query(models.ParkingSlot).filter(
        models.ParkingSlot.id == slot_id
    ).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    return slot

# ─── RESERVE A SLOT ──────────────────────────────────────────
@app.post("/slots/{slot_id}/reserve",
          response_model=schemas.ReservationResponse)
async def reserve_slot(
    slot_id: int,
    reservation_data: schemas.ReservationCreate,
    db: Session = Depends(get_db)
):
    slot = db.query(models.ParkingSlot).filter(
        models.ParkingSlot.id == slot_id
    ).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    if slot.status != "free":
        raise HTTPException(
            status_code=400,
            detail=f"Slot is currently {slot.status}"
        )

    now        = datetime.now()
    expires_at = now + timedelta(minutes=5)

    reservation = models.Reservation(
        slot_id        = slot_id,
        driver_name    = reservation_data.driver_name,
        vehicle_number = reservation_data.vehicle_number,
        reserved_at    = now,
        expires_at     = expires_at,
        status         = "active"
    )
    db.add(reservation)

    slot.status     = "reserved"
    slot.updated_at = now

    db.commit()
    db.refresh(reservation)

    await manager.broadcast({
        "event": "slot_reserved",
        "slot":  slot.slot_name
    })

    return reservation

# ─── PROCESS PAYMENT ─────────────────────────────────────────
@app.post("/payments", response_model=schemas.PaymentResponse)
async def process_payment(
    payment_data: schemas.PaymentCreate,
    db: Session = Depends(get_db)
):
    reservation = db.query(models.Reservation).filter(
        models.Reservation.id == payment_data.reservation_id
    ).first()
    if not reservation:
        raise HTTPException(
            status_code=404, detail="Reservation not found"
        )

    qr_content = (
        f"PARKING AUTHORIZED\n"
        f"Slot: {reservation.slot.slot_name}\n"
        f"Driver: {reservation.driver_name}\n"
        f"Vehicle: {reservation.vehicle_number}\n"
        f"Paid: Rs.{payment_data.amount}\n"
        f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    )

    qr        = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(qr_content)
    qr.make(fit=True)
    qr_image  = qr.make_image(fill_color="black", back_color="white")

    buffer    = io.BytesIO()
    qr_image.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()

    payment = models.Payment(
        reservation_id = payment_data.reservation_id,
        amount         = payment_data.amount,
        qr_code_data   = qr_base64,
        status         = "completed"
    )
    db.add(payment)

    slot        = reservation.slot
    slot.status = "occupied"

    db.commit()
    db.refresh(payment)

    await manager.broadcast({
        "event": "slot_occupied",
        "slot":  slot.slot_name
    })

    return payment

# ─── MANUAL RELEASE SLOT ─────────────────────────────────────
@app.post("/slots/{slot_id}/release")
async def release_slot(
    slot_id: int,
    db: Session = Depends(get_db)
):
    slot = db.query(models.ParkingSlot).filter(
        models.ParkingSlot.id == slot_id
    ).first()

    if not slot:
        raise HTTPException(
            status_code=404, detail="Slot not found"
        )

    slot.status     = "free"
    slot.updated_at = datetime.now()
    db.commit()

    await manager.broadcast({
        "event": "slot_free",
        "slot":  slot.slot_name
    })

    return {"message": f"Slot {slot.slot_name} released"}

# ─── AI DETECTION UPDATE ─────────────────────────────────────
# This endpoint is called by occupancy_detector.py
# every time a slot status changes
@app.post("/ai/update-slot")
async def ai_update_slot(
    update_data: schemas.AISlotUpdate,
    db: Session = Depends(get_db)
):
    # Find slot by name (e.g. "56", "57")
    slot = db.query(models.ParkingSlot).filter(
        models.ParkingSlot.slot_name == update_data.slot_name
    ).first()

    if not slot:
        raise HTTPException(
            status_code=404,
            detail=f"Slot {update_data.slot_name} not found"
        )

    # Only update if status actually changed
    if slot.status == update_data.status:
        return {"message": "No change"}

    # Never override a reservation with free signal from AI
    # Reservation expiry worker handles that
    if slot.status == "reserved" and update_data.status == "free":
        return {"message": "Slot is reserved, ignoring free signal"}

    # Update slot status
    old_status      = slot.status
    slot.status     = update_data.status
    slot.updated_at = datetime.now()
    db.commit()

    print(
        f"AI Update: Slot {slot.slot_name} "
        f"{old_status} → {update_data.status}"
    )

    # Broadcast via WebSocket
    event_name = (
        "slot_occupied" if update_data.status == "occupied"
        else "slot_free"
    )

    await manager.broadcast({
        "event": event_name,
        "slot":  slot.slot_name
    })

    return {
        "message": "Slot updated",
        "slot":    slot.slot_name,
        "status":  update_data.status
    }

# ─── DASHBOARD STATS ─────────────────────────────────────────
@app.get("/dashboard/stats",
         response_model=schemas.DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    slots         = db.query(models.ParkingSlot).all()
    total         = len(slots)
    free          = sum(1 for s in slots if s.status == "free")
    occupied      = sum(1 for s in slots if s.status == "occupied")
    reserved      = sum(1 for s in slots if s.status == "reserved")
    occupancy_pct = round((occupied / total * 100), 2) if total > 0 else 0

    return {
        "total_slots"    : total,
        "free_slots"     : free,
        "occupied_slots" : occupied,
        "reserved_slots" : reserved,
        "occupancy_pct"  : occupancy_pct
    }

print("\nREGISTERED ROUTES:")
for route in app.routes:
    print(route.path)