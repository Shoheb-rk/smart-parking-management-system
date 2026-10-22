from sqlalchemy import Column, Integer, String, DateTime, Numeric, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

# ParkingSlot table — mirrors what we created in PostgreSQL
class ParkingSlot(Base):
    __tablename__ = "parking_slots"

    id         = Column(Integer, primary_key=True, index=True)
    slot_name  = Column(String(10), nullable=False)
    status     = Column(String(20), default="free")
    x1         = Column(Integer)
    y1         = Column(Integer)
    x2         = Column(Integer)
    y2         = Column(Integer)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # One slot can have many reservations
    reservations = relationship("Reservation", back_populates="slot")

# Reservation table
class Reservation(Base):
    __tablename__ = "reservations"

    id             = Column(Integer, primary_key=True, index=True)
    slot_id        = Column(Integer, ForeignKey("parking_slots.id"))
    driver_name    = Column(String(100))
    vehicle_number = Column(String(20))
    reserved_at    = Column(DateTime, default=func.now())
    expires_at     = Column(DateTime)
    status         = Column(String(20), default="active")

    # Link back to the slot
    slot    = relationship("ParkingSlot", back_populates="reservations")
    payment = relationship("Payment", back_populates="reservation", uselist=False)

# Payment table
class Payment(Base):
    __tablename__ = "payments"

    id             = Column(Integer, primary_key=True, index=True)
    reservation_id = Column(Integer, ForeignKey("reservations.id"))
    amount         = Column(Numeric(10, 2))
    paid_at        = Column(DateTime, default=func.now())
    qr_code_data   = Column(Text)
    status         = Column(String(20), default="completed")

    # Link back to reservation
    reservation = relationship("Reservation", back_populates="payment")