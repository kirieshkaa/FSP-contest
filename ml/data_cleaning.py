"""
Скрипт для очистки и предобработки исходных данных.
Обрабатывает каждый файл отдельно и сохраняет три очищенных датасета:
cleaned_data_1.csv, cleaned_data_2.csv, cleaned_data_3.csv.
Также сохраняет объединённый файл cleaned_data.csv (опционально).
"""

import pandas as pd
import numpy as np
from datetime import datetime
import os
import re

# Константы
DATA_DIR = "data"                     # папка с исходными файлами
CURRENT_DATE = datetime(2026, 2, 26)  # дата формирования отчёта
CLEAN_DATA_FILE = "cleaned_data.csv"  # объединённый выходной файл

def clean_single_file(df, herd_id):
    """
    Очистка одного датасета.
    df - загруженный DataFrame (сырой).
    herd_id - идентификатор стада (строка), добавляется как колонка.
    Возвращает очищенный DataFrame.
    """
    # Переименуем колонки, уберём кавычки и лишние пробелы
    df.columns = [col.strip().replace('"', '') for col in df.columns]

    # Удаляем строки, где номер животного пустой
    df = df.dropna(subset=['Номер животного'])
    df['Номер животного'] = df['Номер животного'].astype(str).str.strip()

    # Преобразуем даты – заменяем пустые строки на NaT
    date_columns = ['Дата рождения', 'Дата архива', 'Дата начала тек.лакт',
                    'Дата осеменения', 'Дата успешного осеменения',
                    'Дата запуска тек.лакт', 'Дата ожидаемого запуска', 'Дата ожидаемого отела']
    for col in date_columns:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], format='%d.%m.%Y', errors='coerce')

    # Заменяем некорректные значения числовых полей на NaN
    numeric_columns = ['Лактация', 'Дни в доении', 'Дни стельности']
    for col in numeric_columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

    # Удаляем дубликаты по номеру животного – оставляем самую свежую запись
    df = df.sort_values(['Номер животного', 'Дата архива', 'Дата рождения'],
                        ascending=[True, False, False], na_position='last')
    df = df.drop_duplicates(subset=['Номер животного'], keep='first')

    # Вычисляем возраст в днях на CURRENT_DATE
    df['Возраст_дней'] = (CURRENT_DATE - df['Дата рождения']).dt.days

    # Определяем текущий статус животного (живое / выбывшее)
    df['Выбыло'] = (~df['Дата архива'].isna()) | (df['Статус коровы'].isin(['Продана', 'Мертвое животное', 'Брак', 'Перемещена']))

    # Для живых определяем более детальный статус
    df['Текущий_статус'] = 'Неизвестно'
    # Тёлки (лактация 0)
    mask_telka = (df['Лактация'] == 0) & (df['Статус коровы'] == 'Телка')
    df.loc[mask_telka, 'Текущий_статус'] = 'Телка'
    # Нетели (лактация 0, но есть успешное осеменение)
    mask_netel = (df['Лактация'] == 0) & (df['Дата успешного осеменения'].notna())
    df.loc[mask_netel, 'Текущий_статус'] = 'Нетель'
    # Стельные коровы
    mask_stel = (df['Лактация'] > 0) & (df['Дата успешного осеменения'].notna())
    df.loc[mask_stel, 'Текущий_статус'] = 'Стельная'
    # Осеменённые (есть дата осеменения, но нет успешного)
    mask_osemen = (df['Лактация'] > 0) & (df['Дата осеменения'].notna()) & (df['Дата успешного осеменения'].isna())
    df.loc[mask_osemen, 'Текущий_статус'] = 'Осеменённая'
    # Сухостойные
    mask_suh = (df['Лактация'] > 0) & (df['Дата запуска тек.лакт'].notna())
    df.loc[mask_suh, 'Текущий_статус'] = 'Сухостой'
    # Дойные – все остальные живые с лактацией > 0 и не попадающие под вышеуказанные
    mask_doj = (df['Лактация'] > 0) & (~df['Выбыло']) & (df['Текущий_статус'] == 'Неизвестно')
    df.loc[mask_doj, 'Текущий_статус'] = 'Дойная'
    # Выбывшие
    df.loc[df['Выбыло'], 'Текущий_статус'] = 'Выбыло'

    # Добавляем колонку с идентификатором стада
    df['herd_id'] = herd_id

    return df


def load_and_clean():
    # Находим все CSV-файлы в папке data, содержащие "Хакатон"
    files = sorted([f for f in os.listdir(DATA_DIR) if f.endswith('.csv') and 'Хакатон' in f])
    if not files:
        print("В папке data не найдено файлов с 'Хакатон'.")
        return

    cleaned_dfs = []
    for idx, filename in enumerate(files, start=1):
        print(f"Обработка файла {filename} (стадо {idx})...")
        path = os.path.join(DATA_DIR, filename)
        # Пробуем разные разделители: в файлах используется точка с запятой
        df = pd.read_csv(path, sep=';', encoding='utf-8-sig')
        cleaned_df = clean_single_file(df, str(idx))
        cleaned_dfs.append(cleaned_df)

        # Сохраняем отдельный файл для этого стада
        out_name = f"cleaned_data_{idx}.csv"
        cleaned_df.to_csv(out_name, index=False, encoding='utf-8-sig')
        print(f"Сохранено в {out_name}, записей: {len(cleaned_df)}")

    # Сохраняем объединённый датасет (если нужно)
    if cleaned_dfs:
        combined = pd.concat(cleaned_dfs, ignore_index=True)
        combined.to_csv(CLEAN_DATA_FILE, index=False, encoding='utf-8-sig')
        print(f"Объединённый датасет сохранён в {CLEAN_DATA_FILE}, всего записей: {len(combined)}")
        print(f"Из них живых (не выбыло): {(~combined['Выбыло']).sum()}")
    else:
        print("Нет данных для сохранения.")


if __name__ == "__main__":
    load_and_clean()