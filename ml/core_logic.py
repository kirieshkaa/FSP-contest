# core_logic.py
import pandas as pd
import numpy as np
import pickle
import os
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

class HerdSimulator:
    def __init__(self, initial_df, start_date=None, params_source="empirical", params_file="simulation_model.pkl"):
        """
        :param initial_df: DataFrame с текущим состоянием стада (только живые)
        :param start_date: дата начала симуляции
        :param params_source: 'empirical' - использовать параметры из файла,
                               'constants' - использовать фиксированные константы
        :param params_file: путь к файлу с эмпирическими параметрами (если params_source='empirical')
        """
        self.herd = initial_df.copy()
        # Очистка данных
        self.herd['Лактация'] = self.herd['Лактация'].fillna(0).astype(int)
        self.herd['Дни в доении'] = self.herd['Дни в доении'].fillna(0).astype(float)
        self.herd['Дни стельности'] = self.herd['Дни стельности'].fillna(-1).astype(float)
        self.herd['Возраст_дней'] = self.herd['Возраст_дней'].fillna(700).astype(float)

        # Определяем стартовый статус
        self.herd['status'] = 'calf_female'
        self.herd.loc[self.herd['Лактация'] > 0, 'status'] = 'lactating'
        self.herd.loc[(self.herd['Дни стельности'] > 220) & (self.herd['status'] == 'lactating'), 'status'] = 'dry'
        self.herd.loc[(self.herd['Лактация'] == 0) & (self.herd['Дни стельности'] > 0), 'status'] = 'heifer_pregnant'

        self.start_date = start_date if start_date else datetime.now()
        self.params = self._load_params(params_source, params_file)

    def _load_params(self, source, params_file):
        """Загружает параметры в зависимости от источника."""
        # Константы по умолчанию (из ТЗ)
        constant_params = {
            'age_first_insem_max': 395,
            'prob_insem_month': 0.20,
            'gestation_mean': 282,
            'dry_period': 220,
            'culling_rate_default': 0.025,
            'death_prob_monthly_by_lact': {}   # пустой – используем константу
        }

        if source == "constants":
            print("Используются фиксированные константы (из ТЗ).")
            return constant_params

        elif source == "empirical":
            if os.path.exists(params_file):
                try:
                    with open(params_file, 'rb') as f:
                        emp_params = pickle.load(f)
                    print(f"Загружены эмпирические параметры из {params_file}")
                    # Объединяем с constant_params, но приоритет у emp_params
                    merged = constant_params.copy()
                    merged.update(emp_params)
                    # Убедимся, что ключи death_prob_monthly_by_lact есть
                    if 'death_prob_monthly_by_lact' not in merged:
                        merged['death_prob_monthly_by_lact'] = {}
                    return merged
                except Exception as e:
                    print(f"Ошибка загрузки {params_file}: {e}. Используются константы.")
                    return constant_params
            else:
                print(f"Файл {params_file} не найден. Используются константы.")
                return constant_params
        else:
            print(f"Неизвестный источник параметров '{source}'. Используются константы.")
            return constant_params

    def _milk_production(self, avg_dim):
        """Упрощённая модель суточного удоя."""
        if avg_dim <= 60:
            return 30.0
        elif avg_dim <= 200:
            return 30.0 - (avg_dim - 60) * 0.08
        else:
            return 19.0 - (avg_dim - 200) * 0.03

    def run_simulation(self, months=None, target_date=None, purchase_per_month=0):
        """
        Основной цикл симуляции.
        Можно задать либо количество месяцев (months), либо целевую дату (target_date).
        """
        history = []
        current_date = self.start_date.replace(day=1)

        if target_date:
            target_date = pd.to_datetime(target_date).date()
            months_needed = (target_date.year - current_date.year) * 12 + (target_date.month - current_date.month)
            if months_needed < 0:
                raise ValueError("target_date должна быть позже start_date")
            months = months_needed + 1
        elif months is None:
            months = 36
        else:
            months = int(months)

        # Извлекаем параметры для удобства
        age_insem = self.params.get('age_first_insem_max', 395)
        prob_insem = self.params.get('prob_insem_month', 0.20)
        gestation = self.params.get('gestation_mean', 282)
        dry_period = self.params.get('dry_period', 220)
        death_prob_by_lact = self.params.get('death_prob_monthly_by_lact', {})
        default_culling = self.params.get('culling_rate_default', 0.025)

        for m in range(months):
            lactating_mask = (self.herd['status'] == 'lactating')
            lactating_cows = self.herd[lactating_mask]

            avg_dim = lactating_cows['Дни в доении'].mean() if not lactating_cows.empty else 0
            milk_per_day_per_cow = self._milk_production(avg_dim)
            milk_total = int(len(lactating_cows) * milk_per_day_per_cow * 30)

            record = {
                "month": current_date.strftime("%Y-%m"),
                "avg_dim": round(float(avg_dim), 1),
                "cows_count": int(len(lactating_cows)),
                "total_adults": int(len(self.herd[self.herd['status'] != 'calf_female'])),
                "milk_total": milk_total
            }
            history.append(record)

            # --- ШАГ СИМУЛЯЦИИ ---
            self.herd['Возраст_дней'] += 30
            self.herd.loc[lactating_mask, 'Дни в доении'] += 30

            pregnant_mask = (self.herd['Дни стельности'] >= 0)
            self.herd.loc[pregnant_mask, 'Дни стельности'] += 30

            # ВЫБЫТИЕ с учётом лактации (если есть данные)
            if death_prob_by_lact:
                probs = np.array([
                    death_prob_by_lact.get(lact, default_culling)
                    for lact in self.herd['Лактация']
                ])
                keep_mask = np.random.rand(len(self.herd)) > probs
            else:
                keep_mask = np.random.rand(len(self.herd)) > default_culling
            self.herd = self.herd[keep_mask].copy()

            # ОТЁЛ
            calving_mask = (self.herd['Дни стельности'] >= gestation)
            if calving_mask.any():
                self.herd.loc[calving_mask, 'Лактация'] += 1
                self.herd.loc[calving_mask, 'Дни в доении'] = 0
                self.herd.loc[calving_mask, 'Дни стельности'] = -1
                self.herd.loc[calving_mask, 'status'] = 'lactating'

                num_calvings = calving_mask.sum()
                new_females = sum(np.random.rand(num_calvings) < 0.5)
                if new_females > 0:
                    new_borns = pd.DataFrame({
                        'Возраст_дней': [0]*new_females,
                        'Лактация': [0]*new_females,
                        'Дни в доении': [0]*new_females,
                        'Дни стельности': [-1]*new_females,
                        'status': ['calf_female']*new_females
                    })
                    self.herd = pd.concat([self.herd, new_borns], ignore_index=True)

            # ЗАПУСК В СУХОСТОЙ
            dry_mask = (self.herd['status'] == 'lactating') & (self.herd['Дни стельности'] >= dry_period)
            self.herd.loc[dry_mask, 'status'] = 'dry'

            # ОСЕМЕНЕНИЕ
            needs_insem = (self.herd['status'] == 'lactating') & (self.herd['Дни в доении'] > 60) & (self.herd['Дни стельности'] < 0)
            heifers_need_insem = (self.herd['status'] == 'calf_female') & (self.herd['Возраст_дней'] >= age_insem)
            insem_target = needs_insem | heifers_need_insem
            success = (np.random.rand(len(self.herd)) < prob_insem) & insem_target

            self.herd.loc[success & (self.herd['status'] == 'calf_female'), 'status'] = 'heifer_pregnant'
            self.herd.loc[success, 'Дни стельности'] = 1

            # ПОКУПКА НЕТЕЛЕЙ
            if purchase_per_month > 0:
                new_purchase = pd.DataFrame({
                    'Возраст_дней': [700]*purchase_per_month,
                    'Лактация': [0]*purchase_per_month,
                    'Дни в доении': [0]*purchase_per_month,
                    'Дни стельности': [150]*purchase_per_month,
                    'status': ['heifer_pregnant']*purchase_per_month
                })
                self.herd = pd.concat([self.herd, new_purchase], ignore_index=True)

            current_date += relativedelta(months=1)

        # Если запрошена конкретная дата – интерполяция
        if target_date:
            target_dt = pd.to_datetime(target_date)
            prev_record = None
            next_record = None
            for i, rec in enumerate(history):
                rec_date = pd.to_datetime(rec['month'] + '-01')
                if rec_date <= target_dt:
                    prev_record = rec
                else:
                    next_record = rec
                    break

            if prev_record and next_record:
                prev_date = pd.to_datetime(prev_record['month'] + '-01')
                next_date = pd.to_datetime(next_record['month'] + '-01')
                days_between = (next_date - prev_date).days
                days_from_prev = (target_dt - prev_date).days
                ratio = days_from_prev / days_between if days_between != 0 else 0

                interpolated = {
                    "month": target_date.strftime("%Y-%m-%d"),
                    "avg_dim": round(prev_record['avg_dim'] + (next_record['avg_dim'] - prev_record['avg_dim']) * ratio, 1),
                    "cows_count": int(round(prev_record['cows_count'] + (next_record['cows_count'] - prev_record['cows_count']) * ratio)),
                    "total_adults": int(round(prev_record['total_adults'] + (next_record['total_adults'] - prev_record['total_adults']) * ratio)),
                    "milk_total": int(round(prev_record['milk_total'] + (next_record['milk_total'] - prev_record['milk_total']) * ratio))
                }
                return {"history": history, "target_forecast": interpolated}
            else:
                return {"history": history, "target_forecast": None}

        return history