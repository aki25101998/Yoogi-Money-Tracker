# Daily Spending Discipline Calendar Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Daily Spending Discipline Calendar ("Lịch Kỷ Luật Chi Tiêu") in Yoogi Money Tracker with configurable daily limit, category filtering, on-the-fly calendar evaluation (Pass/Fail/No-spend/Future), monthly summary comparison, day detail breakdown, and Supabase cloud sync.

**Architecture:** Frontend calculates all calendar states on-the-fly using the custom hook `useDailyDiscipline` from existing in-memory transactions, strictly complying with Yoogi Constitution (05-budgets.md & 06-wallets-transactions.md). Cloud storage (`daily_budget_settings`) in Supabase is used only for persisting user configuration (`daily_limit`, `category_ids`, `wallet_ids`, `enabled`).

**Tech Stack:** React 18, Tailwind CSS, Lucide React icons, Vitest, Supabase JS Client, Capacitor Android.

---

### File Structure Map

```
yoogi-money-tracker/
├── database_migrations/
│   └── 14_create_daily_budget_settings.sql          # DB schema migration
├── src/
│   ├── services/
│   │   └── dailyBudgetService.js                    # Fetch, save, and realtime subscription
│   ├── hooks/
│   │   ├── useDailyDiscipline.js                    # Core on-the-fly calculation engine
│   │   └── useAppData.js                            # Hook loading dailyBudgetSettings
│   ├── components/
│   │   ├── Layout.jsx                               # Add "Kỷ luật" to navigation
│   │   └── daily-discipline/
│   │       ├── DailyDisciplineHeader.jsx            # Month switcher & settings button
│   │       ├── MonthlySummaryCard.jsx               # KPI cards & MTD progress comparison
│   │       ├── DisciplineCalendarGrid.jsx           # 7-column calendar matrix
│   │       ├── DayCellItem.jsx                      # Individual calendar day box
│   │       ├── DayDetailsModal.jsx                  # Popover showing day's transactions
│   │       └── DailyBudgetConfigModal.jsx           # Form to configure limit & categories
│   ├── pages/
│   │   └── DailyDisciplinePage.jsx                  # Main page view
│   ├── tests/
│   │   ├── dailyBudgetService.test.js               # Service unit tests
│   │   └── useDailyDiscipline.test.js               # Hook logic calculation unit tests
│   └── App.jsx                                      # Page routing & modal wiring
```

---

### Task 1: Database Migration for Daily Budget Settings

**Files:**
- Create: `yoogi-money-tracker/database_migrations/14_create_daily_budget_settings.sql`

- [ ] **Step 1: Write SQL migration file**

Write the table creation and RLS script in `yoogi-money-tracker/database_migrations/14_create_daily_budget_settings.sql`:

```sql
-- Migration: 14_create_daily_budget_settings.sql
-- Description: Create daily_budget_settings table for daily spending discipline calendar

create table if not exists public.daily_budget_settings (
    user_id uuid primary key references auth.users(id) on delete cascade,
    enabled boolean not null default true,
    daily_limit numeric not null default 150000,
    category_ids text[] not null default '{}',
    wallet_ids text[] not null default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.daily_budget_settings enable row level security;

-- Policy: Users can view and manage their own daily budget settings
create policy "Users can manage their own daily budget settings"
    on public.daily_budget_settings
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
```

- [ ] **Step 2: Verify file existence and syntax**

Verify that `14_create_daily_budget_settings.sql` exists and has valid SQL formatting.

- [ ] **Step 3: Commit migration**

```bash
git add yoogi-money-tracker/database_migrations/14_create_daily_budget_settings.sql
git commit -m "feat(db): add migration for daily_budget_settings table"
```

---

### Task 2: Service Layer for Daily Budget Settings

**Files:**
- Create: `yoogi-money-tracker/src/services/dailyBudgetService.js`
- Test: `yoogi-money-tracker/src/tests/dailyBudgetService.test.js`

- [ ] **Step 1: Write the failing test for dailyBudgetService**

Create `yoogi-money-tracker/src/tests/dailyBudgetService.test.js`:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { fetchDailyBudgetSettings, saveDailyBudgetSettings } from '../services/dailyBudgetService';

describe('dailyBudgetService', () => {
    it('returns default fallback settings if no record found', async () => {
        const mockSupabase = {
            from: () => ({
                select: () => ({
                    eq: () => ({
                        maybeSingle: () => Promise.resolve({ data: null, error: null })
                    })
                })
            })
        };
        const settings = await fetchDailyBudgetSettings('user-123', mockSupabase);
        expect(settings.daily_limit).toBe(150000);
        expect(settings.enabled).toBe(true);
        expect(settings.category_ids).toEqual([]);
    });

    it('formats save payload correctly with updated_at timestamp', async () => {
        let upsertedData = null;
        const mockSupabase = {
            from: () => ({
                upsert: (payload) => {
                    upsertedData = payload;
                    return Promise.resolve({ error: null });
                }
            })
        };
        await saveDailyBudgetSettings('user-123', {
            daily_limit: 200000,
            category_ids: ['cat-1', 'cat-2'],
            wallet_ids: []
        }, mockSupabase);

        expect(upsertedData.user_id).toBe('user-123');
        expect(upsertedData.daily_limit).toBe(200000);
        expect(upsertedData.category_ids).toEqual(['cat-1', 'cat-2']);
        expect(upsertedData.updated_at).toBeDefined();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd --prefix yoogi-money-tracker test -- src/tests/dailyBudgetService.test.js`
Expected: FAIL with "fetchDailyBudgetSettings is not defined".

- [ ] **Step 3: Implement dailyBudgetService**

Create `yoogi-money-tracker/src/services/dailyBudgetService.js`:

```javascript
import { supabase } from '../config/supabase';

const DEFAULT_SETTINGS = {
    enabled: true,
    daily_limit: 150000,
    category_ids: [],
    wallet_ids: []
};

export const fetchDailyBudgetSettings = async (userId, client = supabase) => {
    if (!userId) return DEFAULT_SETTINGS;
    try {
        const { data, error } = await client
            .from('daily_budget_settings')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.error('Lỗi tải daily_budget_settings:', error);
            return DEFAULT_SETTINGS;
        }

        if (!data) return DEFAULT_SETTINGS;

        return {
            enabled: data.enabled ?? true,
            daily_limit: Number(data.daily_limit) || 150000,
            category_ids: Array.isArray(data.category_ids) ? data.category_ids : [],
            wallet_ids: Array.isArray(data.wallet_ids) ? data.wallet_ids : []
        };
    } catch (err) {
        console.error('Lỗi fetchDailyBudgetSettings:', err);
        return DEFAULT_SETTINGS;
    }
};

export const saveDailyBudgetSettings = async (userId, settings, client = supabase) => {
    if (!userId) throw new Error('Yêu cầu userId để lưu cấu hình');
    const payload = {
        user_id: userId,
        enabled: settings.enabled ?? true,
        daily_limit: Number(settings.daily_limit) || 150000,
        category_ids: Array.isArray(settings.category_ids) ? settings.category_ids : [],
        wallet_ids: Array.isArray(settings.wallet_ids) ? settings.wallet_ids : [],
        updated_at: new Date().toISOString()
    };

    const { error } = await client
        .from('daily_budget_settings')
        .upsert(payload);

    if (error) throw error;

    // Trigger auto-backup mutation event (Yoogi Constitution 07)
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('supabase_mutate', { detail: 'daily_budget_settings' }));
    }

    return payload;
};

export const subscribeDailyBudgetSettings = (userId, onUpdate, client = supabase) => {
    if (!userId) return () => {};
    const channel = client
        .channel(`daily_budget_settings:${userId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'daily_budget_settings',
                filter: `user_id=eq.${userId}`
            },
            (payload) => {
                if (payload.new) {
                    onUpdate({
                        enabled: payload.new.enabled ?? true,
                        daily_limit: Number(payload.new.daily_limit) || 150000,
                        category_ids: Array.isArray(payload.new.category_ids) ? payload.new.category_ids : [],
                        wallet_ids: Array.isArray(payload.new.wallet_ids) ? payload.new.wallet_ids : []
                    });
                }
            }
        )
        .subscribe();

    return () => {
        client.removeChannel(channel);
    };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd --prefix yoogi-money-tracker test -- src/tests/dailyBudgetService.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add yoogi-money-tracker/src/services/dailyBudgetService.js yoogi-money-tracker/src/tests/dailyBudgetService.test.js
git commit -m "feat: implement dailyBudgetService with tests"
```

---

### Task 3: Calculation Engine Hook (`useDailyDiscipline`)

**Files:**
- Create: `yoogi-money-tracker/src/hooks/useDailyDiscipline.js`
- Test: `yoogi-money-tracker/src/tests/useDailyDiscipline.test.js`

- [ ] **Step 1: Write the failing unit tests for discipline calculations**

Create `yoogi-money-tracker/src/tests/useDailyDiscipline.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { calculateDailyDiscipline, getLocalDateStr } from '../hooks/useDailyDiscipline';

describe('calculateDailyDiscipline logic', () => {
    const config = {
        enabled: true,
        daily_limit: 150000,
        category_ids: ['cat_food', 'cat_cafe'],
        wallet_ids: []
    };

    const sampleTransactions = [
        // Day 1: 120k in tracked categories -> Pass (test ISO string format)
        { id: '1', date: '2026-11-01T07:30:00.000Z', amount: 80000, type: 'expense', categoryId: 'cat_food' },
        { id: '2', date: '2026-11-01T12:00:00.000Z', amount: 40000, type: 'expense', categoryId: 'cat_cafe' },
        // Day 1: 1.5M electricity bill -> Ignored
        { id: '3', date: '2026-11-01T14:00:00.000Z', amount: 1500000, type: 'expense', categoryId: 'cat_bills' },
        // Day 2: 195k in food -> Fail (over by 45k)
        { id: '4', date: '2026-11-02T08:00:00.000Z', amount: 195000, type: 'expense', categoryId: 'cat_food' },
        // Day 3: 0 spend in food/cafe -> No spend (Star)
    ];

    it('correctly filters tracked categories and ignores untracked expenses', () => {
        const result = calculateDailyDiscipline({
            transactions: sampleTransactions,
            categories: [],
            config,
            selectedMonth: '2026-11',
            currentDateStr: '2026-11-10' // Day 10 of current month
        });

        const day1 = result.calendarDays.find(d => d.dateStr === '2026-11-01');
        const day2 = result.calendarDays.find(d => d.dateStr === '2026-11-02');
        const day3 = result.calendarDays.find(d => d.dateStr === '2026-11-03');

        expect(day1.spent).toBe(120000);
        expect(day1.status).toBe('pass');
        expect(day2.spent).toBe(195000);
        expect(day2.status).toBe('fail');
        expect(day2.overAmount).toBe(45000);
        expect(day3.spent).toBe(0);
        expect(day3.status).toBe('no_spend');
    });

    it('handles future month without division by zero', () => {
        const result = calculateDailyDiscipline({
            transactions: sampleTransactions,
            categories: [],
            config,
            selectedMonth: '2026-12', // Future month
            currentDateStr: '2026-11-10'
        });

        expect(result.summary.isFutureMonth).toBe(true);
        expect(result.summary.successRate).toBe(0);
        expect(result.summary.elapsedDays).toBe(0);
        expect(result.calendarDays.every(d => d.status === 'future')).toBe(true);
    });

    it('identifies unconfigured state when category_ids is empty', () => {
        const result = calculateDailyDiscipline({
            transactions: sampleTransactions,
            categories: [],
            config: { ...config, category_ids: [] },
            selectedMonth: '2026-11',
            currentDateStr: '2026-11-10'
        });

        expect(result.isSetupRequired).toBe(true);
    });

    it('correctly extracts local date string from ISO or date string', () => {
        expect(getLocalDateStr('2026-11-01')).toBe('2026-11-01');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd --prefix yoogi-money-tracker test -- src/tests/useDailyDiscipline.test.js`
Expected: FAIL with "calculateDailyDiscipline is not defined".

- [ ] **Step 3: Implement `useDailyDiscipline.js` with local timezone normalization**

Create `yoogi-money-tracker/src/hooks/useDailyDiscipline.js`:

```javascript
import { useMemo } from 'react';

/**
 * Extracts local date string 'YYYY-MM-DD' from any date representation,
 * preventing UTC offset shifts.
 */
export const getLocalDateStr = (dateInput) => {
    if (!dateInput) return '';
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        return dateInput;
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput).slice(0, 10);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

export const calculateDailyDiscipline = ({
    transactions = [],
    categories = [],
    config = { enabled: true, daily_limit: 150000, category_ids: [], wallet_ids: [] },
    selectedMonth, // 'YYYY-MM'
    currentDateStr = getLocalDateStr(new Date()) // 'YYYY-MM-DD'
}) => {
    const isSetupRequired = !config.category_ids || config.category_ids.length === 0;

    const [year, month] = selectedMonth.split('-').map(Number);
    const totalDaysInMonth = new Date(year, month, 0).getDate();

    const currentMonthStr = currentDateStr.slice(0, 7);
    const isPastMonth = selectedMonth < currentMonthStr;
    const isCurrentMonth = selectedMonth === currentMonthStr;
    const isFutureMonth = selectedMonth > currentMonthStr;

    const currentDayNum = Number(currentDateStr.slice(8, 10));
    const elapsedDays = isPastMonth
        ? totalDaysInMonth
        : isCurrentMonth
        ? Math.min(currentDayNum, totalDaysInMonth)
        : 0;

    const remainingDays = Math.max(0, totalDaysInMonth - elapsedDays);

    // Group transactions by date using local date normalization
    const trackedTxByDate = {};
    const otherTxByDate = {};

    transactions.forEach(t => {
        if (!t.date) return;
        const localDate = getLocalDateStr(t.date);
        if (!localDate.startsWith(selectedMonth)) return;
        if (t.type !== 'expense') return;

        // Wallet filter if configured
        if (config.wallet_ids && config.wallet_ids.length > 0) {
            if (!config.wallet_ids.includes(t.walletId)) return;
        }

        const isTrackedCategory = !isSetupRequired && (
            (t.categoryId && config.category_ids.includes(t.categoryId)) ||
            (t.subcategoryId && config.category_ids.includes(t.subcategoryId))
        );

        if (isTrackedCategory) {
            if (!trackedTxByDate[localDate]) trackedTxByDate[localDate] = [];
            trackedTxByDate[localDate].push(t);
        } else {
            if (!otherTxByDate[localDate]) otherTxByDate[localDate] = [];
            otherTxByDate[localDate].push(t);
        }
    });

    const calendarDays = [];
    let passCount = 0;
    let failCount = 0;
    let mtdActualSpent = 0;

    for (let day = 1; day <= totalDaysInMonth; day++) {
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${selectedMonth}-${dayStr}`;
        const dayTrackedTx = trackedTxByDate[dateStr] || [];
        const dayOtherTx = otherTxByDate[dateStr] || [];
        const spent = dayTrackedTx.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

        let status = 'future';
        let overAmount = 0;

        if (isPastMonth || (isCurrentMonth && day <= currentDayNum)) {
            mtdActualSpent += spent;
            if (isSetupRequired) {
                status = 'unconfigured';
            } else if (spent === 0) {
                status = 'no_spend';
                passCount++;
            } else if (spent <= config.daily_limit) {
                status = 'pass';
                passCount++;
            } else {
                status = 'fail';
                overAmount = spent - config.daily_limit;
                failCount++;
            }
        }

        calendarDays.push({
            day,
            dateStr,
            spent,
            overAmount,
            status,
            trackedTransactions: dayTrackedTx,
            otherTransactions: dayOtherTx
        });
    }

    const successRate = elapsedDays > 0 ? Math.round((passCount / elapsedDays) * 100) : 0;
    const mtdExpected = elapsedDays * (Number(config.daily_limit) || 150000);
    const diff = mtdExpected - mtdActualSpent; // >= 0: saving, < 0: over budget

    const totalMonthBudget = totalDaysInMonth * (Number(config.daily_limit) || 150000);
    const remainingBudget = Math.max(0, totalMonthBudget - mtdActualSpent);
    const dailySuggested = remainingDays > 0 ? Math.round(remainingBudget / remainingDays) : 0;

    return {
        isSetupRequired,
        calendarDays,
        summary: {
            isPastMonth,
            isCurrentMonth,
            isFutureMonth,
            totalDaysInMonth,
            elapsedDays,
            remainingDays,
            passCount,
            failCount,
            successRate,
            mtdExpected,
            mtdActualSpent,
            diff,
            totalMonthBudget,
            remainingBudget,
            dailySuggested
        }
    };
};

export const useDailyDiscipline = ({
    transactions = [],
    categories = [],
    config,
    selectedMonth
}) => {
    return useMemo(() => {
        return calculateDailyDiscipline({
            transactions,
            categories,
            config,
            selectedMonth
        });
    }, [transactions, categories, config, selectedMonth]);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd --prefix yoogi-money-tracker test -- src/tests/useDailyDiscipline.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add yoogi-money-tracker/src/hooks/useDailyDiscipline.js yoogi-money-tracker/src/tests/useDailyDiscipline.test.js
git commit -m "feat: implement useDailyDiscipline hook with local date normalization and tests"
```

---

### Task 4: UI Components - Header & Monthly Summary Card

**Files:**
- Create: `yoogi-money-tracker/src/components/daily-discipline/DailyDisciplineHeader.jsx`
- Create: `yoogi-money-tracker/src/components/daily-discipline/MonthlySummaryCard.jsx`

- [ ] **Step 1: Implement `DailyDisciplineHeader.jsx`**

Create `yoogi-money-tracker/src/components/daily-discipline/DailyDisciplineHeader.jsx`:
- Includes Month selector (`< Tháng MM/YYYY >`) with Previous / Next buttons.
- Today button to jump to current month.
- Settings button (with gear icon) to open `DailyBudgetConfigModal`.
- Daily limit badge (e.g., `Mục tiêu: 150.000 đ/ngày`).

- [ ] **Step 2: Implement `MonthlySummaryCard.jsx`**

Create `yoogi-money-tracker/src/components/daily-discipline/MonthlySummaryCard.jsx`:
- If `isSetupRequired`: Displays banner prompting user to pick tracked categories with "Thiết lập ngay" button.
- 3 KPI stat boxes:
  - Hoàn thành: `${passCount} ngày` (Green)
  - Thất bại: `${failCount} ngày` (Rose/Red)
  - Tỷ lệ kỷ luật: `${successRate}%` (Blue; shows "Chưa bắt đầu" if `isFutureMonth`)
- Month-to-date comparison bar:
  - Đã tiêu: formatCurrency(mtdActualSpent) vs Kỳ vọng đến nay: formatCurrency(mtdExpected).
  - Progress bar width: `Math.min(100, (mtdActualSpent / (mtdExpected || 1)) * 100)%`.
  - Color badge: Green if `diff >= 0` ("Tiết kiệm hơn kỳ vọng: +..."), Red if `diff < 0` ("Vượt kỳ vọng: -...").
- Remaining allowance indicator: `${remainingBudget} (Còn lại ${remainingDays} ngày, TB: ${dailySuggested}/ngày)`.

- [ ] **Step 3: Commit header and summary components**

```bash
git add yoogi-money-tracker/src/components/daily-discipline/DailyDisciplineHeader.jsx yoogi-money-tracker/src/components/daily-discipline/MonthlySummaryCard.jsx
git commit -m "feat: add DailyDisciplineHeader and MonthlySummaryCard components"
```

---

### Task 5: UI Components - Calendar Grid & Day Cell Items

**Files:**
- Create: `yoogi-money-tracker/src/components/daily-discipline/DayCellItem.jsx`
- Create: `yoogi-money-tracker/src/components/daily-discipline/DisciplineCalendarGrid.jsx`

- [ ] **Step 1: Implement `DayCellItem.jsx`**

Create `yoogi-money-tracker/src/components/daily-discipline/DayCellItem.jsx`:
- Displays day number.
- Displays amount spent (e.g. `120k`, `195k`, `0k`, `--`).
- Badge status:
  - `pass`: Green border & badge `✓ Đạt`
  - `fail`: Red border & badge `✕ Vượt ${formatOver(overAmount)}`
  - `no_spend`: Emerald border with ⭐ `0k`
  - `future`: Neutral muted gray `--`
  - `unconfigured`: Neutral dashed gray
- Click handler triggers `onSelectDay(dayData)`.

- [ ] **Step 2: Implement `DisciplineCalendarGrid.jsx`**

Create `yoogi-money-tracker/src/components/daily-discipline/DisciplineCalendarGrid.jsx`:
- Calculates first day of week offset (Monday-based: T2, T3, T4, T5, T6, T7, CN).
- Renders empty placeholder cells for days before the 1st of the month.
- Renders 7-column responsive CSS grid (`grid grid-cols-7 gap-2 sm:gap-3`).
- Maps over `calendarDays` using `DayCellItem`.

- [ ] **Step 3: Commit grid and cell components**

```bash
git add yoogi-money-tracker/src/components/daily-discipline/DayCellItem.jsx yoogi-money-tracker/src/components/daily-discipline/DisciplineCalendarGrid.jsx
git commit -m "feat: add DisciplineCalendarGrid and DayCellItem components"
```

---

### Task 6: UI Modals - Day Details & Budget Configuration

**Files:**
- Create: `yoogi-money-tracker/src/components/daily-discipline/DayDetailsModal.jsx`
- Create: `yoogi-money-tracker/src/components/daily-discipline/DailyBudgetConfigModal.jsx`

- [ ] **Step 1: Implement `DayDetailsModal.jsx`**

Create `yoogi-money-tracker/src/components/daily-discipline/DayDetailsModal.jsx`:
- Modal overlay (`z-50`, backdrop blur, click backdrop to close).
- Header: Day date formatted, Pass/Fail status with amount vs daily limit.
- List of tracked transactions on that day (name, category, wallet, time, amount, action button to edit/delete).
- "+ Thêm giao dịch cho ngày này" button: triggers `onQuickAddTransaction({ date: selectedDay.dateStr, type: 'expense' })` so parent passes `initialData={{ date: selectedDay.dateStr, type: 'expense' }}` to `TransactionModal`.
- Collapsible section: "Khoản chi khác ngoài hạn mức trong ngày" (showing electricity, debts, etc. for complete visibility).

- [ ] **Step 2: Implement `DailyBudgetConfigModal.jsx`**

Create `yoogi-money-tracker/src/components/daily-discipline/DailyBudgetConfigModal.jsx`:
- Modal overlay (`z-50`).
- Input for `daily_limit` (numeric input with thousand separators).
- Category Multi-select list:
  - Grouped by parent categories and subcategories.
  - "Gợi ý tự động chọn ăn uống" button (auto-checks categories matching keywords `"ăn"`, `"uống"`, `"cà phê"`, `"cafe"`, `"ăn vặt"`).
- Wallet Filter (optional multi-select or "Tất cả các ví").
- Active toggle (`enabled`).
- Save button calling `saveDailyBudgetSettings` with success toast / feedback.

- [ ] **Step 3: Commit modals**

```bash
git add yoogi-money-tracker/src/components/daily-discipline/DayDetailsModal.jsx yoogi-money-tracker/src/components/daily-discipline/DailyBudgetConfigModal.jsx
git commit -m "feat: add DayDetailsModal and DailyBudgetConfigModal components"
```

---

### Task 7: Page Integration & Navigation Wiring

**Files:**
- Create: `yoogi-money-tracker/src/pages/DailyDisciplinePage.jsx`
- Modify: `yoogi-money-tracker/src/components/Layout.jsx`
- Modify: `yoogi-money-tracker/src/hooks/useAppData.js`
- Modify: `yoogi-money-tracker/src/App.jsx`

- [ ] **Step 1: Integrate daily budget settings into `useAppData.js`**

In `yoogi-money-tracker/src/hooks/useAppData.js`:
- Import `fetchDailyBudgetSettings`, `subscribeDailyBudgetSettings` from `../services/dailyBudgetService`.
- Add `dailyBudgetSettings` to state.
- In `useEffect`, fetch settings on mount and subscribe to realtime changes.
- Return `dailyBudgetSettings` and `setDailyBudgetSettings`.

- [ ] **Step 2: Create `DailyDisciplinePage.jsx`**

Create `yoogi-money-tracker/src/pages/DailyDisciplinePage.jsx`:
- Props contract: `{ user, transactions, categories, wallets, dailyBudgetSettings, onSaveSettings, onOpenAddTransaction }`.
- State for `selectedMonth` (defaults to current `YYYY-MM`).
- State for `selectedDay` (for `DayDetailsModal`).
- State for `isConfigOpen` (for `DailyBudgetConfigModal`).
- Invokes `useDailyDiscipline` with `transactions`, `categories`, `config = dailyBudgetSettings`, `selectedMonth`.
- Renders `DailyDisciplineHeader`, `MonthlySummaryCard`, `DisciplineCalendarGrid`.
- Wires modal open/close states.

- [ ] **Step 3: Update `Layout.jsx` Navigation Items**

In `yoogi-money-tracker/src/components/Layout.jsx`:
- Import `CalendarCheck` from `lucide-react`.
- Add `{ id: 'daily-discipline', label: 'Kỷ luật', icon: CalendarCheck }` to `NAV_ITEMS`.

- [ ] **Step 4: Update `App.jsx` Page Renderer & Quick Add Transaction**

In `yoogi-money-tracker/src/App.jsx`:
- Lazy load `DailyDisciplinePage`.
- In `renderPage()`, handle `activePage === 'daily-discipline'`:
  ```jsx
  else if (activePage === 'daily-discipline') {
      PageComponent = (
          <DailyDisciplinePage
              user={user}
              transactions={transactions}
              categories={categories}
              wallets={wallets}
              dailyBudgetSettings={dailyBudgetSettings}
              onSaveSettings={async (newSettings) => {
                  await saveDailyBudgetSettings(user.uid, newSettings);
              }}
              onOpenAddTransaction={(initialData) => {
                  setGlobalTransactionInitialData(initialData);
                  setIsGlobalTransactionOpen(true);
              }}
          />
      );
  }
  ```

- [ ] **Step 5: Commit wiring**

```bash
git add yoogi-money-tracker/src/pages/DailyDisciplinePage.jsx yoogi-money-tracker/src/components/Layout.jsx yoogi-money-tracker/src/hooks/useAppData.js yoogi-money-tracker/src/App.jsx
git commit -m "feat: wire DailyDisciplinePage into app navigation and state"
```

---

### Task 8: Verification, Test Suite & Build Check

**Files:**
- Verification only

- [ ] **Step 1: Run all Vitest test suites**

Run: `npm.cmd --prefix yoogi-money-tracker test`
Expected: All tests pass (including `wallet.test.js`, `dailyBudgetService.test.js`, `useDailyDiscipline.test.js`).

- [ ] **Step 2: Run Vite production build**

Run: `npm.cmd --prefix yoogi-money-tracker run build`
Expected: Build succeeds with 0 errors, generating dist bundle.

- [ ] **Step 3: Final Git Commit and Push**

```bash
git add .
git commit -m "feat: complete Daily Spending Discipline Calendar implementation"
git push
```

---
