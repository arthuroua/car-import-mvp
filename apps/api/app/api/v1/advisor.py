from fastapi import APIRouter

from app.core.calculator import calculate_advisor
from app.schemas import AdvisorInput, AdvisorOutput

router = APIRouter(prefix="/api/v1/advisor", tags=["advisor"])


@router.post("/calculate", response_model=AdvisorOutput)
def calculate(payload: AdvisorInput) -> AdvisorOutput:
    return calculate_advisor(payload)
