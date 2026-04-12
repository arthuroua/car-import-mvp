from app.schemas import AdvisorInput, AdvisorOutput, AdvisorScenario


def _max_bid(target_sell_price: float, desired_margin: float, total_no_bid: float) -> float:
    return round(target_sell_price - desired_margin - total_no_bid, 2)


def calculate_advisor(payload: AdvisorInput) -> AdvisorOutput:
    total_no_bid = (
        payload.fees_usd
        + payload.logistics_usd
        + payload.customs_usd
        + payload.repair_usd
        + payload.local_costs_usd
        + payload.risk_buffer_usd
    )

    base = _max_bid(payload.target_sell_price_usd, payload.desired_margin_usd, total_no_bid)

    low = _max_bid(payload.target_sell_price_usd, payload.desired_margin_usd, total_no_bid * 1.15)
    high = _max_bid(payload.target_sell_price_usd, payload.desired_margin_usd, total_no_bid * 0.90)

    return AdvisorOutput(
        total_no_bid_usd=round(total_no_bid, 2),
        max_bid_usd=base,
        scenarios=[
            AdvisorScenario(name="low", max_bid_usd=low),
            AdvisorScenario(name="base", max_bid_usd=base),
            AdvisorScenario(name="high", max_bid_usd=high),
        ],
    )
