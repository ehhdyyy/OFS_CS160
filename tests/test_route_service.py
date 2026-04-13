"""
Unit Tests — Route Service
~~~~~~~~~~~~~~~~~~~~~~~~~~~
Tests for the route optimization wrapper, ETA estimation,
delivery progress tracking, and batch optimization.

Run:  pytest tests/test_route_service.py -v
"""

import pytest
import datetime
from route_service import (
    haversine_distance,
    estimate_eta,
    get_delivery_route,
    get_progress_location,
    batch_route_optimization,
    STORE_LOCATION,
    SIMULATED_DESTINATIONS,
)


class TestHaversineDistance:
    """Test distance calculations."""

    def test_same_point_is_zero(self):
        d = haversine_distance(37.3352, -121.8811, 37.3352, -121.8811)
        assert d == 0.0

    def test_known_distance_reasonable(self):
        """Store to first simulated destination should be under 1 mile."""
        dest = SIMULATED_DESTINATIONS[0]
        d = haversine_distance(
            STORE_LOCATION["lat"], STORE_LOCATION["lng"],
            dest["lat"], dest["lng"],
        )
        assert 0 < d < 1.0  # Downtown San Jose points are close

    def test_distance_is_symmetric(self):
        d1 = haversine_distance(37.33, -121.88, 37.34, -121.89)
        d2 = haversine_distance(37.34, -121.89, 37.33, -121.88)
        assert abs(d1 - d2) < 0.001

    def test_distance_increases_with_separation(self):
        d_near = haversine_distance(37.33, -121.88, 37.331, -121.881)
        d_far = haversine_distance(37.33, -121.88, 37.35, -121.90)
        assert d_far > d_near


class TestEstimateETA:
    """Test ETA estimation."""

    def test_eta_returns_expected_fields(self):
        origin = {"lat": 37.3352, "lng": -121.8811}
        dest = {"lat": 37.3382, "lng": -121.8863}
        eta = estimate_eta(origin, dest)

        assert "distance_miles" in eta
        assert "travel_minutes" in eta
        assert "estimated_arrival" in eta

    def test_eta_minimum_is_5_minutes(self):
        """Even very close points should have at least 5 min ETA."""
        origin = {"lat": 37.3352, "lng": -121.8811}
        dest = {"lat": 37.3353, "lng": -121.8812}
        eta = estimate_eta(origin, dest)
        assert eta["travel_minutes"] >= 5

    def test_eta_increases_with_distance(self):
        origin = {"lat": 37.3352, "lng": -121.8811}
        near = {"lat": 37.3360, "lng": -121.8820}
        far = {"lat": 37.3500, "lng": -121.9000}

        eta_near = estimate_eta(origin, near)
        eta_far = estimate_eta(origin, far)
        assert eta_far["travel_minutes"] >= eta_near["travel_minutes"]


class TestGetDeliveryRoute:
    """Test route generation."""

    def test_route_by_order_id(self):
        route = get_delivery_route(order_id=1)
        assert "origin" in route
        assert "destination" in route
        assert "route" in route
        assert "eta_minutes" in route
        assert "distance_miles" in route
        assert route["source"] == "simulated"

    def test_route_has_waypoints(self):
        route = get_delivery_route(order_id=1)
        assert len(route["route"]) >= 3
        for point in route["route"]:
            assert "lat" in point
            assert "lng" in point

    def test_route_origin_is_store(self):
        route = get_delivery_route(order_id=1)
        assert route["origin"]["lat"] == STORE_LOCATION["lat"]
        assert route["origin"]["lng"] == STORE_LOCATION["lng"]

    def test_different_orders_get_different_destinations(self):
        r1 = get_delivery_route(order_id=1)
        r2 = get_delivery_route(order_id=2)
        # Different orders should get different simulated destinations
        assert (r1["destination"]["lat"] != r2["destination"]["lat"] or
                r1["destination"]["lng"] != r2["destination"]["lng"])

    def test_route_with_custom_address(self):
        route = get_delivery_route(
            destination_address="999 Custom Blvd, San Jose",
            order_id=3,
        )
        assert route["destination"]["address"] == "999 Custom Blvd, San Jose"

    def test_route_eta_is_positive(self):
        route = get_delivery_route(order_id=1)
        assert route["eta_minutes"] > 0
        assert route["distance_miles"] > 0


class TestGetProgressLocation:
    """Test delivery progress tracking."""

    def test_no_start_means_zero_progress(self):
        result = get_progress_location(order_id=1, started_at=None)
        assert result["progress"] == 0.0
        assert result["current_location"]["lat"] == STORE_LOCATION["lat"]

    def test_recent_start_has_low_progress(self):
        started = datetime.datetime.now() - datetime.timedelta(minutes=1)
        result = get_progress_location(order_id=1, started_at=started)
        assert 0 < result["progress"] < 0.5

    def test_old_start_has_full_progress(self):
        started = datetime.datetime.now() - datetime.timedelta(hours=2)
        result = get_progress_location(order_id=1, started_at=started)
        assert result["progress"] == 1.0
        assert result["eta_minutes"] == 0

    def test_progress_has_required_fields(self):
        started = datetime.datetime.now() - datetime.timedelta(minutes=5)
        result = get_progress_location(order_id=1, started_at=started)
        assert "current_location" in result
        assert "store_location" in result
        assert "destination_location" in result
        assert "progress" in result
        assert "eta_minutes" in result
        assert "distance_miles" in result


class TestBatchRouteOptimization:
    """Test multi-order batching."""

    def test_empty_orders_returns_empty(self):
        result = batch_route_optimization([])
        assert result == []

    def test_single_order_batch(self):
        orders = [{
            "order_id": 1,
            "destination": {"lat": 37.338, "lng": -121.886},
            "weight_lbs": 5.0,
        }]
        result = batch_route_optimization(orders)
        assert len(result) == 1
        assert result[0]["order_count"] == 1
        assert result[0]["order_ids"] == [1]

    def test_respects_max_orders_per_batch(self):
        orders = [
            {
                "order_id": i,
                "destination": SIMULATED_DESTINATIONS[i % len(SIMULATED_DESTINATIONS)],
                "weight_lbs": 5.0,
            }
            for i in range(15)
        ]
        result = batch_route_optimization(orders, max_orders=10)
        assert len(result) >= 2
        for batch in result:
            assert batch["order_count"] <= 10

    def test_respects_max_weight(self):
        orders = [
            {
                "order_id": i,
                "destination": SIMULATED_DESTINATIONS[0],
                "weight_lbs": 80.0,
            }
            for i in range(5)
        ]
        result = batch_route_optimization(orders, max_weight_lbs=200.0)
        assert len(result) >= 2  # 3x120=360 > 200, needs multiple batches
        for batch in result:
            assert batch["total_weight_lbs"] <= 200.0

    def test_batch_has_distance_and_time(self):
        orders = [
            {
                "order_id": 1,
                "destination": SIMULATED_DESTINATIONS[0],
                "weight_lbs": 10.0,
                "address": "456 W Santa Clara St",
            },
            {
                "order_id": 2,
                "destination": SIMULATED_DESTINATIONS[1],
                "weight_lbs": 15.0,
                "address": "789 Park Ave",
            },
        ]
        result = batch_route_optimization(orders)
        assert len(result) == 1
        batch = result[0]
        assert batch["total_distance_miles"] > 0
        assert batch["estimated_minutes"] > 0
        assert len(batch["stops"]) == 2
