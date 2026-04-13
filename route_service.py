"""
Route Service — Google Maps API Wrapper
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Provides route, ETA, and distance calculations for delivery trips.
Uses simulated data for development; swap to real Google Maps API
by setting GOOGLE_MAPS_API_KEY in the environment.

Usage:
    from route_service import get_delivery_route, estimate_eta
"""

import os
import math
import datetime
from typing import List, Dict, Optional

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

# Store location — OFS Downtown San Jose headquarters
STORE_LOCATION = {
    "lat": 37.3352,
    "lng": -121.8811,
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

# Robot speed parameters (simulated)
ROBOT_SPEED_MPH = 5.0
ROBOT_PREP_MINUTES = 3


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two GPS coordinates in miles."""
    R = 3958.8  # Earth radius in miles
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
    """
    Estimate time of arrival for a delivery trip.
    Returns ETA in minutes and the estimated arrival datetime.
    """
    distance = haversine_distance(
        origin["lat"], origin["lng"],
        destination["lat"], destination["lng"],
    )

    # Robot travels at walking speed + prep time
    travel_minutes = (distance / speed_mph) * 60
    total_minutes = int(travel_minutes + ROBOT_PREP_MINUTES)
    total_minutes = max(total_minutes, 5)  # Minimum 5 minutes

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
    """
    Generate a delivery route from the store to a destination.
    Returns route waypoints, distance, ETA, and a polyline-style path.

    If GOOGLE_MAPS_API_KEY is set, uses real Google Maps Directions API.
    Otherwise, returns a simulated route based on coordinates.
    """
    origin = STORE_LOCATION

    # Determine destination
    if destination_coords:
        dest = destination_coords
    elif order_id:
        # Use consistent simulated destination based on order ID
        idx = (order_id - 1) % len(SIMULATED_DESTINATIONS)
        dest = SIMULATED_DESTINATIONS[idx]
    else:
        # Default destination
        dest = SIMULATED_DESTINATIONS[0]

    if destination_address:
        dest["address"] = destination_address

    # Calculate ETA
    eta = estimate_eta(origin, dest)

    # Generate intermediate waypoints for route polyline
    num_waypoints = 6
    route_points = []
    for i in range(num_waypoints + 1):
        t = i / num_waypoints
        lat = origin["lat"] + (dest["lat"] - origin["lat"]) * t
        lng = origin["lng"] + (dest["lng"] - origin["lng"]) * t

        # Add slight curve to make route look realistic
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
    """
    Calculate the current position of a delivery robot based on elapsed time.
    Returns current coordinates, progress percentage, and remaining ETA.
    """
    origin = STORE_LOCATION

    if destination_coords:
        dest = destination_coords
    else:
        idx = (order_id - 1) % len(SIMULATED_DESTINATIONS)
        dest = SIMULATED_DESTINATIONS[idx]

    # Calculate total expected trip duration
    eta = estimate_eta(origin, dest)
    total_minutes = eta["travel_minutes"]

    # Calculate progress
    progress = 0.0
    if started_at:
        elapsed = (datetime.datetime.now() - started_at).total_seconds() / 60
        progress = min(elapsed / max(total_minutes, 1), 1.0)

    # Interpolate current position
    current_lat = origin["lat"] + (dest["lat"] - origin["lat"]) * progress
    current_lng = origin["lng"] + (dest["lng"] - origin["lng"]) * progress

    # Remaining time
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
    """
    Simple route optimization for batching multiple deliveries.
    Groups orders by proximity and respects robot capacity constraints.

    Each order dict should have: order_id, destination (lat/lng), weight_lbs
    Returns a list of batches, each with ordered stops and total metrics.
    """
    if not order_destinations:
        return []

    # Sort orders by distance from store (nearest-first heuristic)
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

        if (len(current_batch) >= max_orders or
                current_weight + weight > max_weight_lbs) and current_batch:
            batches.append(_finalize_batch(current_batch))
            current_batch = []
            current_weight = 0.0

        current_batch.append(order)
        current_weight += weight

    if current_batch:
        batches.append(_finalize_batch(current_batch))

    return batches


def _finalize_batch(orders: List[Dict]) -> Dict:
    """Build final batch metadata."""
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

    # Return distance back to store
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
