from fastapi import APIRouter, HTTPException, Query

from app.data.mock_data import MOCK_VEHICLES
from app.schemas import SearchResult

router = APIRouter(prefix="/api/v1", tags=["search"])


@router.get("/search", response_model=SearchResult)
def search(vin: str = Query(min_length=17, max_length=17)) -> SearchResult:
    vin_key = vin.upper()
    vehicle = MOCK_VEHICLES.get(vin_key)
    if not vehicle:
        raise HTTPException(status_code=404, detail="VIN not found")

    lots = vehicle.get("lots", [])
    latest_status = lots[0]["status"] if lots else "Unknown"

    return SearchResult(vin=vin_key, lots_found=len(lots), latest_status=latest_status)
