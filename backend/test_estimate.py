import sys; sys.path.insert(0, '.'); from services.travel_service import estimate_trip_cost; import json; print(json.dumps(estimate_trip_cost('JFK', 'LAX', '2026-06-15', '2026-06-20', 2)))
