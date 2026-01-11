// ===== HABIT TRACKER CLASS =====
class HabitTracker {
    constructor() {
        this.habits = JSON.parse(localStorage.getItem('habits')) || [];
        this.history = JSON.parse(localStorage.getItem('habitHistory')) || {};
        this.currentMonth = new Date();
        this.currentFilter = 'all';
        this.currentView = 'list';

        this.categoryConfig = {
            health: { emoji: '🏃', label: 'Health' },
            productivity: { emoji: '💼', label: 'Productivity' },
            learning: { emoji: '📚', label: 'Learning' },
            wellness: { emoji: '🧘', label: 'Wellness' },
            other: { emoji: '📌', label: 'Other' }
        };

        this.init();
    }

    init() {
        this.renderDate();
        this.renderHabits();
        this.renderProgress();
        this.renderStats();
        this.renderWeekChart();
        this.renderHabitStats();
        this.renderCalendar();
        this.updateCategoryCounts();
        this.setupEventListeners();
    }

    // Get today's date as string key
    getTodayKey() {
        return new Date().toISOString().split('T')[0];
    }

    // Format date for display
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // Save to localStorage
    save() {
        localStorage.setItem('habits', JSON.stringify(this.habits));
        localStorage.setItem('habitHistory', JSON.stringify(this.history));
    }

    // ===== HABIT OPERATIONS =====
    addHabit(name, category) {
        const habit = {
            id: Date.now().toString(),
            name: name.trim(),
            category,
            createdAt: this.getTodayKey(),
            streak: 0
        };

        this.habits.push(habit);
        this.save();
        this.renderAll();
    }

    deleteHabit(id) {
        if (!confirm('Are you sure you want to delete this habit?')) return;

        this.habits = this.habits.filter(h => h.id !== id);

        // Clean up history
        Object.keys(this.history).forEach(date => {
            delete this.history[date][id];
        });

        this.save();
        this.renderAll();
    }

    toggleHabit(id) {
        const today = this.getTodayKey();

        if (!this.history[today]) {
            this.history[today] = {};
        }

        this.history[today][id] = !this.history[today][id];

        // Update streak
        this.updateStreak(id);

        this.save();
        this.renderAll();
    }

    isHabitCompletedToday(id) {
        const today = this.getTodayKey();
        return this.history[today]?.[id] || false;
    }

    updateStreak(id) {
        const habit = this.habits.find(h => h.id === id);
        if (!habit) return;

        let streak = 0;
        let date = new Date();

        // Count consecutive days
        while (true) {
            const dateKey = date.toISOString().split('T')[0];

            if (this.history[dateKey]?.[id]) {
                streak++;
                date.setDate(date.getDate() - 1);
            } else {
                break;
            }
        }

        habit.streak = streak;
    }

    // Get habits filtered by category
    getFilteredHabits() {
        if (this.currentFilter === 'all') {
            return this.habits;
        }
        return this.habits.filter(h => h.category === this.currentFilter);
    }

    // Get habits grouped by category
    getGroupedHabits() {
        const groups = {};

        this.habits.forEach(habit => {
            if (!groups[habit.category]) {
                groups[habit.category] = [];
            }
            groups[habit.category].push(habit);
        });

        return groups;
    }

    // Get count by category
    getCategoryCounts() {
        const counts = { all: this.habits.length };

        Object.keys(this.categoryConfig).forEach(cat => {
            counts[cat] = this.habits.filter(h => h.category === cat).length;
        });

        return counts;
    }

    // ===== STATISTICS =====
    getTodayProgress() {
        const total = this.habits.length;
        if (total === 0) return { completed: 0, total: 0, percent: 0 };

        const completed = this.habits.filter(h => this.isHabitCompletedToday(h.id)).length;
        const percent = Math.round((completed / total) * 100);

        return { completed, total, percent };
    }

    getStats() {
        const today = this.getTodayKey();
        const totalHabits = this.habits.length;

        if (totalHabits === 0) {
            return {
                currentStreak: 0,
                longestStreak: 0,
                completionRate: 0,
                totalCompleted: 0
            };
        }

        // Calculate current streak (days with all habits completed)
        let currentStreak = 0;
        let date = new Date();

        while (true) {
            const dateKey = date.toISOString().split('T')[0];
            const dayData = this.history[dateKey];

            if (!dayData) break;

            const completedCount = this.habits.filter(h => dayData[h.id]).length;

            if (completedCount === totalHabits) {
                currentStreak++;
                date.setDate(date.getDate() - 1);
            } else {
                break;
            }
        }

        // Calculate longest streak
        let longestStreak = 0;
        let tempStreak = 0;
        const sortedDates = Object.keys(this.history).sort();

        sortedDates.forEach((dateKey) => {
            const dayData = this.history[dateKey];
            const completedCount = this.habits.filter(h => dayData[h.id]).length;

            if (completedCount === totalHabits) {
                tempStreak++;
                longestStreak = Math.max(longestStreak, tempStreak);
            } else {
                tempStreak = 0;
            }
        });

        // Calculate overall completion rate
        let totalPossible = 0;
        let totalCompleted = 0;

        Object.keys(this.history).forEach(dateKey => {
            const dayData = this.history[dateKey];
            this.habits.forEach(habit => {
                if (new Date(dateKey) >= new Date(habit.createdAt)) {
                    totalPossible++;
                    if (dayData[habit.id]) {
                        totalCompleted++;
                    }
                }
            });
        });

        const completionRate = totalPossible > 0
            ? Math.round((totalCompleted / totalPossible) * 100)
            : 0;

        return {
            currentStreak,
            longestStreak,
            completionRate,
            totalCompleted
        };
    }

    getWeekData() {
        const data = [];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            const dayData = this.history[dateKey] || {};

            const activeHabits = this.habits.filter(h =>
                new Date(h.createdAt) <= date
            );

            const completed = activeHabits.filter(h => dayData[h.id]).length;
            const total = activeHabits.length;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

            data.push({
                day: days[date.getDay()],
                date: date.getDate(),
                percent,
                completed,
                total
            });
        }

        return data;
    }

    getHabitStats() {
        return this.habits.map(habit => {
            let completed = 0;
            let total = 0;

            Object.keys(this.history).forEach(dateKey => {
                if (new Date(dateKey) >= new Date(habit.createdAt)) {
                    total++;
                    if (this.history[dateKey][habit.id]) {
                        completed++;
                    }
                }
            });

            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

            return {
                id: habit.id,
                name: habit.name,
                category: habit.category,
                percent,
                streak: habit.streak
            };
        });
    }

    // ===== RENDERING =====
    renderAll() {
        this.renderHabits();
        this.renderProgress();
        this.renderStats();
        this.renderWeekChart();
        this.renderHabitStats();
        this.renderCalendar();
        this.updateCategoryCounts();
    }

    renderDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('currentDate').textContent =
            new Date().toLocaleDateString('en-US', options);
    }

    updateCategoryCounts() {
        const counts = this.getCategoryCounts();

        document.getElementById('countAll').textContent = counts.all;
        document.getElementById('countHealth').textContent = counts.health;
        document.getElementById('countProductivity').textContent = counts.productivity;
        document.getElementById('countLearning').textContent = counts.learning;
        document.getElementById('countWellness').textContent = counts.wellness;
        document.getElementById('countOther').textContent = counts.other;

        // Update summary
        const progress = this.getTodayProgress();
        document.getElementById('habitsSummary').innerHTML = `
            <span class="completed-count">${progress.completed}</span> / ${progress.total} completed
        `;
    }

    renderHabits() {
        const container = document.getElementById('habitsList');

        if (this.habits.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>No habits yet. Add your first habit above!</p>
                </div>
            `;
            return;
        }

        if (this.currentView === 'grouped') {
            this.renderGroupedHabits(container);
        } else {
            this.renderListHabits(container);
        }
    }

    renderListHabits(container) {
        const filteredHabits = this.getFilteredHabits();

        if (filteredHabits.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-filter"></i>
                    <p>No habits in this category</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredHabits.map(habit => this.createHabitHTML(habit)).join('');
    }

    renderGroupedHabits(container) {
        const groups = this.getGroupedHabits();
        const categoryOrder = ['health', 'productivity', 'learning', 'wellness', 'other'];

        let html = '';

        categoryOrder.forEach(category => {
            const habits = groups[category];
            if (!habits || habits.length === 0) return;

            // Apply filter
            if (this.currentFilter !== 'all' && this.currentFilter !== category) return;

            const config = this.categoryConfig[category];

            html += `
                <div class="category-group">
                    <div class="category-group-header">
                        <span class="category-icon">${config.emoji}</span>
                        <h3>${config.label}</h3>
                        <span class="category-count">${habits.length} habit${habits.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="category-habits">
                        ${habits.map(habit => this.createHabitHTML(habit)).join('')}
                    </div>
                </div>
            `;
        });

        if (html === '') {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-filter"></i>
                    <p>No habits in this category</p>
                </div>
            `;
            return;
        }

        container.innerHTML = html;
    }

    createHabitHTML(habit) {
        const completed = this.isHabitCompletedToday(habit.id);
        const config = this.categoryConfig[habit.category];

        return `
            <div class="habit-item ${completed ? 'completed' : ''}" data-id="${habit.id}">
                <div class="habit-checkbox" onclick="tracker.toggleHabit('${habit.id}')">
                    <i class="fas fa-check"></i>
                </div>
                <div class="habit-info">
                    <div class="habit-name">${habit.name}</div>
                    <div class="habit-meta">
                        <span class="category-badge ${habit.category}">
                            ${config.emoji} ${config.label}
                        </span>
                        ${habit.streak > 0 ? `
                            <div class="habit-streak">
                                <i class="fas fa-fire"></i>
                                <span>${habit.streak} day${habit.streak !== 1 ? 's' : ''}</span>
                            </div>
                        ` : ''}
                        <span class="habit-created">Since ${this.formatDate(habit.createdAt)}</span>
                    </div>
                </div>
                <button class="habit-delete" onclick="tracker.deleteHabit('${habit.id}')" title="Delete habit">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }

    renderProgress() {
        const progress = this.getTodayProgress();

        document.getElementById('progressFill').style.width = `${progress.percent}%`;
        document.getElementById('progressText').textContent = `${progress.percent}%`;
    }

    renderStats() {
        const stats = this.getStats();

        document.getElementById('currentStreak').textContent = stats.currentStreak;
        document.getElementById('longestStreak').textContent = stats.longestStreak;
        document.getElementById('completionRate').textContent = stats.completionRate + '%';
        document.getElementById('totalCompleted').textContent = stats.totalCompleted;
    }

    renderWeekChart() {
        const data = this.getWeekData();
        const container = document.getElementById('weekChart');

        container.innerHTML = data.map(day => `
            <div class="day-bar">
                <div class="day-percent">${day.percent}%</div>
                <div class="bar-fill" style="height: ${Math.max(day.percent, 5)}%"></div>
                <div class="day-label">${day.day}</div>
            </div>
        `).join('');
    }

    renderHabitStats() {
        const stats = this.getHabitStats();
        const container = document.getElementById('habitStatsContainer');

        if (stats.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted);">Add habits to see performance stats</p>';
            return;
        }

        container.innerHTML = stats.map(stat => {
            const config = this.categoryConfig[stat.category];
            return `
                <div class="habit-stat-item">
                    <span class="habit-stat-name">
                        <span>${config.emoji}</span>
                        ${stat.name}
                    </span>
                    <div class="habit-stat-bar">
                        <div class="habit-stat-fill" style="width: ${stat.percent}%"></div>
                    </div>
                    <span class="habit-stat-percent">${stat.percent}%</span>
                </div>
            `;
        }).join('');
    }

    renderCalendar() {
        const container = document.getElementById('calendar');
        const monthLabel = document.getElementById('calendarMonth');

        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];

        monthLabel.textContent = `${monthNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        let html = '';

        // Day headers
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });

        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            html += '<div class="calendar-day empty"></div>';
        }

        // Days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateKey = date.toISOString().split('T')[0];
            const dayData = this.history[dateKey];

            let classes = 'calendar-day';

            // Check if today
            if (date.toDateString() === today.toDateString()) {
                classes += ' today';
            }

            // Check completion
            if (dayData && this.habits.length > 0) {
                const completed = this.habits.filter(h => dayData[h.id]).length;
                const percent = (completed / this.habits.length) * 100;

                classes += ' has-data';

                if (percent >= 80) classes += ' completion-high';
                else if (percent >= 50) classes += ' completion-medium';
                else if (percent > 0) classes += ' completion-low';
            }

            html += `<div class="${classes}" title="${dateKey}">${day}</div>`;
        }

        container.innerHTML = html;
    }

    // ===== EVENT LISTENERS =====
    setupEventListeners() {
        // Add habit form
        document.getElementById('habitForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('habitInput');
            const category = document.getElementById('habitCategory').value;

            if (input.value.trim()) {
                this.addHabit(input.value, category);
                input.value = '';
            }
        });

        // Filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentFilter = tab.dataset.filter;
                this.renderHabits();
            });
        });

        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentView = btn.dataset.view;
                this.renderHabits();
            });
        });

        // Calendar navigation
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
            this.renderCalendar();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
            this.renderCalendar();
        });
    }
}

// Initialize the app
const tracker = new HabitTracker();