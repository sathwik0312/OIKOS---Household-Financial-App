import os, sys; sys.path.insert(0, '.'); from services.travel_service import search_flights; print(search_flights('JFK', 'LAX', '2026-06-15'))
