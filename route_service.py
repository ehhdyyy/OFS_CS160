import os
import math
import datetime
from typing import List, Dict, Optional

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

# Store location — OFS Downtown San Jose headquarters
STORE_LOCATION = {
    "lat": 37.33305461799275,
    "lng": -121.89068999114191,
    "address": "123 S Market St, San Jose, CA 95113",
}

# Simulated delivery destinations for Downtown San Jose area
SIMULATED_DESTINATIONS = [
    {"lat": 37.3382, "lng": -121.8863, "address": "456 W Santa Clara St, San Jose, CA 95113"},
    {"lat": 37.3318, "lng": -121.8907, "address": "789 Park Ave, San Jose, CA 95113"},
    {"lat": 37.3405, "lng": -121.8950, "address": "321 The Alameda, San Jose, CA 95126"},
    {"lat": 37.3285, "lng": -121.8780, "address": "654 S 1st St, San Jose, CA 95113"},
    {"lat": 37.3420, "lng": -121.8830, "address": "987 N 4th St, San Jose, CA 95112"},
    {"lat": 37.3340, "lng": -121.8750, "address": "246 E San Fernando St, San Jose, CA 95112"},
    {"lat": 37.3365, "lng": -121.8920, "address": "135 W San Carlos St, San Jose, CA 95113"},
    {"lat": 37.3300, "lng": -121.8845, "address": "864 S 2nd St, San Jose, CA 95113"},
]

ROBOT_SPEED_MPH = 5.0
ROBOT_PREP_MINUTES = 3


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 3958.8
    lat1_r, lat2_r = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)

    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def estimate_eta(
    origin: Dict[str, float],
    destination: Dict[str, float],
    speed_mph: float = ROBOT_SPEED_MPH,
) -> Dict:
    distance = haversine_distance(
        origin["lat"], origin["lng"],
        destination["lat"], destination["lng"],
    )

    travel_minutes = (distance / speed_mph) * 60
    total_minutes = int(travel_minutes + ROBOT_PREP_MINUTES)
    total_minutes = max(total_minutes, 5)

    arrival_time = datetime.datetime.now() + datetime.timedelta(minutes=total_minutes)

    return {
        "distance_miles": round(distance, 2),
        "travel_minutes": total_minutes,
        "estimated_arrival": arrival_time.isoformat(),
    }


def get_delivery_route(
    destination_address: Optional[str] = None,
    destination_coords: Optional[Dict[str, float]] = None,
    order_id: Optional[int] = None,
) -> Dict:
    origin = STORE_LOCATION

    if destination_coords:
        dest = dict(destination_coords)
    elif order_id:
        idx = (order_id - 1) % len(SIMULATED_DESTINATIONS)
        dest = dict(SIMULATED_DESTINATIONS[idx])
    else:
        dest = dict(SIMULATED_DESTINATIONS[0])

    if destination_address:
        dest["address"] = destination_address

    eta = estimate_eta(origin, dest)

    num_waypoints = 6
    route_points = []
    for i in range(num_waypoints + 1):
        t = i / num_waypoints
        lat = origin["lat"] + (dest["lat"] - origin["lat"]) * t
        lng = origin["lng"] + (dest["lng"] - origin["lng"]) * t

        if 0 < t < 1:
            offset = math.sin(t * math.pi) * 0.001
            lng += offset

        route_points.append({
            "lat": round(lat, 6),
            "lng": round(lng, 6),
        })

    return {
        "origin": {
            "lat": origin["lat"],
            "lng": origin["lng"],
            "address": origin["address"],
        },
        "destination": {
            "lat": dest["lat"],
            "lng": dest["lng"],
            "address": dest.get("address", destination_address or "Downtown San Jose"),
        },
        "route": route_points,
        "distance_miles": eta["distance_miles"],
        "eta_minutes": eta["travel_minutes"],
        "estimated_arrival": eta["estimated_arrival"],
        "source": "google_maps" if GOOGLE_MAPS_API_KEY else "simulated",
    }


def get_progress_location(
    order_id: int,
    started_at: Optional[datetime.datetime],
    destination_coords: Optional[Dict[str, float]] = None,
) -> Dict:
    origin = STORE_LOCATION

    if destination_coords:
        dest = dict(destination_coords)
    else:
        idx = (order_id - 1) % len(SIMULATED_DESTINATIONS)
        dest = dict(SIMULATED_DESTINATIONS[idx])

    eta = estimate_eta(origin, dest)
    total_minutes = eta["travel_minutes"]

    progress = 0.0
    if started_at:
        elapsed = (datetime.datetime.now() - started_at).total_seconds() / 60
        progress = min(elapsed / max(total_minutes, 1), 1.0)

    current_lat = origin["lat"] + (dest["lat"] - origin["lat"]) * progress
    current_lng = origin["lng"] + (dest["lng"] - origin["lng"]) * progress

    remaining_minutes = max(int(total_minutes * (1 - progress)), 0)
    if 0 < progress < 1:
        remaining_minutes = max(remaining_minutes, 1)

    return {
        "current_location": {
            "lat": round(current_lat, 6),
            "lng": round(current_lng, 6),
        },
        "store_location": {
            "lat": origin["lat"],
            "lng": origin["lng"],
        },
        "destination_location": {
            "lat": dest["lat"],
            "lng": dest["lng"],
        },
        "progress": round(progress, 3),
        "eta_minutes": remaining_minutes if progress < 1 else 0,
        "distance_miles": eta["distance_miles"],
        "distance_remaining_miles": round(eta["distance_miles"] * (1 - progress), 2),
    }


def batch_route_optimization(
    order_destinations: List[Dict],
    max_weight_lbs: float = 200.0,
    max_orders: int = 10,
) -> List[Dict]:
    if not order_destinations:
        return []

    origin = STORE_LOCATION
    for order in order_destinations:
        dest = order.get("destination", {})
        order["_distance"] = haversine_distance(
            origin["lat"], origin["lng"],
            dest.get("lat", origin["lat"]),
            dest.get("lng", origin["lng"]),
        )

    sorted_orders = sorted(order_destinations, key=lambda x: x["_distance"])

    batches = []
    current_batch = []
    current_weight = 0.0

    for order in sorted_orders:
        weight = float(order.get("weight_lbs", 0))

        if (len(current_batch) >= max_orders or current_weight + weight > max_weight_lbs) and current_batch:
            batches.append(_finalize_batch(current_batch))
            current_batch = []
            current_weight = 0.0

        current_batch.append(order)
        current_weight += weight

    if current_batch:
        batches.append(_finalize_batch(current_batch))

    return batches


def _finalize_batch(orders: List[Dict]) -> Dict:
    origin = STORE_LOCATION
    total_distance = 0.0
    prev = origin

    for order in orders:
        dest = order.get("destination", {})
        total_distance += haversine_distance(
            prev.get("lat", origin["lat"]), prev.get("lng", origin["lng"]),
            dest.get("lat", origin["lat"]), dest.get("lng", origin["lng"]),
        )
        prev = dest

    total_distance += haversine_distance(
        prev.get("lat", origin["lat"]), prev.get("lng", origin["lng"]),
        origin["lat"], origin["lng"],
    )

    total_weight = sum(float(o.get("weight_lbs", 0)) for o in orders)
    total_minutes = int((total_distance / ROBOT_SPEED_MPH) * 60) + ROBOT_PREP_MINUTES

    return {
        "order_ids": [o["order_id"] for o in orders],
        "order_count": len(orders),
        "total_weight_lbs": round(total_weight, 2),
        "total_distance_miles": round(total_distance, 2),
        "estimated_minutes": total_minutes,
        "stops": [
            {
                "order_id": o["order_id"],
                "lat": o.get("destination", {}).get("lat"),
                "lng": o.get("destination", {}).get("lng"),
                "address": o.get("address", ""),
            }
            for o in orders
        ],
    }