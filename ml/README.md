## Быстрый старт

### Предварительные требования
- Python 3.11 или выше
- [uv](https://docs.astral.sh/uv/) (рекомендуется) или стандартный pip

### Установка с использованием uv

```bash
# Создать виртуальное окружение и установить зависимости
uv venv
uv pip install -r requirements.txt

# Или через pyproject.toml
uv pip install -e .

# Запуск
uvicorn app.main:app --reload