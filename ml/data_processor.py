import pandas as pd
import numpy as np
from datetime import datetime
import io

CURRENT_DATE = datetime(2026, 2, 26)
AVG_LACTATION_DAYS = 305

def clean_single_file(file_content, herd_id='1'):
    try:
        df = pd.read_csv(io.BytesIO(file_content), sep=';', encoding='utf-8-sig')
    except:
        df = pd.read_csv(io.BytesIO(file_content), sep=',', encoding='utf-8-sig')

    # Удаление BOM из названий колонок, если он есть
    df.columns = df.columns.str.replace('\ufeff', '', regex=False)

    df.columns = [col.strip().replace('"', '') for col in df.columns]

    # Проверка наличия критической колонки
    if 'Номер животного' not in df.columns:
        raise KeyError(f"Колонка 'Номер животного' не найдена. Доступные колонки: {list(df.columns)}")

    df = df.dropna(subset=['Номер животного'])
    df['Номер животного'] = df['Номер животного'].astype(str).str.strip()

    date_columns = ['Дата рождения', 'Дата архива', 'Дата начала тек.лакт',
                    'Дата осеменения', 'Дата успешного осеменения',
                    'Дата запуска тек.лакт', 'Дата ожидаемого запуска', 'Дата ожидаемого отела']
    for col in date_columns:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], format='%d.%m.%Y', errors='coerce')
            if df[col].isna().all():
                df[col] = pd.to_datetime(df[col], errors='coerce')

    numeric_columns = ['Лактация', 'Дни в доении', 'Дни стельности']
    for col in numeric_columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

    df = df.sort_values(['Номер животного', 'Дата архива', 'Дата рождения'],
                        ascending=[True, False, False], na_position='last')
    df = df.drop_duplicates(subset=['Номер животного'], keep='first')

    df['Возраст_дней'] = (CURRENT_DATE - df['Дата рождения']).dt.days
    df['Выбыло'] = (~df['Дата архива'].isna()) | (df['Статус коровы'].isin(['Продана', 'Мертвое животное', 'Брак', 'Перемещена']))

    df['Текущий_статус'] = 'Неизвестно'
    mask_telka = (df['Лактация'] == 0) & (df['Статус коровы'] == 'Телка')
    df.loc[mask_telka, 'Текущий_статус'] = 'Телка'
    mask_netel = (df['Лактация'] == 0) & (df['Дата успешного осеменения'].notna())
    df.loc[mask_netel, 'Текущий_статус'] = 'Нетель'
    mask_stel = (df['Лактация'] > 0) & (df['Дата успешного осеменения'].notna())
    df.loc[mask_stel, 'Текущий_статус'] = 'Стельная'
    mask_osemen = (df['Лактация'] > 0) & (df['Дата осеменения'].notna()) & (df['Дата успешного осеменения'].isna())
    df.loc[mask_osemen, 'Текущий_статус'] = 'Осеменённая'
    mask_suh = (df['Лактация'] > 0) & (df['Дата запуска тек.лакт'].notna())
    df.loc[mask_suh, 'Текущий_статус'] = 'Сухостой'
    mask_doj = (df['Лактация'] > 0) & (~df['Выбыло']) & (df['Текущий_статус'] == 'Неизвестно')
    df.loc[mask_doj, 'Текущий_статус'] = 'Дойная'
    df.loc[df['Выбыло'], 'Текущий_статус'] = 'Выбыло'

    df['herd_id'] = herd_id
    return df

def calculate_empirical_params(df):
    first_calving = df[df['Лактация'] >= 1].copy()
    first_calving['Дата начала тек.лакт'] = pd.to_datetime(first_calving['Дата начала тек.лакт'], errors='coerce')
    first_calving['Дата рождения'] = pd.to_datetime(first_calving['Дата рождения'], errors='coerce')
    first_calving = first_calving.dropna(subset=['Дата начала тек.лакт', 'Дата рождения'])
    first_calving['Возраст_при_первом_отеле'] = (
        first_calving['Дата начала тек.лакт'] - first_calving['Дата рождения']
    ).dt.days
    first_calving = first_calving.dropna(subset=['Возраст_при_первом_отеле'])
    age_first_calving_mean = first_calving['Возраст_при_первом_отеле'].mean()
    age_first_calving_std = first_calving['Возраст_при_первом_отеле'].std()

    death_by_lact = df[df['Выбыло']].groupby('Лактация').size()
    total_by_lact = df.groupby('Лактация').size()
    death_prob_total = (death_by_lact / total_by_lact).fillna(0).to_dict()
    months_per_lactation = AVG_LACTATION_DAYS / 30.0
    death_prob_monthly_by_lact = {
        lact: prob / months_per_lactation for lact, prob in death_prob_total.items()
    }

    success = df[df['Дата успешного осеменения'].notna()].copy()
    if not success.empty:
        success['Дата успешного осеменения'] = pd.to_datetime(success['Дата успешного осеменения'], errors='coerce')
        success['Дата начала тек.лакт'] = pd.to_datetime(success['Дата начала тек.лакт'], errors='coerce')
        success = success.dropna(subset=['Дата успешного осеменения', 'Дата начала тек.лакт'])
        success['Интервал_до_осем'] = (
            success['Дата успешного осеменения'] - success['Дата начала тек.лакт']
        ).dt.days
        success = success[success['Интервал_до_осем'] > 0]
        mean_interval = success['Интервал_до_осем'].mean()
        prob_insem_month = 1.0 / (mean_interval / 30.0) if mean_interval > 0 else 0.25
    else:
        prob_insem_month = 0.25

    gestation_mean = df['Дни стельности'].dropna().mean()
    if pd.isna(gestation_mean) or gestation_mean < 200:
        gestation_mean = 280

    dry_mean = 220
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