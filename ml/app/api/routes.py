import logging
import traceback
from fastapi import APIRouter, Form, HTTPException, UploadFile, File
from fastapi.responses import HTMLResponse
from datetime import datetime
from pathlib import Path

from app.core.simulator import HerdSimulator
from app.data.processor import clean_single_file, calculate_empirical_params
from app.config import config

logger = logging.getLogger(__name__)
router = APIRouter()

# Загружаем HTML-шаблон для /help
HELP_TEMPLATE_PATH = Path(__file__).parent.parent / "templates" / "help.html"
with open(HELP_TEMPLATE_PATH, "r", encoding="utf-8") as f:
    HELP_HTML = f.read()

@router.post("/predict")
async def predict(
    file: UploadFile = File(..., description="CSV файл с исходными данными"),
    months: int = Form(36, description="Количество месяцев прогноза"),
    purchase: int = Form(0, description="Закупка нетелей в месяц (игнорируется при maintain_replacement=True)"),
    target_date: str = Form(None, description="Целевая дата YYYY-MM-DD"),
    params_source: str = Form("custom", description="Источник параметров: empirical / constants / custom"),
    maintain_replacement: bool = Form(False, description="Автоматически подобрать закупку для сохранения численности"),
    growth_target: float = Form(None, description="Целевой годовой темп роста (например 0.1 для +10% в год)"),
    purchase_curve: str = Form(None, description="Кривая закупок: 12 чисел через запятую или JSON-список"),
    age_first_insem: int = Form(None, description="Возраст первого осеменения (дни)"),
    prob_insem: float = Form(None, description="Вероятность осеменения в месяц"),
    gestation: int = Form(None, description="Длительность стельности (дни)"),
    dry_period: int = Form(None, description="Длительность сухостоя (дни)"),
    culling_rate: float = Form(None, description="Базовая ставка выбраковки в месяц"),
):
    logger.info("Получен запрос /predict")
    try:
        contents = await file.read()
        logger.debug(f"Размер файла: {len(contents)} байт")

        df = clean_single_file(contents, herd_id='1')
        alive_df = df[df['Выбыло'] == False].copy()
        start_date = config["current_date"]

        custom_params = {}
        if age_first_insem is not None:
            custom_params['age_first_insem_max'] = age_first_insem
        if prob_insem is not None:
            custom_params['prob_insem_month'] = prob_insem
        if gestation is not None:
            custom_params['gestation_mean'] = gestation
        if dry_period is not None:
            custom_params['dry_period'] = dry_period
        if culling_rate is not None:
            custom_params['culling_rate_default'] = culling_rate

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
                params_file=config["simulation"]["params_file"],
                verbose=False
            )
        elif params_source == "constants":
            sim = HerdSimulator(
                alive_df,
                start_date=start_date,
                params_source="constants",
                maintain_replacement_rate=replacement_flag,
                growth_target=growth_target,
                purchase_curve=purchase_curve,
                params_file=config["simulation"]["params_file"],
                verbose=False
            )
        else:  # custom
            sim = HerdSimulator(
                alive_df,
                start_date=start_date,
                custom_params=custom_params,
                maintain_replacement_rate=replacement_flag,
                growth_target=growth_target,
                purchase_curve=purchase_curve,
                params_file=config["simulation"]["params_file"],
                verbose=False
            )

        if target_date:
            target = datetime.strptime(target_date, "%Y-%m-%d")
            result = sim.run_simulation(target_date=target, purchase_per_month=purchase)
        else:
            result = sim.run_simulation(months=months, purchase_per_month=purchase)

        logger.info("Симуляция успешно завершена")
        return result

    except Exception as e:
        logger.error(f"Ошибка при обработке запроса: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/help", response_class=HTMLResponse)
async def get_help():
    return HTMLResponse(content=HELP_HTML)