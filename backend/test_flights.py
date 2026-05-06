import sys; sys.path.insert(0, '.'); from services.travel_service import search_flights; import json; print(json.dumps(search_flights('JFK', 'IAD', '2026-05-15', '2026-05-17', 2)))
