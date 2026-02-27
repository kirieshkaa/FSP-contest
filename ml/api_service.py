import uvicorn
import logging
from fastapi import FastAPI, Form, HTTPException, UploadFile, File
from fastapi.responses import HTMLResponse
from core_logic import HerdSimulator
from data_processor import clean_single_file, calculate_empirical_params, CURRENT_DATE
import pandas as pd
from datetime import datetime

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Отключаем внутренние логи Numba (если она используется)
logging.getLogger('numba').setLevel(logging.WARNING)

app = FastAPI()

@app.post("/predict")
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
    logger.debug(f"Параметры: months={months}, purchase={purchase}, target_date={target_date}, params_source={params_source}, maintain_replacement={maintain_replacement}, growth_target={growth_target}, purchase_curve={purchase_curve}")

    try:
        # Чтение файла
        logger.info("Чтение загруженного файла")
        contents = await file.read()
        logger.debug(f"Размер файла: {len(contents)} байт")

        # Очистка данных
        logger.info("Очистка и подготовка данных")
        df = clean_single_file(contents, herd_id='1')
        alive_df = df[df['Выбыло'] == False].copy()
        start_date = CURRENT_DATE

        # Формирование кастомных параметров
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

        # Флаг для включения режима поддержания (любое не-None значение)
        replacement_flag = maintain_replacement if maintain_replacement else None

        # Создание симулятора
        if params_source == "empirical":
            params = calculate_empirical_params(df)
            sim = HerdSimulator(
                alive_df,
                start_date=start_date,
                params=params,
                maintain_replacement_rate=replacement_flag,
                growth_target=growth_target,
                purchase_curve=purchase_curve,
                verbose=False  # отключаем внутренние логи симулятора
            )
        elif params_source == "constants":
            sim = HerdSimulator(
                alive_df,
                start_date=start_date,
                params_source="constants",
                maintain_replacement_rate=replacement_flag,
                growth_target=growth_target,
                purchase_curve=purchase_curve,
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
                verbose=False
            )

        # Запуск симуляции
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

@app.get("/help", response_class=HTMLResponse)
async def get_help():
    # (можно оставить как есть или обновить)
    html_content = """
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>API Прогнозирования стада КРС — полное описание</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 30px;
            background-color: #f5f7fa;
            color: #2c3e50;
        }
        h1 {
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
        }
        h2 {
            color: #2980b9;
            margin-top: 30px;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            background-color: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px 8px;
            text-align: left;
            vertical-align: top;
        }
        th {
            background-color: #3498db;
            color: white;
            font-weight: 600;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .note {
            background-color: #e8f4fd;
            border-left: 4px solid #3498db;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        code {
            background-color: #eee;
            padding: 2px 5px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        .url {
            font-size: 1.2em;
            background-color: #2c3e50;
            color: white;
            padding: 10px;
            border-radius: 5px;
            display: inline-block;
        }
        pre {
            background-color: #2d2d2d;
            color: #f8f8f2;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <h1>🐄 API прогнозирования динамики стада КРС (numpy-версия)</h1>
    <p>Сервис строит помесячные прогнозы численности и продуктивности стада на основе CSV-файла с поголовьем. Реализованы три источника параметров, два режима закупки (фиксированный и автоматический подбор) и новый режим с целевым годовым ростом и кривой распределения закупок по месяцам.</p>

    <div class="url">POST http://127.0.0.1:8000/predict</div>

    <h2>📌 Параметры запроса (multipart/form-data)</h2>
    <table>
        <tr><th>Параметр</th><th>Тип</th><th>Обязательный</th><th>Описание</th><th>Значение по умолчанию</th></tr>
        <tr>
            <td><code>file</code></td>
            <td>file</td>
            <td>Да</td>
            <td>CSV-файл с данными о животных. Кодировка UTF-8, разделитель ; или ,. Должен содержать колонки: 'Номер животного', 'Дата рождения', 'Лактация', 'Дни в доении', 'Дни стельности', 'Дата архива', 'Статус коровы' и др. (см. пример ниже).</td>
            <td>—</td>
        </tr>
        <tr>
            <td><code>months</code></td>
            <td>int</td>
            <td>Нет</td>
            <td>Количество месяцев прогноза. Игнорируется, если указана <code>target_date</code>.</td>
            <td>36</td>
        </tr>
        <tr>
            <td><code>purchase</code></td>
            <td>int</td>
            <td>Нет</td>
            <td>Фиксированное количество нетелей, закупаемых каждый месяц. Игнорируется, если <code>maintain_replacement=True</code>.</td>
            <td>0</td>
        </tr>
        <tr>
            <td><code>target_date</code></td>
            <td>str</td>
            <td>Нет</td>
            <td>Целевая дата в формате <code>YYYY-MM-DD</code>. Если указана, прогноз строится до этой даты (включительно), параметр <code>months</code> игнорируется. Возвращается интерполированный прогноз на эту дату.</td>
            <td>None</td>
        </tr>
        <tr>
            <td><code>params_source</code></td>
            <td>str</td>
            <td>Нет</td>
            <td>Источник параметров модели: <br><code>custom</code> – используются значения из параметров <code>age_first_insem</code>, <code>prob_insem</code>, …;<br><code>empirical</code> – параметры вычисляются из загруженного файла;<br><code>constants</code> – фиксированные константы (395 дней, 0.20, 282, 220, 0.025).</td>
            <td>custom</td>
        </tr>
        <tr>
            <td><code>maintain_replacement</code></td>
            <td>bool</td>
            <td>Нет</td>
            <td><strong>Включение автоматического подбора закупки.</strong> Если <code>true</code>, то:
                <ul>
                    <li>При отсутствии <code>growth_target</code> выполняется старый бинарный поиск фиксированной ежемесячной закупки для сохранения численности.</li>
                    <li>При наличии <code>growth_target</code> активируется новый режим: подбирается годовой объём закупок, распределяемый по месяцам согласно кривой <code>purchase_curve</code>, чтобы достичь целевого годового темпа роста.</li>
                </ul>
            </td>
            <td>false</td>
        </tr>
        <tr>
            <td><code>growth_target</code></td>
            <td>float</td>
            <td>Нет</td>
            <td>Целевой годовой темп роста взрослого поголовья. Например, <code>0.1</code> означает +10% в год. Работает только при <code>maintain_replacement=true</code>.</td>
            <td>None</td>
        </tr>
        <tr>
            <td><code>purchase_curve</code></td>
            <td>str</td>
            <td>Нет</td>
            <td>Кривая распределения годового объёма закупок по 12 месяцам. Принимает:
                <ul>
                    <li>JSON-список из 12 чисел: <code>"[1.2, 0.8, 1.0, ...]"</code></li>
                    <li>Строку из 12 чисел, разделённых запятыми: <code>"1.2,0.8,1.0,…"</code></li>
                </ul>
                Числа нормируются автоматически, важны только пропорции. Если параметр не указан, используется равномерное распределение.
            </td>
            <td>None</td>
        </tr>
        <tr>
            <td colspan="5" style="background-color: #ecf0f1; text-align: center;"><strong>Параметры для кастомного режима (<code>params_source=custom</code>)</strong></td>
        </tr>
        <tr>
            <td><code>age_first_insem</code></td>
            <td>int</td>
            <td>Нет</td>
            <td>Возраст первого осеменения (в днях).</td>
            <td>395</td>
        </tr>
        <tr>
            <td><code>prob_insem</code></td>
            <td>float</td>
            <td>Нет</td>
            <td>Вероятность успешного осеменения за месяц.</td>
            <td>0.20</td>
        </tr>
        <tr>
            <td><code>gestation</code></td>
            <td>int</td>
            <td>Нет</td>
            <td>Длительность стельности (дни).</td>
            <td>282</td>
        </tr>
        <tr>
            <td><code>dry_period</code></td>
            <td>int</td>
            <td>Нет</td>
            <td>День стельности, с которого корова переводится в сухостой.</td>
            <td>220</td>
        </tr>
        <tr>
            <td><code>culling_rate</code></td>
            <td>float</td>
            <td>Нет</td>
            <td>Базовая ежемесячная вероятность выбраковки/смерти.</td>
            <td>0.025</td>
        </tr>
    </table>

    <h2>📤 Ответ сервера</h2>
    <p>Возвращается JSON. Структура зависит от наличия <code>target_date</code> и режима подбора.</p>

    <h3>Без целевой даты (обычная история):</h3>
    <pre><code>[
  {
    "month": "2026-03",
    "avg_dim": 145.2,
    "cows_count": 120,
    "total_adults": 185,
    "milk_total": 54000,
    "first_calvings": 3,
    "purchased": 2
  },
  ...
]</code></pre>

    <h3>С целевой датой:</h3>
    <pre><code>{
  "history": [ ... ],
  "target_forecast": {
    "month": "2027-09-01",
    "avg_dim": 158.4,
    "cows_count": 132,
    "total_adults": 198,
    "milk_total": 61200
  }
}</code></pre>

    <h3>При использовании <code>maintain_replacement=true</code> (без роста):</h3>
    <pre><code>{
  "history": [ ... ],
  "optimal_purchase_per_month": 5
}</code></pre>

    <h2>⚙️ Логика работы нового режима (<code>growth_target</code> + кривая)</h2>
    <div class="note">
        <p>Если включены <code>maintain_replacement=true</code> и задан <code>growth_target</code>, прогноз разбивается на полные годы. Для каждого года выполняется:</p>
        <ol>
            <li>Вычисляется целевое взрослое поголовье на конец года: <code>текущее * (1 + growth_target)</code>.</li>
            <li>Бинарным поиском подбирается общее количество нетелей, которое нужно закупить за год.</li>
            <li>Найденный годовой объём распределяется по месяцам пропорционально весам из <code>purchase_curve</code> (методом наибольшего остатка, чтобы получить целые числа).</li>
            <li>Проводится симуляция года с этими помесячными закупками.</li>
        </ol>
        <p>Если прогноз короче года, кривая всё равно используется, но только для первых <code>months</code> месяцев. Подбор годового объёма для неполного года не производится (используется последняя найденная пропорция).</p>
    </div>

    <h2>📁 Примеры входных данных (CSV)</h2>
    <p>Файл должен содержать как минимум следующие колонки (остальные игнорируются):</p>
    <pre><code>Номер животного;Дата рождения;Дата архива;Лактация;Дата начала тек.лакт;Дни в доении;Статус коровы;Дата осеменения;Дата успешного осеменения;Дни стельности;Дата запуска тек.лакт;Дата ожидаемого запуска;Дата ожидаемого отела</code></pre>
    <p>Даты в формате <code>ДД.ММ.ГГГГ</code>.</p>

    <h2>📁 Примеры запросов (cURL)</h2>

    <h3>1. Фиксированная закупка 5 голов в месяц, кастомные параметры</h3>
    <pre><code>curl -X POST http://127.0.0.1:8000/predict \
  -F "file=@herd.csv" \
  -F "months=24" \
  -F "purchase=5" \
  -F "params_source=custom" \
  -F "age_first_insem=400" \
  -F "prob_insem=0.25"</code></pre>

    <h3>2. Автоподбор для сохранения численности (старый режим)</h3>
    <pre><code>curl -X POST http://127.0.0.1:8000/predict \
  -F "file=@herd.csv" \
  -F "months=36" \
  -F "maintain_replacement=true"</code></pre>

    <h3>3. Режим роста + кривая (JSON-список)</h3>
    <pre><code>curl -X POST http://127.0.0.1:8000/predict \
  -F "file=@herd.csv" \
  -F "months=60" \
  -F "maintain_replacement=true" \
  -F "growth_target=0.1" \
  -F "purchase_curve=[1.5,1.2,1.0,0.8,0.6,0.6,0.8,1.0,1.2,1.3,1.4,1.5]"</code></pre>

    <h3>4. То же, но кривая как строка через запятую</h3>
    <pre><code>curl -X POST http://127.0.0.1:8000/predict \
  -F "file=@herd.csv" \
  -F "target_date=2028-01-01" \
  -F "maintain_replacement=true" \
  -F "growth_target=0.05" \
  -F "purchase_curve=1.5,1.2,1.0,0.8,0.6,0.6,0.8,1.0,1.2,1.3,1.4,1.5"</code></pre>

    <h3>5. Эмпирические параметры из файла</h3>
    <pre><code>curl -X POST http://127.0.0.1:8000/predict \
  -F "file=@herd.csv" \
  -F "months=48" \
  -F "params_source=empirical"</code></pre>

    <hr>
    <p style="font-size: 0.9em; color: #7f8c8d;">Версия API: 3.0 (numpy-core). Добавлены режимы роста и кривой закупок.</p>
</body>
</html>
    """
    return HTMLResponse(content=html_content)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)