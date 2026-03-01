# ФСП Хакатон — Команда "Минус-Вайб Кодеры"

url: https://cattlehds.ru/ (пока разворачиваем)

Веб-приложение для анализа и прогнозирования показателей молочного животноводства.

## Технологии

- **Frontend**: Next.js + Tailwind CSS + Radix UI
- **Backend**: FastAPI (Python)
- **ML**: Python (прогнозирование надоя)

## Структура

```
/frontend   — Next.js приложение
/backend    — FastAPI сервис
/ml         — ML модель
```

## Запуск

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### ML

```bash
cd ml
pip install -r requirements.txt
uvicorn app.main:app --reload
```
