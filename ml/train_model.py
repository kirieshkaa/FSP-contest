# train_model.py
"""
Скрипт для обучения модели – рассчитывает эмпирические параметры на основе исторических данных.
Сохраняет словарь params в simulation_model.pkl для использования в симуляции.
"""

import pandas as pd
import numpy as np
import pickle
from datetime import datetime

CLEAN_DATA_FILE = "cleaned_data.csv"
MODEL_FILE = "simulation_model.pkl"
CURRENT_DATE = datetime(2026, 2, 26)

AVG_LACTATION_DAYS = 305

def calculate_empirical_params(df):
    """
    Вычисляет вероятности и средние показатели на основе исторических данных.
    """
    # 1. Возраст первого отёла
    first_calving = df[df['Лактация'] >= 1].copy()
    first_calving['Возраст_при_первом_отеле'] = (
        first_calving['Дата начала тек.лакт'] - first_calving['Дата рождения']
    ).dt.days
    first_calving = first_calving.dropna(subset=['Возраст_при_первом_отеле'])
    age_first_calving_mean = first_calving['Возраст_при_первом_отеле'].mean()
    age_first_calving_std = first_calving['Возраст_при_первом_отеле'].std()
    
    # 2. Вероятность выбытия по лактациям (месячная)
    death_by_lact = df[df['Выбыло']].groupby('Лактация').size()
    total_by_lact = df.groupby('Лактация').size()
    death_prob_total = (death_by_lact / total_by_lact).fillna(0).to_dict()
    months_per_lactation = AVG_LACTATION_DAYS / 30.0
    death_prob_monthly_by_lact = {
        lact: prob / months_per_lactation for lact, prob in death_prob_total.items()
    }
    
    # 3. Вероятность успешного осеменения в месяц
    success = df[df['Дата успешного осеменения'].notna()].copy()
    success['Интервал_до_осем'] = (
        success['Дата успешного осеменения'] - success['Дата начала тек.лакт']
    ).dt.days
    success = success[success['Интервал_до_осем'] > 0]
    mean_interval = success['Интервал_до_осем'].mean()
    prob_insem_month = 1.0 / (mean_interval / 30.0) if mean_interval > 0 else 0.25
    
    # 4. Средняя стельность
    gestation_mean = df['Дни стельности'].dropna().mean()
    if pd.isna(gestation_mean) or gestation_mean < 200:
        gestation_mean = 280
    
    # 5. Сухостой (константа, можно уточнить позже)
    dry_mean = 220
    
    # 6. Возраст первого осеменения (из ТЗ, но можно взять из данных, например, возраст первого отёла минус стельность)
    age_first_insem_min = 365
    age_first_insem_max = 395
    
    params = {
        'age_first_calving_mean': age_first_calving_mean,
        'age_first_calving_std': age_first_calving_std,
        'death_prob_monthly_by_lact': death_prob_monthly_by_lact,
        'prob_insem_month': prob_insem_month,
        'gestation_mean': gestation_mean,
        'dry_period': dry_mean,
        'age_first_insem_min': age_first_insem_min,
        'age_first_insem_max': age_first_insem_max,
        'current_date': CURRENT_DATE
    }
    return params

if __name__ == "__main__":
    df = pd.read_csv(
        CLEAN_DATA_FILE,
        parse_dates=['Дата рождения', 'Дата архива', 
                     'Дата начала тек.лакт', 'Дата осеменения', 
                     'Дата успешного осеменения', 'Дата запуска тек.лакт',
                     'Дата ожидаемого запуска', 'Дата ожидаемого отела']
    )
    params = calculate_empirical_params(df)
    with open(MODEL_FILE, 'wb') as f:
        pickle.dump(params, f)
    print(f"Модель сохранена в {MODEL_FILE}")
    print("Параметры:", params)