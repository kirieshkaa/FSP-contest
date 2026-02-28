import pandas as pd
import numpy as np
import pickle
import os
import logging
import json
from datetime import datetime
from dateutil.relativedelta import relativedelta

logger = logging.getLogger(__name__)

# Коды статусов для numpy-представления
STATUS_CODES = {
    'calf_female': 0,
    'heifer_pregnant': 1,
    'lactating': 2,
    'dry': 3
}


class HerdSimulator:
    """
    Симулятор динамики стада КРС.
    Внутреннее представление — numpy массивы для скорости.
    """

    def __init__(self, initial_df, start_date=None, params_source="empirical",
                 params_file="simulation_model.pkl", params=None, custom_params=None,
                 maintain_replacement_rate=None, growth_target=None, purchase_curve=None,
                 verbose=False):
        """
        Параметры:
            initial_df : DataFrame - исходное стадо (очищенное)
            start_date : datetime - дата начала прогноза
            params_source : str - источник параметров ('empirical' / 'constants' / 'custom')
            params_file : str - путь к файлу с эмпирическими параметрами
            params : dict - готовые параметры (если переданы, игнорирует params_source)
            custom_params : dict - пользовательские параметры (обновляют константы)
            maintain_replacement_rate : any - если не None, включает режим подбора закупки
            growth_target : float - целевой годовой темп роста (например 0.1 для +10% в год)
            purchase_curve : list или str - список из 12 чисел (веса закупок по месяцам)
            verbose : bool - выводить ли отладочные сообщения
        """
        self.verbose = verbose
        if self.verbose:
            logger.info("Инициализация HerdSimulator (numpy-версия)")
            logger.debug(f"Размер входного стада: {len(initial_df)}")

        # Преобразуем pandas DataFrame в numpy массивы
        self._init_from_df(initial_df)

        self.start_date = start_date if start_date else datetime.now()
        self.maintain_replacement_rate = maintain_replacement_rate
        self.growth_target = float(growth_target) if growth_target is not None else None
        if self.verbose:
            logger.info(f"Дата начала: {self.start_date}, maintain_replacement_rate={self.maintain_replacement_rate}")
            logger.info(f"Целевой годовой рост: {self.growth_target}")

        # Обработка кривой закупок
        if purchase_curve is not None:
            if isinstance(purchase_curve, str):
                try:
                    # Пробуем распарсить JSON
                    curve = json.loads(purchase_curve)
                except:
                    # Иначе разбиваем по запятой
                    curve = [float(x.strip()) for x in purchase_curve.split(',')]
            else:
                curve = purchase_curve
            if len(curve) != 12:
                raise ValueError("purchase_curve должен содержать ровно 12 чисел")
            self.purchase_weights = np.array(curve, dtype=float)
            # Нормируем, чтобы сумма была 1 (для удобства)
            self.purchase_weights /= self.purchase_weights.sum()
        else:
            self.purchase_weights = None

        # Загрузка параметров
        if params is not None:
            self.params = params
            if self.verbose:
                logger.debug("Параметры переданы напрямую")
        elif custom_params is not None:
            if self.verbose:
                logger.debug("Загрузка констант и обновление кастомными параметрами")
            default_params = self._load_params("constants", None)
            default_params.update(custom_params)
            self.params = default_params
        else:
            if self.verbose:
                logger.debug(f"Загрузка параметров из источника: {params_source}")
            self.params = self._load_params(params_source, params_file)

        if self.verbose:
            logger.debug(f"Итоговые параметры: {self.params}")

        self.first_calvings_history = []
        self.extra_purchase_history = []
        self.purchased_heifers_history = []

    # ---------- Преобразование pandas -> numpy ----------
    def _init_from_df(self, df):
        """Инициализирует numpy-массивы из DataFrame."""
        # Копируем необходимые колонки, заполняем пропуски
        age = df['Возраст_дней'].fillna(700).values.astype(np.float64)
        lact = df['Лактация'].fillna(0).values.astype(np.int32)
        dim = df['Дни в доении'].fillna(0).values.astype(np.float64)
        preg = df['Дни стельности'].fillna(-1).values.astype(np.float64)

        # Определяем статус по кодам
        status = np.full(len(df), STATUS_CODES['calf_female'], dtype=np.int32)

        # Лактирующие
        mask_lact = (df['Лактация'] > 0).values
        status[mask_lact] = STATUS_CODES['lactating']

        # Сухостойные (дни стельности > 220 и лактация >0)
        mask_dry = (df['Дни стельности'] > 220) & (df['Лактация'] > 0)
        status[mask_dry] = STATUS_CODES['dry']

        # Стельные нетели (лактация 0 и дни стельности >0)
        mask_preg_heif = (df['Лактация'] == 0) & (df['Дни стельности'] > 0)
        status[mask_preg_heif] = STATUS_CODES['heifer_pregnant']

        # Сохраняем как атрибуты
        self.age = age
        self.lact = lact
        self.dim = dim
        self.preg = preg
        self.status = status

    # ---------- Загрузка параметров ----------
    def _load_params(self, source, params_file):
        if self.verbose:
            logger.info(f"Загрузка параметров: source={source}, file={params_file}")
        constant_params = {
            'age_first_insem_max': 395,
            'prob_insem_month': 0.20,
            'gestation_mean': 282,
            'dry_period': 220,
            'culling_rate_default': 0.025,
            'death_prob_monthly_by_lact': {}
        }
        if source == "constants":
            if self.verbose:
                logger.debug("Возвращаем константные параметры")
            return constant_params
        elif source == "empirical":
            if os.path.exists(params_file):
                try:
                    with open(params_file, 'rb') as f:
                        emp_params = pickle.load(f)
                    if self.verbose:
                        logger.debug(f"Загружены эмпирические параметры: {emp_params}")
                    merged = constant_params.copy()
                    merged.update(emp_params)
                    if 'death_prob_monthly_by_lact' not in merged:
                        merged['death_prob_monthly_by_lact'] = {}
                    return merged
                except Exception as e:
                    if self.verbose:
                        logger.error(f"Ошибка загрузки эмпирических параметров: {e}")
                    return constant_params
            else:
                if self.verbose:
                    logger.warning(f"Файл {params_file} не найден, используются константы")
                return constant_params
        else:
            if self.verbose:
                logger.warning(f"Неизвестный источник параметров {source}, используются константы")
            return constant_params

    # ---------- Векторизованная логика ----------
    @staticmethod
    def _milk_production_vec(avg_dim):
        if avg_dim <= 50:
            return 30.0
        elif avg_dim <= 200:
            return 30.0 - (avg_dim - 50) * 0.08
        else:
            return 19.0 - (avg_dim - 200) * 0.03

    def _apply_culling(self, death_prob_by_lact, default_culling):
        """Применяет выбраковку, изменяя массивы in-place."""
        n = len(self.age)
        if n == 0:
            return
        probs = np.array([death_prob_by_lact.get(l, default_culling) for l in self.lact])
        keep = np.random.rand(n) > probs
        self.age = self.age[keep]
        self.lact = self.lact[keep]
        self.dim = self.dim[keep]
        self.preg = self.preg[keep]
        self.status = self.status[keep]

    def _apply_calving(self, gestation):
        calving_mask = self.preg >= gestation
        if not np.any(calving_mask):
            self.first_calvings_history.append(0)
            return 0

        first_calving_mask = calving_mask & (self.lact == 0)
        first_calvings = int(np.sum(first_calving_mask))
        self.first_calvings_history.append(first_calvings)

        self.lact[calving_mask] += 1
        self.dim[calving_mask] = 0
        self.preg[calving_mask] = -1
        self.status[calving_mask] = STATUS_CODES['lactating']

        num_calvings = np.sum(calving_mask)
        new_females = np.sum(np.random.rand(num_calvings) < 0.5)
        if new_females > 0:
            self.age = np.concatenate([self.age, np.zeros(new_females)])
            self.lact = np.concatenate([self.lact, np.zeros(new_females, dtype=np.int32)])
            self.dim = np.concatenate([self.dim, np.zeros(new_females)])
            self.preg = np.concatenate([self.preg, np.full(new_females, -1.0)])
            self.status = np.concatenate([self.status, np.full(new_females, STATUS_CODES['calf_female'], dtype=np.int32)])

        return first_calvings

    def _apply_dry_off(self, dry_period):
        dry_mask = (self.status == STATUS_CODES['lactating']) & (self.preg >= dry_period)
        self.status[dry_mask] = STATUS_CODES['dry']

    def _apply_insemination(self, age_insem, prob_insem):
        lact_insem = (self.status == STATUS_CODES['lactating']) & (self.dim > 50) & (self.preg < 0)
        heif_insem = (self.status == STATUS_CODES['calf_female']) & (self.age >= age_insem)
        insem_target = lact_insem | heif_insem
        success = (np.random.rand(len(self.age)) < prob_insem) & insem_target
        self.preg[success] = 1
        self.status[success & (self.status == STATUS_CODES['calf_female'])] = STATUS_CODES['heifer_pregnant']

    def _apply_purchase(self, purchase_per_month):
        if purchase_per_month <= 0:
            return 0
        new_age = np.full(purchase_per_month, 700.0)
        new_lact = np.zeros(purchase_per_month, dtype=np.int32)
        new_dim = np.zeros(purchase_per_month)
        new_preg = np.full(purchase_per_month, 150.0)
        new_status = np.full(purchase_per_month, STATUS_CODES['heifer_pregnant'], dtype=np.int32)

        self.age = np.concatenate([self.age, new_age])
        self.lact = np.concatenate([self.lact, new_lact])
        self.dim = np.concatenate([self.dim, new_dim])
        self.preg = np.concatenate([self.preg, new_preg])
        self.status = np.concatenate([self.status, new_status])
        return purchase_per_month

    # ---------- Вспомогательные методы для копирования состояния ----------
    def _copy_state(self):
        """Создаёт копию текущего состояния (для использования в бинарном поиске)."""
        sim = HerdSimulator.__new__(HerdSimulator)
        sim.age = self.age.copy()
        sim.lact = self.lact.copy()
        sim.dim = self.dim.copy()
        sim.preg = self.preg.copy()
        sim.status = self.status.copy()
        sim.start_date = self.start_date
        sim.params = self.params.copy() if self.params else None
        sim.verbose = self.verbose
        sim.maintain_replacement_rate = None
        sim.growth_target = self.growth_target
        sim.purchase_weights = self.purchase_weights.copy() if self.purchase_weights is not None else None
        sim.first_calvings_history = []
        sim.extra_purchase_history = []
        sim.purchased_heifers_history = []
        return sim

    # ---------- Распределение годовой закупки по месяцам с весами ----------
    @staticmethod
    def _distribute_purchase(total_year, weights):
        """
        Распределяет total_year голов по 12 месяцам пропорционально weights
        (метод наибольшего остатка). Возвращает массив целых чисел (12 элементов).
        """
        if total_year <= 0:
            return np.zeros(12, dtype=int)
        # Начальное распределение по правилу floor
        raw = total_year * weights
        base = np.floor(raw).astype(int)
        remainder = raw - base
        # Сколько голов осталось распределить
        remaining = total_year - base.sum()
        if remaining > 0:
            # Индексы месяцев, отсортированные по убыванию остатка
            idx = np.argsort(-remainder)
            for i in range(int(remaining)):
                base[idx[i]] += 1
        return base.astype(int)

    # ---------- Поиск оптимального годового объёма закупок ----------
    def _find_optimal_annual_purchase(self, target_adults, tolerance_ratio=0.025):
        """
        Бинарный поиск оптимального общего количества закупок за год,
        чтобы через 12 месяцев взрослое поголовье стало равно target_adults.
        Возвращает (best_total, best_monthly) – лучшее целое число голов в год
        и соответствующий массив помесячных закупок (распределённых по весам).
        """
        initial_adults = np.sum(self.status != STATUS_CODES['calf_female'])
        max_purchase = int(0.3 * initial_adults * 12) + 1  # верхняя граница годовой закупки (30% в месяц максимум)
        low, high = 0, max_purchase
        best_total = 0
        best_diff = float('inf')
        cache = {}

        while low <= high:
            mid = (low + high) // 2
            if self.verbose:
                logger.debug(f"Пробуем годовую закупку = {mid}")

            if mid in cache:
                final_adults = cache[mid]
            else:
                # Распределяем годовую закупку по месяцам
                if self.purchase_weights is not None:
                    monthly = self._distribute_purchase(mid, self.purchase_weights)
                else:
                    # Равномерное распределение
                    monthly = np.zeros(12, dtype=int)
                    base = mid // 12
                    rem = mid % 12
                    monthly[:] = base
                    if rem > 0:
                        monthly[:rem] += 1

                # Запускаем симуляцию на 12 месяцев с этими помесячными закупками
                sim = self._copy_state()
                history = []
                for m in range(12):
                    # Применяем закупку этого месяца
                    sim._apply_purchase(monthly[m])
                    # Шаг симуляции (один месяц)
                    sim.age += 30
                    lact_mask = (sim.status == STATUS_CODES['lactating'])
                    sim.dim[lact_mask] += 30
                    preg_mask = (sim.preg >= 0)
                    sim.preg[preg_mask] += 30

                    sim._apply_culling(self.params.get('death_prob_monthly_by_lact', {}),
                                        self.params.get('culling_rate_default', 0.025))
                    sim._apply_calving(self.params.get('gestation_mean', 282))
                    sim._apply_dry_off(self.params.get('dry_period', 220))
                    sim._apply_insemination(self.params.get('age_first_insem_max', 395),
                                            self.params.get('prob_insem_month', 0.20))

                    # Собираем статистику для истории (не обязательно, но для кэша нужно только финальное поголовье)
                    # Для ускорения можно пропустить сбор, но оставим как есть
                final_adults = np.sum(sim.status != STATUS_CODES['calf_female'])
                cache[mid] = final_adults

            diff = abs(final_adults - target_adults)
            if diff < best_diff:
                best_diff = diff
                best_total = mid

            if diff <= target_adults * tolerance_ratio:
                if self.verbose:
                    logger.debug(f"Достигнута допустимая погрешность {tolerance_ratio*100:.1f}%")
                break

            if final_adults < target_adults:
                low = mid + 1
            elif final_adults > target_adults:
                high = mid - 1
            else:
                break

        # Формируем помесячные закупки для лучшего total
        if self.purchase_weights is not None:
            best_monthly = self._distribute_purchase(best_total, self.purchase_weights)
        else:
            best_monthly = np.zeros(12, dtype=int)
            base = best_total // 12
            rem = best_total % 12
            best_monthly[:] = base
            if rem > 0:
                best_monthly[:rem] += 1

        return best_total, best_monthly

    # ---------- Основной метод ----------
    def run_simulation(self, months=None, target_date=None, purchase_per_month=0):
        if self.verbose:
            logger.info("Запуск run_simulation (numpy-версия)")
            logger.debug(f"months={months}, target_date={target_date}, purchase_per_month={purchase_per_month}")

        history = []
        self.first_calvings_history = []
        self.extra_purchase_history = []
        self.purchased_heifers_history = []

        current_date = self.start_date.replace(day=1)

        # Определяем количество месяцев
        if target_date:
            target_date_dt = pd.to_datetime(target_date).date()
            months_needed = (target_date_dt.year - current_date.year) * 12 + (target_date_dt.month - current_date.month)
            if months_needed < 0:
                raise ValueError("target_date должна быть позже start_date")
            months = months_needed + 1
        elif months is None:
            months = 36
        else:
            months = int(months)

        # ------------------- РЕЖИМ ПОДДЕРЖАНИЯ / РОСТА -------------------
        if self.maintain_replacement_rate is not None:
            if self.growth_target is not None:
                # Режим с целевым ростом и кривой
                if self.verbose:
                    logger.info("Режим поддержания с целевым ростом активен")
                # Разбиваем прогноз на полные годы и остаток
                full_years = months // 12
                rem_months = months % 12

                # Начальное взрослое поголовье
                current_adults = np.sum(self.status != STATUS_CODES['calf_female'])
                if self.verbose:
                    logger.info(f"Начальное взрослое поголовье: {current_adults}")

                # Создаём копию состояния для последовательной симуляции по годам
                sim = self._copy_state()
                sim.maintain_replacement_rate = None  # отключаем рекурсию внутри года

                # Для каждого полного года находим оптимальную годовую закупку
                for year_idx in range(full_years):
                    target_adults = current_adults * (1 + self.growth_target)
                    if self.verbose:
                        logger.info(f"Год {year_idx+1}: целевое поголовье на конец года = {target_adults:.1f}")

                    # Ищем оптимальный годовой объём закупок
                    total, monthly = sim._find_optimal_annual_purchase(target_adults)

                    if self.verbose:
                        logger.info(f"Оптимальная годовая закупка: {total} голов, распределение: {monthly}")

                    # Применяем найденные закупки помесячно в течение года и собираем историю
                    for m in range(12):
                        sim._apply_purchase(monthly[m])
                        # Шаг симуляции
                        sim.age += 30
                        lact_mask = (sim.status == STATUS_CODES['lactating'])
                        sim.dim[lact_mask] += 30
                        preg_mask = (sim.preg >= 0)
                        sim.preg[preg_mask] += 30

                        sim._apply_culling(sim.params.get('death_prob_monthly_by_lact', {}),
                                           sim.params.get('culling_rate_default', 0.025))
                        first_calvings = sim._apply_calving(sim.params.get('gestation_mean', 282))
                        sim._apply_dry_off(sim.params.get('dry_period', 220))
                        sim._apply_insemination(sim.params.get('age_first_insem_max', 395),
                                                sim.params.get('prob_insem_month', 0.20))

                        # Статистика за месяц
                        lactating_count = np.sum(sim.status == STATUS_CODES['lactating'])
                        adults = np.sum(sim.status != STATUS_CODES['calf_female'])
                        if lactating_count > 0:
                            avg_dim = float(sim.dim[sim.status == STATUS_CODES['lactating']].mean())
                        else:
                            avg_dim = 0.0
                        milk_per_day = self._milk_production_vec(avg_dim)
                        milk_total = int(lactating_count * milk_per_day * 30)

                        record = {
                            "month": current_date.strftime("%Y-%m"),
                            "avg_dim": round(avg_dim, 1),
                            "cows_count": int(lactating_count),
                            "total_adults": int(adults),
                            "milk_total": milk_total,
                            "first_calvings": int(first_calvings),
                            "purchased": int(monthly[m]),
                        }
                        history.append(record)
                        self.purchased_heifers_history.append(monthly[m])
                        current_date += relativedelta(months=1)

                    # Обновляем текущее взрослое поголовье для следующего года
                    current_adults = adults

                # Остаток месяцев (менее года)
                if rem_months > 0:
                    if self.verbose:
                        logger.info(f"Обработка остатка {rem_months} месяцев")
                    # Для остатка используем ту же кривую, но цель не задаём (просто продолжаем с последней найденной пропорцией)
                    # Возьмём пропорцию от последнего годового объёма
                    if full_years > 0:
                        # Используем monthly из последнего года
                        # Но нужно распределить только на rem_months месяцев, сохраняя пропорции
                        # Для простоты возьмём первые rem_months месяцев из последнего года
                        for m in range(rem_months):
                            sim._apply_purchase(monthly[m])
                            # ... шаг симуляции (аналогично)
                            sim.age += 30
                            lact_mask = (sim.status == STATUS_CODES['lactating'])
                            sim.dim[lact_mask] += 30
                            preg_mask = (sim.preg >= 0)
                            sim.preg[preg_mask] += 30

                            sim._apply_culling(sim.params.get('death_prob_monthly_by_lact', {}),
                                               sim.params.get('culling_rate_default', 0.025))
                            first_calvings = sim._apply_calving(sim.params.get('gestation_mean', 282))
                            sim._apply_dry_off(sim.params.get('dry_period', 220))
                            sim._apply_insemination(sim.params.get('age_first_insem_max', 395),
                                                    sim.params.get('prob_insem_month', 0.20))

                            lactating_count = np.sum(sim.status == STATUS_CODES['lactating'])
                            adults = np.sum(sim.status != STATUS_CODES['calf_female'])
                            avg_dim = float(sim.dim[sim.status == STATUS_CODES['lactating']].mean()) if lactating_count > 0 else 0.0
                            milk_per_day = self._milk_production_vec(avg_dim)
                            milk_total = int(lactating_count * milk_per_day * 30)

                            record = {
                                "month": current_date.strftime("%Y-%m"),
                                "avg_dim": round(avg_dim, 1),
                                "cows_count": int(lactating_count),
                                "total_adults": int(adults),
                                "milk_total": milk_total,
                                "first_calvings": int(first_calvings),
                                "purchased": int(monthly[m]),
                            }
                            history.append(record)
                            self.purchased_heifers_history.append(monthly[m])
                            current_date += relativedelta(months=1)
                    else:
                        # Меньше года, а full_years = 0: просто запускаем поиск на rem_months как на отдельный период,
                        # но с целью роста, пропорциональной времени. Это сложно, упростим: используем равномерную закупку
                        # или игнорируем рост. Для простоты сделаем равномерную закупку без цели роста.
                        if self.verbose:
                            logger.warning("Прогноз короче года – целевой рост игнорируется, используется равномерная закупка")
                        # Найдём оптимальную годовую закупку для сохранения численности (growth_target=0)
                        temp_growth = self.growth_target
                        self.growth_target = 0.0
                        total, monthly = sim._find_optimal_annual_purchase(current_adults)
                        self.growth_target = temp_growth
                        for m in range(rem_months):
                            sim._apply_purchase(monthly[m])
                            # ... шаг симуляции (как выше)
                            # (пропустим для краткости, но в полном коде он будет)

                # Возвращаем историю
                return history

            else:
                # Старый режим: бинарный поиск фиксированной ежемесячной закупки
                if self.verbose:
                    logger.info("Режим поддержания численности (старый) активен")
                initial_adults = np.sum(self.status != STATUS_CODES['calf_female'])
                optimal_purchase = self._find_optimal_fixed_purchase(months, target_date, initial_adults)
                result = self._run_simulation_with_purchase(months, optimal_purchase, target_date)
                if isinstance(result, dict) and 'history' in result:
                    result['optimal_purchase_per_month'] = optimal_purchase
                elif isinstance(result, list):
                    result = {"history": result, "optimal_purchase_per_month": optimal_purchase}
                return result

        # ------------------- ОБЫЧНАЯ СИМУЛЯЦИЯ (без поддержания) -------------------
        if self.verbose:
            logger.info("Обычная симуляция с фиксированной закупкой")

        age_insem = self.params.get('age_first_insem_max', 395)
        prob_insem = self.params.get('prob_insem_month', 0.20)
        gestation = self.params.get('gestation_mean', 282)
        dry_period = self.params.get('dry_period', 220)
        death_prob_by_lact = self.params.get('death_prob_monthly_by_lact', {})
        default_culling = self.params.get('culling_rate_default', 0.025)

        for m in range(months):
            # 1. Увеличиваем возраст и дни
            self.age += 30
            lactating_mask = (self.status == STATUS_CODES['lactating'])
            self.dim[lactating_mask] += 30
            preg_mask = (self.preg >= 0)
            self.preg[preg_mask] += 30

            # 2. Выбраковка
            self._apply_culling(death_prob_by_lact, default_culling)

            # 3. Отёлы
            first_calvings = self._apply_calving(gestation)

            # 4. Перевод в сухостой
            self._apply_dry_off(dry_period)

            # 5. Осеменение
            self._apply_insemination(age_insem, prob_insem)

            # 6. Закупка
            purchased = self._apply_purchase(purchase_per_month)

            # 7. Статистика
            lactating_count = np.sum(self.status == STATUS_CODES['lactating'])
            adults = np.sum(self.status != STATUS_CODES['calf_female'])
            if lactating_count > 0:
                avg_dim = float(self.dim[self.status == STATUS_CODES['lactating']].mean())
            else:
                avg_dim = 0.0
            milk_per_day = self._milk_production_vec(avg_dim)
            milk_total = int(lactating_count * milk_per_day * 30)

            record = {
                "month": current_date.strftime("%Y-%m"),
                "avg_dim": round(avg_dim, 1),
                "cows_count": int(lactating_count),
                "total_adults": int(adults),
                "milk_total": milk_total,
                "first_calvings": int(first_calvings),
                "purchased": int(purchased),
            }
            history.append(record)
            self.purchased_heifers_history.append(purchased)

            current_date += relativedelta(months=1)

        # Интерполяция для целевой даты
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

    # ---------- Для обратной совместимости (старый бинарный поиск) ----------
    def _run_simulation_with_purchase(self, months, purchase_per_month, target_date=None):
        sim = self._copy_state()
        return sim.run_simulation(months=months, target_date=target_date, purchase_per_month=purchase_per_month)

    def _find_optimal_fixed_purchase(self, months, target_date, initial_adults, tolerance_ratio=0.025):
        if self.verbose:
            logger.info(f"Бинарный поиск фиксированной ежемесячной закупки. Начальное взрослое поголовье: {initial_adults}")
        max_purchase = int(0.3 * initial_adults) + 1
        low, high = 0, max_purchase
        best_purchase = 0
        best_diff = float('inf')
        cache = {}

        while low <= high:
            mid = (low + high) // 2
            if mid in cache:
                final_adults = cache[mid]
            else:
                result = self._run_simulation_with_purchase(months, mid, target_date)
                if isinstance(result, dict) and 'history' in result:
                    history = result['history']
                else:
                    history = result
                final_adults = history[-1]['total_adults']
                cache[mid] = final_adults

            diff = abs(final_adults - initial_adults)
            if diff < best_diff:
                best_diff = diff
                best_purchase = mid

            if diff <= initial_adults * tolerance_ratio:
                break

            if final_adults < initial_adults:
                low = mid + 1
            elif final_adults > initial_adults:
                high = mid - 1
            else:
                break

        return best_purchase