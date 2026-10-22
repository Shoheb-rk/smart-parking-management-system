from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# --- Parking Slot Schemas ---

class SlotBase(BaseModel):
    slot_name : str
    status    : str

class SlotResponse(SlotBase):
    id         : int
    x1         : int
    y1         : int
    x2         : int
    y2         : int
    updated_at : Optional[datetime]

    class Config:
        from_attributes = True

# --- Reservation Schemas ---

class ReservationCreate(BaseModel):
    driver_name    : str
    vehicle_number : str

class ReservationResponse(BaseModel):
    id             : int
    slot_id        : int
    driver_name    : str
    vehicle_number : str
    reserved_at    : datetime
    expires_at     : datetime
    status         : str

    class Config:
        from_attributes = True

# --- Payment Schemas ---

class PaymentCreate(BaseModel):
    reservation_id : int
    amount         : float

class PaymentResponse(BaseModel):
    id             : int
    reservation_id : int
    amount         : float
    paid_at        : datetime
    qr_code_data   : str
    status         : str

    class Config:
        from_attributes = True

# --- Dashboard Stats Schema ---

class DashboardStats(BaseModel):
    total_slots    : int
    free_slots     : int
    occupied_slots : int
    reserved_slots : int
    occupancy_pct  : float

# --- AI Detection Update Schema ---
class AISlotUpdate(BaseModel):
    slot_name : str
    status    : str  # "occupied" or "free"    