from datetime import datetime
from typing import Optional
import pandas as pd

from app.ml.core_logic import HerdSimulator
from app.ml.data_processor import (
    clean_single_file,
    calculate_empirical_params,
    CURRENT_DATE,
)


class MLPredictionService:
    @staticmethod
    def predict(
        file_content: bytes,
        months: int = 36,
        purchase: int = 0,
        target_date: Optional[str] = None,
        params_source: str = "custom",
        maintain_replacement: bool = False,
        growth_target: Optional[float] = None,
        purchase_curve: Optional[str] = None,
        age_first_insem: Optional[int] = None,
        prob_insem: Optional[float] = None,
        gestation: Optional[int] = None,
        dry_period: Optional[int] = None,
        culling_rate: Optional[float] = None,
    ) -> list[dict]:
        """
        Run ML prediction on herd data.

        Args:
            file_content: CSV file content with herd data
            months: Number of months to forecast
            purchase: Fixed heifers purchase per month
            target_date: Target date for forecast (YYYY-MM-DD format)
            params_source: 'empirical', 'constants', or 'custom'
            maintain_replacement: Auto-select purchase to maintain herd size
            growth_target: Annual growth rate (e.g., 0.1 for 10%)
            purchase_curve: 12 comma-separated weights for monthly distribution
            age_first_insem: Age at first insemination (days)
            prob_insem: Monthly insemination probability
            gestation: Gestation period (days)
            dry_period: Dry period (days)
            culling_rate: Monthly culling rate

        Returns:
            List of forecast records
        """
        df = clean_single_file(file_content, herd_id="1")
        alive_df = df[df["Выбыло"] == False].copy()
        start_date = CURRENT_DATE

        custom_params = {}
        if age_first_insem is not None:
            custom_params["age_first_insem_max"] = age_first_insem
        if prob_insem is not None:
            custom_params["prob_insem_month"] = prob_insem
        if gestation is not None:
            custom_params["gestation_mean"] = gestation
        if dry_period is not None:
            custom_params["dry_period"] = dry_period
        if culling_rate is not None:
            custom_params["culling_rate_default"] = culling_rate

        replacement_flag = maintain_replacement if maintain_replacement else None

        if params_source == "empirical":
            params = calculate_empirical_params(df)
            sim = HerdSimulator(
                alive_df,
                start_date=start_date,
                params=params,
                maintain_replacement_rate=replacement_flag,
                growth_target=growth_target,
                purchase_curve=purchase_curve,
                verbose=False,
            )
        elif params_source == "constants":
            sim = HerdSimulator(
                alive_df,
                start_date=start_date,
                params_source="constants",
                maintain_replacement_rate=replacement_flag,
                growth_target=growth_target,
                purchase_curve=purchase_curve,
                verbose=False,
            )
        else:  # custom
            sim = HerdSimulator(
                alive_df,
                start_date=start_date,
                custom_params=custom_params,
                maintain_replacement_rate=replacement_flag,
                growth_target=growth_target,
                purchase_curve=purchase_curve,
                verbose=False,
            )

        if target_date:
            target = datetime.strptime(target_date, "%Y-%m-%d")
            result = sim.run_simulation(target_date=target, purchase_per_month=purchase)
        else:
            result = sim.run_simulation(months=months, purchase_per_month=purchase)

        if isinstance(result, dict):
            if "history" in result:
                return result["history"]
            return result
        return result


ml_prediction_service = MLPredictionService()
