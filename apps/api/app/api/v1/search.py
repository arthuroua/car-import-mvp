from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.data.mock_data import MOCK_VEHICLES
from app.db import get_db
from app.models import Lot, Vehicle
from app.schemas import SearchResult

router = APIRouter(prefix="/api/v1", tags=["search"])


@router.get("/search", response_model=SearchResult)
def search(vin: str = Query(min_length=17, max_length=17), db: Session = Depends(get_db)) -> SearchResult:
    vin_key = vin.upper()

    vehicle = db.get(Vehicle, vin_key)
    if vehicle is not None:
        lots = db.execute(select(Lot).where(Lot.vin == vin_key).order_by(Lot.sale_date.desc(), Lot.fetched_at.desc())).scalars().all()
        latest_status = lots[0].status if lots and lots[0].status else "Unknown"
        return SearchResult(vin=vin_key, lots_found=len(lots), latest_status=latest_status)

    fallback_vehicle = MOCK_VEHICLES.get(vin_key)
    if fallback_vehicle:
        fallback_lots = fallback_vehicle.get("lots", [])
        latest_status = fallback_lots[0]["status"] if fallback_lots else "Unknown"
        return SearchResult(vin=vin_key, lots_found=len(fallback_lots), latest_status=latest_status)

    raise HTTPException(status_code=404, detail="VIN not found")
