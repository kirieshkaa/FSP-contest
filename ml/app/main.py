from fastapi import FastAPI
from app.api.routes import router
from app.config import config
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

app = FastAPI(title="Cattle Herd Simulator API", version="3.0.0")
app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=config["server"]["host"],
        port=config["server"]["port"],
        reload=True
    )