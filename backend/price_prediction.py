"""
Price prediction service for Sri Lanka fruit/vegetable market.
Loads pre-trained notebook models and serves runtime predictions.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

import joblib
import pandas as pd


DATASET_NAME = "Vegetables_fruit_prices_with_climate_130000_2020_to_2025.csv"


@dataclass
class Bundle:
    model: Any
    region_encoder: Any
    commodity_encoder: Any
    commodity_col: str
    target_col: str


_CACHE: dict[str, Any] | None = None


def _project_root() -> Path:
    return Path(__file__).resolve().parent.parent


def _find_existing(paths: list[Path]) -> Path:
    for p in paths:
        if p.exists():
            return p
    raise FileNotFoundError(f"Required file not found. Tried: {[str(p) for p in paths]}")


def _resolve_paths() -> dict[str, Path]:
    root = _project_root()
    backend_dir = Path(__file__).resolve().parent
    model_dir = root / "model"

    dataset_env = os.getenv("PRICE_DATASET_PATH")
    dataset_candidates = []
    if dataset_env:
        dataset_candidates.append(Path(dataset_env))
    dataset_candidates.extend(
        [
            root / "model" / DATASET_NAME,
            root / DATASET_NAME,
            backend_dir / DATASET_NAME,
        ]
    )

    return {
        "dataset": _find_existing(dataset_candidates),
        "veg_model": _find_existing(
            [root / "vegetable_model.pkl", model_dir / "vegetable_model.pkl", backend_dir / "vegetable_model.pkl"]
        ),
        "fruit_model": _find_existing(
            [root / "fruit_model.pkl", model_dir / "fruit_model.pkl", backend_dir / "fruit_model.pkl"]
        ),
        "region_encoder": _find_existing(
            [root / "region_encoder.pkl", model_dir / "region_encoder.pkl", backend_dir / "region_encoder.pkl"]
        ),
        "veg_encoder": _find_existing(
            [root / "veg_encoder.pkl", model_dir / "veg_encoder.pkl", backend_dir / "veg_encoder.pkl"]
        ),
        "fruit_encoder": _find_existing(
            [root / "fruit_encoder.pkl", model_dir / "fruit_encoder.pkl", backend_dir / "fruit_encoder.pkl"]
        ),
    }


def _temperature_col(df: pd.DataFrame) -> str:
    col = next((c for c in df.columns if c.startswith("Temperature")), None)
    if not col:
        raise KeyError("Temperature column not found in dataset")
    return col


def _load_cache() -> dict[str, Any]:
    global _CACHE
    if _CACHE is not None:
        return _CACHE

    paths = _resolve_paths()
    df = pd.read_csv(paths["dataset"], encoding="latin1", low_memory=False)

    temp_col = _temperature_col(df)
    # Keep original encoded column names from training, but also ensure numerics.
    for col in [temp_col, "Rainfall (mm)", "Humidity (%)", "Crop Yield Impact Score"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    veg_model = joblib.load(paths["veg_model"])
    fruit_model = joblib.load(paths["fruit_model"])

    # Force single-thread prediction to avoid Windows permission issues with
    # joblib-backed worker pools in constrained environments.
    if hasattr(veg_model, "n_jobs"):
        veg_model.n_jobs = 1
    if hasattr(fruit_model, "n_jobs"):
        fruit_model.n_jobs = 1

    veg_bundle = Bundle(
        model=veg_model,
        region_encoder=joblib.load(paths["region_encoder"]),
        commodity_encoder=joblib.load(paths["veg_encoder"]),
        commodity_col="vegitable_Commodity",
        target_col="vegitable_Price per Unit (LKR/kg)",
    )
    fruit_bundle = Bundle(
        model=fruit_model,
        region_encoder=joblib.load(paths["region_encoder"]),
        commodity_encoder=joblib.load(paths["fruit_encoder"]),
        commodity_col="fruit_Commodity",
        target_col="fruit_Price per Unit (LKR/kg)",
    )

    _CACHE = {
        "paths": paths,
        "df": df,
        "temp_col": temp_col,
        "vegetable": veg_bundle,
        "fruit": fruit_bundle,
    }
    return _CACHE


def get_prediction_options() -> dict[str, Any]:
    cache = _load_cache()
    veg: Bundle = cache["vegetable"]
    fruit: Bundle = cache["fruit"]
    return {
        "dataset_path": str(cache["paths"]["dataset"]),
        "regions": sorted(list(veg.region_encoder.classes_)),
        "vegetable_commodities": sorted(list(veg.commodity_encoder.classes_)),
        "fruit_commodities": sorted(list(fruit.commodity_encoder.classes_)),
        "currency": "LKR",
    }


def get_historical_climate(region: str, target_date: str) -> dict[str, Any]:
    cache = _load_cache()
    df: pd.DataFrame = cache["df"].copy()
    temp_col_name: str = cache["temp_col"]

    try:
        parsed_date = datetime.strptime(target_date, "%Y-%m-%d")
    except ValueError as exc:
        raise ValueError("date must be in YYYY-MM-DD format") from exc

    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    scoped = df[df["Region"] == region].copy()
    if scoped.empty:
        raise ValueError(f"Unknown region: {region}")

    scoped = scoped.dropna(subset=["Date", temp_col_name, "Rainfall (mm)", "Humidity (%)"])
    if scoped.empty:
        raise RuntimeError("Historical climate data is unavailable for the selected region")

    scoped["month"] = scoped["Date"].dt.month
    month_scoped = scoped[scoped["month"] == parsed_date.month].copy()
    if month_scoped.empty:
        month_scoped = scoped

    return {
        "region": region,
        "month": parsed_date.strftime("%B"),
        "sample_count": int(len(month_scoped)),
        "summary": {
            "temperature": round(float(month_scoped[temp_col_name].mean()), 1),
            "rainfall": round(float(month_scoped["Rainfall (mm)"].mean()), 1),
            "humidity": round(float(month_scoped["Humidity (%)"].mean()), 1),
        },
    }


def _best_sell_time(df: pd.DataFrame, bundle: Bundle, commodity: str, region: str) -> str:
    scoped = df[(df[bundle.commodity_col] == commodity) & (df["Region"] == region)].copy()
    if scoped.empty:
        return "No monthly trend available"

    scoped["Date"] = pd.to_datetime(scoped["Date"], errors="coerce")
    scoped = scoped.dropna(subset=["Date", bundle.target_col])
    if scoped.empty:
        return "No monthly trend available"

    scoped["month"] = scoped["Date"].dt.month
    monthly = scoped.groupby("month", as_index=False)[bundle.target_col].mean()
    peak_month = int(monthly.loc[monthly[bundle.target_col].idxmax(), "month"])
    return f"{datetime(1900, peak_month, 1).strftime('%B')} (historically strongest month)"


def _auto_crop_yield_impact_score(
    df: pd.DataFrame,
    bundle: Bundle,
    temp_col_name: str,
    region: str,
    commodity: str,
    temperature: float,
    rainfall: float,
    humidity: float,
) -> float:
    climate_cols = [temp_col_name, "Rainfall (mm)", "Humidity (%)"]

    # Use best-available scope for ideal climate values:
    # 1) same region + commodity, 2) same commodity, 3) whole dataset.
    scoped = df[(df[bundle.commodity_col] == commodity) & (df["Region"] == region)][climate_cols].copy()
    scoped = scoped.apply(pd.to_numeric, errors="coerce").dropna()

    if scoped.empty:
        scoped = df[df[bundle.commodity_col] == commodity][climate_cols].copy()
        scoped = scoped.apply(pd.to_numeric, errors="coerce").dropna()

    if scoped.empty:
        scoped = df[climate_cols].copy()
        scoped = scoped.apply(pd.to_numeric, errors="coerce").dropna()

    if scoped.empty:
        raise RuntimeError("Unable to calculate crop yield impact score: climate baselines unavailable")

    ideal_temp = float(scoped[temp_col_name].mean())
    ideal_rain = float(scoped["Rainfall (mm)"].mean())
    ideal_humidity = float(scoped["Humidity (%)"].mean())

    # Distance-based score (requested formula).
    raw_score = (
        0.01 * ((temperature - ideal_temp) ** 2)
        + 0.005 * ((rainfall - ideal_rain) ** 2)
        + 0.02 * ((humidity - ideal_humidity) ** 2)
    )

    # Clamp to historical distribution to keep model input in a realistic range.
    score_series = pd.to_numeric(df["Crop Yield Impact Score"], errors="coerce").dropna()
    if score_series.empty:
        return round(float(raw_score), 4)

    low = float(score_series.quantile(0.05))
    high = float(score_series.quantile(0.95))
    bounded = max(low, min(high, float(raw_score)))
    return round(bounded, 4)


def _build_features(bundle: Bundle, payload: dict[str, Any], temp_col_name: str, df: pd.DataFrame) -> tuple[pd.DataFrame, float]:
    model_features = list(getattr(bundle.model, "feature_names_in_", []))
    if not model_features:
        raise RuntimeError("Model does not contain feature_names_in_")

    region = payload["region"]
    commodity = payload["commodity"]

    region_enc = int(bundle.region_encoder.transform([region])[0])
    commodity_enc = int(bundle.commodity_encoder.transform([commodity])[0])

    temperature = float(payload["temperature"])
    rainfall = float(payload["rainfall"])
    humidity = float(payload["humidity"])
    crop_yield = _auto_crop_yield_impact_score(
        df=df,
        bundle=bundle,
        temp_col_name=temp_col_name,
        region=region,
        commodity=commodity,
        temperature=temperature,
        rainfall=rainfall,
        humidity=humidity,
    )

    # Encode feature names exactly as model expects (notebook-specific).
    commodity_enc_name = next((x for x in model_features if x.lower().endswith("enc") and x != "Region_enc"), None)
    commodity_region_name = next((x for x in model_features if x.lower().endswith("_region")), None)
    temp_feature_name = next((x for x in model_features if x.startswith("Temperature")), temp_col_name)

    if not commodity_enc_name or not commodity_region_name:
        raise RuntimeError("Commodity encoded feature names not found in model")

    row = {
        temp_feature_name: temperature,
        "Rainfall (mm)": rainfall,
        "Humidity (%)": humidity,
        "Crop Yield Impact Score": crop_yield,
        "Region_enc": region_enc,
        commodity_enc_name: commodity_enc,
        commodity_region_name: commodity_enc * region_enc,
        "Temp_Rain": temperature * rainfall,
        "Temp_Hum": temperature * humidity,
    }

    frame = pd.DataFrame([[row.get(feature, 0.0) for feature in model_features]], columns=model_features)
    return frame, crop_yield


def predict_price(payload: dict[str, Any]) -> dict[str, Any]:
    required = ["category", "region", "commodity", "temperature", "rainfall", "humidity"]
    for key in required:
        if key not in payload:
            raise ValueError(f"Missing field: {key}")

    category = str(payload["category"]).strip().lower()
    if category not in {"fruit", "vegetable"}:
        raise ValueError("category must be 'fruit' or 'vegetable'")

    cache = _load_cache()
    df: pd.DataFrame = cache["df"]
    temp_col_name: str = cache["temp_col"]
    bundle: Bundle = cache[category]

    region = str(payload["region"]).strip()
    commodity = str(payload["commodity"]).strip()

    if region not in set(bundle.region_encoder.classes_):
        raise ValueError(f"Unknown region: {region}")
    if commodity not in set(bundle.commodity_encoder.classes_):
        raise ValueError(f"Unknown commodity for {category}: {commodity}")

    features, crop_yield_score = _build_features(bundle, payload, temp_col_name, df)
    predicted_price = float(bundle.model.predict(features)[0])

    scoped = df[(df[bundle.commodity_col] == commodity) & (df["Region"] == region)][bundle.target_col]
    scoped = pd.to_numeric(scoped, errors="coerce").dropna()
    current_price = float(scoped.mean()) if not scoped.empty else float(pd.to_numeric(df[bundle.target_col], errors="coerce").dropna().mean())

    change_pct = ((predicted_price - current_price) / current_price * 100.0) if current_price else 0.0
    if change_pct > 5:
        trend = "increasing"
    elif change_pct < -5:
        trend = "decreasing"
    else:
        trend = "stable"

    return {
        "category": category,
        "region": region,
        "commodity": commodity,
        "currency": "LKR",
        "current_price": round(current_price, 2),
        "predicted_price": round(predicted_price, 2),
        "change_percent": round(change_pct, 2),
        "trend": trend,
        "best_sell_time": _best_sell_time(df, bundle, commodity, region),
        "crop_yield_impact_score": crop_yield_score,
    }
