import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import requests
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from matplotlib.figure import Figure
from datetime import datetime
import threading
import json
import numpy as np

class DraggableCurve:
    """Класс для интерактивного редактирования кривой из 12 точек."""
    def __init__(self, ax, canvas, initial_values=None):
        self.ax = ax
        self.canvas = canvas
        self.months = np.arange(1, 13)
        if initial_values is None:
            self.y_values = np.ones(12)
        else:
            self.y_values = np.array(initial_values)
        self.line, = self.ax.plot(self.months, self.y_values, 'o-', picker=5, markersize=8)
        self.ax.set_xlim(0.5, 12.5)
        self.ax.set_ylim(0, max(2, self.y_values.max()*1.2))
        self.ax.set_xlabel('Месяц')
        self.ax.set_ylabel('Вес закупки')
        self.ax.grid(True)
        self.selected_point = None
        self.canvas.mpl_connect('pick_event', self.on_pick)
        self.canvas.mpl_connect('motion_notify_event', self.on_motion)
        self.canvas.mpl_connect('button_release_event', self.on_release)
        self.canvas.draw()

    def on_pick(self, event):
        if event.artist != self.line:
            return
        ind = event.ind[0]
        self.selected_point = ind
        self.drag_start_y = event.mouseevent.ydata

    def on_motion(self, event):
        if self.selected_point is None or not event.inaxes:
            return
        new_y = event.ydata
        if new_y < 0:
            new_y = 0
        self.y_values[self.selected_point] = new_y
        self.line.set_ydata(self.y_values)
        self.canvas.draw()

    def on_release(self, event):
        self.selected_point = None

    def get_values(self):
        """Возвращает текущие значения кривой (как список float)."""
        return self.y_values.tolist()


class ForecastClient:
    def __init__(self, root):
        self.root = root
        self.root.title("Прогноз производительности стада")
        self.root.geometry("1400x950")

        self.file_path = tk.StringVar()
        self.months = tk.IntVar(value=36)
        self.purchase = tk.IntVar(value=0)
        self.target_year = tk.IntVar(value=2027)
        self.target_month = tk.IntVar(value=9)
        self.target_day = tk.IntVar(value=1)
        self.params_source = tk.StringVar(value="custom")
        self.use_target = tk.BooleanVar(value=False)
        self.maintain_replacement = tk.BooleanVar(value=False)

        # Параметр целевого годового роста
        self.growth_target = tk.DoubleVar(value=0.0)

        self.age_first_insem = tk.DoubleVar(value=395)
        self.prob_insem = tk.DoubleVar(value=0.20)
        self.gestation = tk.DoubleVar(value=282)
        self.dry_period = tk.DoubleVar(value=220)
        self.culling_rate = tk.DoubleVar(value=0.025)

        self.last_data = None
        self.curve_widget = None

        self.create_widgets()
        self.toggle_params_source()
        self.toggle_maintain_replacement()

    def create_widgets(self):
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)

        # Верхняя панель: файл и основные параметры
        top_frame = ttk.Frame(main_frame)
        top_frame.pack(fill=tk.X, pady=5)

        # Файл
        file_frame = ttk.LabelFrame(top_frame, text="Исходные данные", padding="5")
        file_frame.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
        ttk.Label(file_frame, text="CSV файл:").grid(row=0, column=0, sticky=tk.W, padx=5)
        ttk.Entry(file_frame, textvariable=self.file_path, width=50).grid(row=0, column=1, padx=5)
        ttk.Button(file_frame, text="Обзор", command=self.browse_file).grid(row=0, column=2, padx=5)

        # Параметры прогноза
        params_frame = ttk.LabelFrame(top_frame, text="Параметры прогноза", padding="5")
        params_frame.pack(side=tk.RIGHT, fill=tk.X, expand=True, padx=5)

        # Источник параметров
        source_subframe = ttk.Frame(params_frame)
        source_subframe.pack(fill=tk.X, pady=2)
        ttk.Label(source_subframe, text="Источник:").pack(side=tk.LEFT)
        ttk.Radiobutton(source_subframe, text="Кастомные", variable=self.params_source,
                        value="custom", command=self.toggle_params_source).pack(side=tk.LEFT, padx=2)
        ttk.Radiobutton(source_subframe, text="Эмпирические", variable=self.params_source,
                        value="empirical", command=self.toggle_params_source).pack(side=tk.LEFT, padx=2)
        ttk.Radiobutton(source_subframe, text="Константы", variable=self.params_source,
                        value="constants", command=self.toggle_params_source).pack(side=tk.LEFT, padx=2)

        # Месяцы и закупка
        params_subframe = ttk.Frame(params_frame)
        params_subframe.pack(fill=tk.X, pady=2)
        ttk.Label(params_subframe, text="Месяцев:").pack(side=tk.LEFT)
        ttk.Entry(params_subframe, textvariable=self.months, width=5).pack(side=tk.LEFT, padx=5)
        ttk.Label(params_subframe, text="Закупка в месяц:").pack(side=tk.LEFT, padx=(10,0))
        self.purchase_entry = ttk.Entry(params_subframe, textvariable=self.purchase, width=5)
        self.purchase_entry.pack(side=tk.LEFT, padx=5)

        # Целевая дата
        target_subframe = ttk.Frame(params_frame)
        target_subframe.pack(fill=tk.X, pady=2)
        ttk.Checkbutton(target_subframe, text="Целевая дата:",
                        variable=self.use_target, command=self.toggle_target_date).pack(side=tk.LEFT)
        self.target_spin_frame = ttk.Frame(target_subframe)
        self.target_spin_frame.pack(side=tk.LEFT, padx=5)
        ttk.Spinbox(self.target_spin_frame, from_=2026, to=2035, textvariable=self.target_year, width=5).pack(side=tk.LEFT)
        ttk.Label(self.target_spin_frame, text="год").pack(side=tk.LEFT)
        ttk.Spinbox(self.target_spin_frame, from_=1, to=12, textvariable=self.target_month, width=3).pack(side=tk.LEFT)
        ttk.Label(self.target_spin_frame, text="мес").pack(side=tk.LEFT)
        ttk.Spinbox(self.target_spin_frame, from_=1, to=31, textvariable=self.target_day, width=3).pack(side=tk.LEFT)
        ttk.Label(self.target_spin_frame, text="день").pack(side=tk.LEFT)

        # Основная часть: левая панель с кастомными параметрами, правая – с графиком кривой
        middle_frame = ttk.Frame(main_frame)
        middle_frame.pack(fill=tk.BOTH, expand=True, pady=10)

        # Левая панель: кастомные параметры и поддержание численности
        left_panel = ttk.Frame(middle_frame, width=350)
        left_panel.pack(side=tk.LEFT, fill=tk.Y, padx=5)
        left_panel.pack_propagate(False)

        # Кастомные параметры
        self.custom_frame = ttk.LabelFrame(left_panel, text="Параметры модели (кастомные)", padding="5")
        self.custom_frame.pack(fill=tk.X, pady=5)

        self.create_slider(self.custom_frame, "Возраст первого осеменения (дни):",
                           self.age_first_insem, 300, 500, 0)
        self.create_slider(self.custom_frame, "Вероятность осеменения в месяц:",
                           self.prob_insem, 0.05, 0.5, 1)
        self.create_slider(self.custom_frame, "Длительность стельности (дни):",
                           self.gestation, 260, 300, 2)
        self.create_slider(self.custom_frame, "Длительность сухостоя (дни):",
                           self.dry_period, 180, 260, 3)
        self.create_slider(self.custom_frame, "Коэффициент выбраковки (мес):",
                           self.culling_rate, 0.01, 0.1, 4)

        # Поддержание численности
        repl_frame = ttk.LabelFrame(left_panel, text="Поддержание численности", padding="5")
        repl_frame.pack(fill=tk.X, pady=5)
        ttk.Checkbutton(repl_frame, text="Автоматически подобрать закупку",
                        variable=self.maintain_replacement, command=self.toggle_maintain_replacement).pack(anchor=tk.W)

        self.repl_params_frame = ttk.Frame(repl_frame)
        self.repl_params_frame.pack(fill=tk.X, pady=5, padx=10)

        # Целевой годовой рост
        growth_frame = ttk.Frame(self.repl_params_frame)
        growth_frame.pack(fill=tk.X, pady=2)
        ttk.Label(growth_frame, text="Целевой годовой рост (например 0.1):").pack(side=tk.LEFT)
        ttk.Entry(growth_frame, textvariable=self.growth_target, width=8).pack(side=tk.LEFT, padx=5)

        # Правая панель: график кривой закупок
        right_panel = ttk.Frame(middle_frame)
        right_panel.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=5)

        curve_label = ttk.Label(right_panel, text="Редактирование кривой закупок (12 месяцев) – перетаскивайте точки")
        curve_label.pack()

        # Создаём фигуру для кривой
        self.curve_fig = Figure(figsize=(6, 4), dpi=100)
        self.curve_ax = self.curve_fig.add_subplot(111)
        self.curve_canvas = FigureCanvasTkAgg(self.curve_fig, master=right_panel)
        self.curve_canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)

        # Инициализируем интерактивную кривую
        self.curve = DraggableCurve(self.curve_ax, self.curve_canvas)

        # Кнопки управления
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(pady=10)

        ttk.Button(button_frame, text="Запустить прогноз", command=self.run_forecast).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="Сохранить прогноз", command=self.save_results).pack(side=tk.LEFT, padx=5)

        # Область для графика результатов
        self.result_fig = Figure(figsize=(14, 7), dpi=100)
        self.result_canvas = FigureCanvasTkAgg(self.result_fig, master=main_frame)
        self.result_canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)

        self.toggle_target_date()

    def create_slider(self, parent, label, variable, from_, to, row):
        frame = ttk.Frame(parent)
        frame.grid(row=row, column=0, columnspan=2, pady=5, sticky=tk.W+tk.E)
        ttk.Label(frame, text=label).pack(anchor=tk.W)

        slider_frame = ttk.Frame(frame)
        slider_frame.pack(fill=tk.X, pady=2)

        scale = ttk.Scale(slider_frame, from_=from_, to=to, orient=tk.HORIZONTAL,
                          variable=variable,
                          command=lambda v, var=variable: self.update_entry_from_scale(var))
        scale.pack(side=tk.LEFT, fill=tk.X, expand=True)

        entry = ttk.Entry(slider_frame, textvariable=variable, width=8)
        entry.pack(side=tk.RIGHT, padx=5)
        entry.bind('<Return>', lambda e, var=variable: self.update_scale_from_entry(var))
        entry.bind('<FocusOut>', lambda e, var=variable: self.update_scale_from_entry(var))

    def update_entry_from_scale(self, var):
        if var.get() - int(var.get()) != 0:
            var.set(round(var.get(), 3))
        else:
            var.set(int(var.get()))

    def update_scale_from_entry(self, var):
        try:
            val = float(var.get())
            var.set(val)
        except:
            pass

    def toggle_params_source(self):
        state = tk.NORMAL if self.params_source.get() == "custom" else tk.DISABLED
        for child in self.custom_frame.winfo_children():
            if isinstance(child, ttk.Frame):
                for sub in child.winfo_children():
                    if isinstance(sub, ttk.Frame):
                        for widget in sub.winfo_children():
                            if isinstance(widget, (ttk.Scale, ttk.Entry)):
                                widget.configure(state=state)

    def toggle_target_date(self):
        state = tk.NORMAL if self.use_target.get() else tk.DISABLED
        for widget in self.target_spin_frame.winfo_children():
            widget.configure(state=state)

    def toggle_maintain_replacement(self):
        if self.maintain_replacement.get():
            # Включаем поддержание: активируем поля кривой и роста
            for child in self.repl_params_frame.winfo_children():
                for sub in child.winfo_children():
                    if isinstance(sub, ttk.Entry):
                        sub.configure(state=tk.NORMAL)
            self.purchase_entry.configure(state=tk.DISABLED)
        else:
            # Отключаем поддержание: деактивируем поля кривой и роста
            for child in self.repl_params_frame.winfo_children():
                for sub in child.winfo_children():
                    if isinstance(sub, ttk.Entry):
                        sub.configure(state=tk.DISABLED)
            self.purchase_entry.configure(state=tk.NORMAL)

    def browse_file(self):
        filename = filedialog.askopenfilename(
            title="Выберите CSV файл",
            filetypes=[("CSV files", "*.csv")]
        )
        if filename:
            self.file_path.set(filename)

    def run_forecast(self):
        if not self.file_path.get():
            messagebox.showerror("Ошибка", "Выберите файл!")
            return
        threading.Thread(target=self._forecast_thread, daemon=True).start()

    def _forecast_thread(self):
        try:
            params = {
                'months': self.months.get(),
                'purchase': self.purchase.get(),
                'params_source': self.params_source.get(),
                'maintain_replacement': self.maintain_replacement.get(),
            }

            if self.use_target.get():
                target_date = f"{self.target_year.get():04d}-{self.target_month.get():02d}-{self.target_day.get():02d}"
                params['target_date'] = target_date

            if self.params_source.get() == "custom":
                params['age_first_insem'] = int(round(self.age_first_insem.get()))
                params['prob_insem'] = self.prob_insem.get()
                params['gestation'] = int(round(self.gestation.get()))
                params['dry_period'] = int(round(self.dry_period.get()))
                params['culling_rate'] = self.culling_rate.get()

            if self.maintain_replacement.get():
                # Добавляем параметры роста и кривой
                params['growth_target'] = self.growth_target.get()
                # Получаем текущие значения кривой
                curve_values = self.curve.get_values()
                # Преобразуем в строку JSON
                params['purchase_curve'] = json.dumps(curve_values)

            url = "http://127.0.0.1:8000/predict"
            with open(self.file_path.get(), 'rb') as f:
                files = {'file': f}
                response = requests.post(url, files=files, data=params, timeout=300)

            response.raise_for_status()
            data = response.json()

            self.last_data = data
            self.root.after(0, self.plot_results, data)

        except Exception as e:
            self.root.after(0, lambda e=e: messagebox.showerror("Ошибка", str(e)))

    def save_results(self):
        if self.last_data is None:
            messagebox.showwarning("Нет данных", "Сначала выполните прогноз.")
            return
        filename = filedialog.asksaveasfilename(
            defaultextension=".json",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
        )
        if filename:
            try:
                with open(filename, 'w', encoding='utf-8') as f:
                    json.dump(self.last_data, f, ensure_ascii=False, indent=2)
                messagebox.showinfo("Успех", f"Результаты сохранены в {filename}")
            except Exception as e:
                messagebox.showerror("Ошибка", f"Не удалось сохранить файл: {e}")

    def plot_results(self, data):
        self.result_fig.clear()

        if isinstance(data, dict) and "history" in data:
            history = data["history"]
            target_forecast = data.get("target_forecast")
            optimal_purchase = data.get("optimal_purchase_per_month")
        else:
            history = data
            target_forecast = None
            optimal_purchase = None

        months_list = [x['month'] for x in history]
        avg_dim = [x['avg_dim'] for x in history]
        cows = [x['cows_count'] for x in history]
        adults = [x['total_adults'] for x in history]
        milk = [x['milk_total'] / 1000 for x in history]
        first_calvings = [x.get('first_calvings', 0) for x in history]
        purchased = [x.get('purchased', 0) for x in history]

        year_stats = {}
        for rec in history:
            year = rec['month'][:4]
            if year not in year_stats:
                year_stats[year] = {'first': 0, 'purch': 0, 'cows_sum': 0, 'count': 0}
            year_stats[year]['first'] += rec.get('first_calvings', 0)
            year_stats[year]['purch'] += rec.get('purchased', 0)
            year_stats[year]['cows_sum'] += rec.get('cows_count', 0)
            year_stats[year]['count'] += 1

        gs = self.result_fig.add_gridspec(3, 1, height_ratios=[2, 2, 1])
        ax1 = self.result_fig.add_subplot(gs[0, 0])
        ax2 = self.result_fig.add_subplot(gs[1, 0], sharex=ax1)
        ax_text = self.result_fig.add_subplot(gs[2, 0])
        ax_text.axis('off')

        color_red = 'red'
        ax1.set_ylabel('СДД (дни)', color=color_red)
        ax1.plot(months_list, avg_dim, color=color_red, marker='o', label='Средние дни доения')
        ax1.tick_params(axis='y', labelcolor=color_red)

        ax1_twin = ax1.twinx()
        color_blue = 'blue'
        ax1_twin.set_ylabel('Поголовье', color=color_blue)
        ax1_twin.plot(months_list, cows, color=color_blue, marker='s', linestyle='-', label='Дойное стадо')
        ax1_twin.plot(months_list, adults, color='orange', marker='^', linestyle='--', label='Все взрослые')
        ax1_twin.tick_params(axis='y', labelcolor=color_blue)

        ax1_milk = ax1.twinx()
        ax1_milk.spines['right'].set_position(('outward', 60))
        color_green = 'green'
        ax1_milk.set_ylabel('Надой (тыс. л)', color=color_green)
        ax1_milk.plot(months_list, milk, color=color_green, linestyle=':', marker='d', label='Молоко')
        ax1_milk.tick_params(axis='y', labelcolor=color_green)

        lines1, labels1 = ax1.get_legend_handles_labels()
        lines2, labels2 = ax1_twin.get_legend_handles_labels()
        lines3, labels3 = ax1_milk.get_legend_handles_labels()
        ax1.legend(lines1 + lines2 + lines3, labels1 + labels2 + labels3, loc='upper left', fontsize=8)

        x_pos = range(len(months_list))
        width = 0.4
        ax2.bar([i - width/2 for i in x_pos], first_calvings, width, label='Собственные первотёлки', color='green', alpha=0.7)
        ax2.bar([i + width/2 for i in x_pos], purchased, width, label='Купленные нетели', color='orange', alpha=0.7)
        ax2.set_xticks(x_pos)
        ax2.set_xticklabels(months_list, rotation=45, ha='right')
        ax2.set_ylabel('Количество голов')
        ax2.set_xlabel('Месяц')
        ax2.legend(loc='upper left')

        if target_forecast:
            ax1.axvline(x=target_forecast['month'], color='purple', linestyle=':', linewidth=2, label='Целевая дата')
            ax2.axvline(x=target_forecast['month'], color='purple', linestyle=':', linewidth=2)

        text_lines = []
        if optimal_purchase is not None:
            text_lines.append(f"Подобранная ежемесячная закупка: {optimal_purchase} голов")

        for year, stats in year_stats.items():
            avg_cows = stats['cows_sum'] / stats['count'] if stats['count'] > 0 else 0
            total_in = stats['first'] + stats['purch']
            rate = (total_in / avg_cows) * 100 if avg_cows > 0 else 0
            line = f"{year}: первотёлок {stats['first']}, куплено {stats['purch']}, всего {total_in}, ср.дойных {avg_cows:.0f} → {rate:.1f}%"
            text_lines.append(line)

        text = "\n".join(text_lines)
        ax_text.text(0.02, 0.5, text, transform=ax_text.transAxes, fontsize=9,
                     verticalalignment='center', bbox=dict(boxstyle='round', facecolor='lightblue', alpha=0.5))

        self.result_fig.tight_layout()
        self.result_canvas.draw()

if __name__ == "__main__":
    root = tk.Tk()
    app = ForecastClient(root)
    root.mainloop()