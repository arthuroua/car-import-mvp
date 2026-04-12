from fastapi import APIRouter, HTTPException

from app.data.mock_data import MOCK_VEHICLES
from app.schemas import VehicleCard

router = APIRouter(prefix="/api/v1", tags=["vehicles"])


@router.get("/vehicles/{vin}", response_model=VehicleCard)
def get_vehicle(vin: str) -> VehicleCard:
    vin_key = vin.upper()
    vehicle = MOCK_VEHICLES.get(vin_key)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    return VehicleCard(**vehicle)
