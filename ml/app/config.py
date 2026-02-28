import os
from pathlib import Path
from dotenv import load_dotenv
import yaml
from datetime import datetime

load_dotenv()

BASE_DIR = Path(__file__).parent.parent

def load_config():
    config_path = BASE_DIR / "config.yaml"
    with open(config_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    # Подстановка переменных окружения
    host = os.getenv("HOST", config["server"]["host"])
    port = int(os.getenv("PORT", config["server"]["port"]))
    params_file = os.getenv("PARAMS_FILE", config["simulation"]["params_file"])

    current_date_str = os.getenv("CURRENT_DATE")
    if current_date_str:
        current_date = datetime.strptime(current_date_str, "%Y-%m-%d")
    else:
        current_date = datetime.now()

    return {
        "server": {"host": host, "port": port},
        "simulation": {
            "params_file": params_file,
            "default_params": config["simulation"]["default_params"],
        },
        "current_date": current_date,
    }

config = load_config()