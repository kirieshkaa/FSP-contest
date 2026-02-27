# api_service.py
import uvicorn
from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import HTMLResponse
from core_logic import HerdSimulator
import pandas as pd
from datetime import datetime

app = FastAPI()

@app.get("/predict")
def predict(
    months: int = Query(36, description="Количество месяцев прогноза (игнорируется, если задана target_date)"),
    purchase: int = Query(0, description="Закупка нетелей в месяц"),
    target_date: str = Query(None, description="Целевая дата в формате YYYY-MM-DD. Если указана, months игнорируется."),
    params_source: str = Query("empirical", description="Источник параметров: 'empirical' (из данных) или 'constants' (фиксированные)")
):
    try:
        df = pd.read_csv("cleaned_data.csv")
        alive_df = df[df['Выбыло'] == False].copy()
        start_date = datetime(2026, 2, 26)  # дата, соответствующая последним данным

        sim = HerdSimulator(alive_df, start_date=start_date, params_source=params_source)

        if target_date:
            try:
                target = datetime.strptime(target_date, "%Y-%m-%d")
            except ValueError:
                raise HTTPException(status_code=400, detail="Неверный формат target_date. Используйте YYYY-MM-DD")
            result = sim.run_simulation(target_date=target, purchase_per_month=purchase)
            return result
        else:
            data = sim.run_simulation(months=months, purchase_per_month=purchase)
            return data
    except Exception as e:
        return {"error": str(e)}
    
@app.get("/help", response_class=HTMLResponse)
async def get_help():
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>API Прогнозирования стада КРС</title>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #2c3e50; }
            h2 { color: #34495e; margin-top: 30px; }
            code { background: #f4f4f4; padding: 2px 5px; border-radius: 3px; }
            pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>
        <h1>API Прогнозирования стада КРС</h1>
        <p>Этот сервис предоставляет прогноз ключевых показателей молочного стада на основе имитационной модели.</p>

        <h2>Эндпоинт</h2>
        <p><code>GET /predict</code></p>

        <h2>Параметры запроса</h2>
        <table>
            <tr><th>Параметр</th><th>Тип</th><th>Описание</th><th>По умолчанию</th></tr>
            <tr><td><code>months</code></td><td>int</td><td>Количество месяцев прогноза (игнорируется, если указана <code>target_date</code>).</td><td>36</td></tr>
            <tr><td><code>purchase</code></td><td>int</td><td>Количество закупаемых нетелей в месяц.</td><td>0</td></tr>
            <tr><td><code>target_date</code></td><td>str</td><td>Целевая дата в формате <code>YYYY-MM-DD</code>. Если указана, <code>months</code> игнорируется, и прогноз строится до этой даты.</td><td>None</td></tr>
            <tr><td><code>use_empirical</code></td><td>bool</td><td>Использовать эмпирические параметры из данных хозяйства (<code>true</code>) или константы из ТЗ (<code>false</code>).</td><td>false</td></tr>
        </table>

        <h2>Примеры запросов</h2>
        <h3>🔹 Прогноз на 3 месяца (март–май 2026), закупка 5 нетелей, константы</h3>
        <pre>GET /predict?months=3&purchase=5&use_empirical=false</pre>

        <h3>🔹 Прогноз на полгода, без закупок, эмпирические параметры</h3>
        <pre>GET /predict?months=6&purchase=0&use_empirical=true</pre>

        <h3>🔹 Прогноз на 1 год, закупка 20 нетелей, константы</h3>
        <pre>GET /predict?months=12&purchase=20&use_empirical=false</pre>

        <h3>🔹 Прогноз на конкретную дату (1 сентября 2027), закупка 10 нетелей, эмпирика</h3>
        <pre>GET /predict?target_date=2027-09-01&purchase=10&use_empirical=true</pre>

        <h2>Формат ответа</h2>
        <p><strong>Если указан только <code>months</code></strong> (без <code>target_date</code>), возвращается массив объектов, каждый из которых соответствует первому числу каждого месяца прогноза:</p>
        <pre>[
  {
    "month": "2026-02",
    "avg_dim": 170.0,
    "cows_count": 3355,
    "total_adults": 5105,
    "milk_total": 2133518
  },
  ...
]</pre>

        <p><strong>Если указана <code>target_date</code></strong>, возвращается объект с двумя полями:</p>
        <pre>{
  "history": [ ... ],  // помесячные записи от начала до месяца, содержащего target_date
  "target_forecast": {  // интерполированные значения на точную дату
    "month": "2027-09-01",
    "avg_dim": 168.9,
    "cows_count": 2659,
    "total_adults": 4216,
    "milk_total": 1697867
  }
}</pre>

        <h2>Описание полей</h2>
        <ul>
            <li><code>month</code> – дата (в формате <code>YYYY-MM</code> для первых чисел, <code>YYYY-MM-DD</code> для точной даты).</li>
            <li><code>avg_dim</code> – средние дни доения (СДД) по дойному стаду.</li>
            <li><code>cows_count</code> – количество дойных коров.</li>
            <li><code>total_adults</code> – общее количество взрослых особей (дойные + сухостойные + нетели).</li>
            <li><code>milk_total</code> – прогнозируемый надой за месяц (в литрах).</li>
        </ul>

        <h2>Примечания</h2>
        <ul>
            <li>Начальная дата симуляции зафиксирована как <strong>2026-02-26</strong> – последняя актуальная дата в предоставленных данных.</li>
            <li>Все параметры необязательны. Если не указаны, используются значения по умолчанию.</li>
            <li>Эмпирические параметры рассчитываются из файла <code>simulation_model.pkl</code>, который генерируется скриптом <code>train_model.py</code>. Если файл отсутствует, используются значения по умолчанию.</li>
            <li>Модель учитывает: выбытие (2.5% в месяц или по лактациям), осеменение (вероятность в месяц), стельность (282 дня), сухостой (220 дней), рождение телочек (50%).</li>
            
        </ul>
    </body>
    </html>
    """
    return html_content

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)