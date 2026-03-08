from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from statistics import mean
from typing import Any
from urllib.parse import urlencode
from urllib.request import urlopen

from price_prediction import get_historical_climate


OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
SRI_LANKA_TIMEZONE = "Asia/Colombo"
FORECAST_WINDOW_DAYS = 3
REAL_WEATHER_MAX_DAYS = 14


@dataclass(frozen=True)
class DistrictLocation:
    name: str
    latitude: float
    longitude: float


DISTRICT_COORDINATES: dict[str, DistrictLocation] = {
    "Ampara": DistrictLocation("Ampara", 7.2917, 81.6724),
    "Anuradhapura": DistrictLocation("Anuradhapura", 8.3114, 80.4037),
    "Badulla": DistrictLocation("Badulla", 6.9934, 81.0550),
    "Batticaloa": DistrictLocation("Batticaloa", 7.7315, 81.6747),
    "Colombo": DistrictLocation("Colombo", 6.9271, 79.8612),
    "Galle": DistrictLocation("Galle", 6.0535, 80.2210),
    "Gampaha": DistrictLocation("Gampaha", 7.0840, 80.0098),
    "Hambantota": DistrictLocation("Hambantota", 6.1241, 81.1185),
    "Jaffna": DistrictLocation("Jaffna", 9.6615, 80.0255),
    "Kalutara": DistrictLocation("Kalutara", 6.5854, 79.9607),
    "Kandy": DistrictLocation("Kandy", 7.2906, 80.6337),
    "Kegalle": DistrictLocation("Kegalle", 7.2513, 80.3464),
    "Kilinochchi": DistrictLocation("Kilinochchi", 9.3803, 80.3760),
    "Kurunegala": DistrictLocation("Kurunegala", 7.4863, 80.3647),
    "Mannar": DistrictLocation("Mannar", 8.9800, 79.9042),
    "Matale": DistrictLocation("Matale", 7.4675, 80.6234),
    "Matara": DistrictLocation("Matara", 5.9549, 80.5550),
    "Monaragala": DistrictLocation("Monaragala", 6.8728, 81.3507),
    "Mullaitivu": DistrictLocation("Mullaitivu", 9.2671, 80.8142),
    "Nuwara Eliya": DistrictLocation("Nuwara Eliya", 6.9497, 80.7891),
    "Polonnaruwa": DistrictLocation("Polonnaruwa", 7.9403, 81.0188),
    "Puttalam": DistrictLocation("Puttalam", 8.0362, 79.8283),
    "Ratnapura": DistrictLocation("Ratnapura", 6.6828, 80.3992),
    "Trincomalee": DistrictLocation("Trincomalee", 8.5874, 81.2152),
    "Vavuniya": DistrictLocation("Vavuniya", 8.7514, 80.4971),
}


def _normalize_region(region: str) -> str:
    return " ".join(part for part in str(region).strip().split())


def _parse_target_date(value: str) -> date:
    try:
        parsed = datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError as exc:
        raise ValueError("date must be in YYYY-MM-DD format") from exc

    if parsed < date.today():
        raise ValueError("date must be today or a future date")
    return parsed


def _get_location(region: str) -> DistrictLocation:
    normalized = _normalize_region(region)
    try:
        return DISTRICT_COORDINATES[normalized]
    except KeyError as exc:
        raise ValueError(f"Unsupported district: {normalized}") from exc


def _build_url(location: DistrictLocation, start_date: date, end_date: date) -> str:
    query = urlencode(
        {
            "latitude": location.latitude,
            "longitude": location.longitude,
            "hourly": "temperature_2m,relative_humidity_2m,rain",
            "timezone": SRI_LANKA_TIMEZONE,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
        }
    )
    return f"{OPEN_METEO_FORECAST_URL}?{query}"


def _load_forecast(url: str) -> dict[str, Any]:
    with urlopen(url, timeout=15) as response:
        return json.loads(response.read().decode("utf-8"))


def _build_live_forecast(region: str, target_date: date) -> dict[str, Any]:
    location = _get_location(region)
    end_date = target_date + timedelta(days=FORECAST_WINDOW_DAYS - 1)
    url = _build_url(location, target_date, end_date)
    payload = _load_forecast(url)
    hourly = payload.get("hourly") or {}

    times = hourly.get("time") or []
    temperatures = hourly.get("temperature_2m") or []
    humidities = hourly.get("relative_humidity_2m") or []
    rain_values = hourly.get("rain") or []

    if not times or not temperatures or not humidities or not rain_values:
        raise RuntimeError("Weather forecast data is unavailable for the selected district/date")

    grouped: dict[str, dict[str, list[float]]] = {}
    for ts, temp, humidity, rain in zip(times, temperatures, humidities, rain_values):
        day_key = str(ts).split("T", 1)[0]
        bucket = grouped.setdefault(day_key, {"temperature": [], "humidity": [], "rain": []})
        bucket["temperature"].append(float(temp))
        bucket["humidity"].append(float(humidity))
        bucket["rain"].append(float(rain))

    selected_days: list[dict[str, Any]] = []
    for day_key in sorted(grouped):
        if not (target_date.isoformat() <= day_key <= end_date.isoformat()):
            continue
        bucket = grouped[day_key]
        selected_days.append(
            {
                "date": day_key,
                "avg_temperature": round(mean(bucket["temperature"]), 1),
                "total_rainfall": round(sum(bucket["rain"]), 1),
                "avg_humidity": round(mean(bucket["humidity"]), 1),
            }
        )

    if not selected_days:
        raise RuntimeError("No forecast days returned for the selected range")

    return {
        "district": location.name,
        "requested_date": target_date.isoformat(),
        "mode": "real_weather",
        "is_historical_estimate": False,
        "message": "Weather forecast fetched from live API for the next few days.",
        "forecast_window_days": FORECAST_WINDOW_DAYS,
        "forecast_days": selected_days,
        "summary": {
            "temperature": round(mean(day["avg_temperature"] for day in selected_days), 1),
            "rainfall": round(mean(day["total_rainfall"] for day in selected_days), 1),
            "humidity": round(mean(day["avg_humidity"] for day in selected_days), 1),
        },
        "source": "Open-Meteo",
    }


def _build_historical_estimate(region: str, target_date: date) -> dict[str, Any]:
    climate = get_historical_climate(region, target_date.isoformat())
    summary = climate["summary"]
    day_entry = {
        "date": target_date.isoformat(),
        "avg_temperature": summary["temperature"],
        "total_rainfall": summary["rainfall"],
        "avg_humidity": summary["humidity"],
    }

    return {
        "district": climate["region"],
        "requested_date": target_date.isoformat(),
        "mode": "historical_climate",
        "is_historical_estimate": True,
        "message": "Exact weather unavailable for this date. Prediction based on historical climate data.",
        "forecast_window_days": 1,
        "forecast_days": [day_entry],
        "summary": summary,
        "source": f"Historical climate averages for {climate['month']}",
        "sample_count": climate["sample_count"],
    }


def get_weather_forecast(region: str, target_date: str) -> dict[str, Any]:
    parsed_date = _parse_target_date(target_date)
    days_ahead = (parsed_date - date.today()).days

    if days_ahead <= REAL_WEATHER_MAX_DAYS:
        return _build_live_forecast(region, parsed_date)
    return _build_historical_estimate(region, parsed_date)
