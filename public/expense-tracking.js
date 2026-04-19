// ===== EXPENSE TRACKING MODULE (Hỗ trợ Dark Mode) =====

let currentWeekData = null;
let currentWeekOffset = 0; // 0 = tuần hiện tại, -1 = tuần trước, 1 = tuần sau
let expenseChart = null; // Biến lưu biểu đồ

// Khởi tạo Tracking Chi tiêu
function initExpenseTracking() {
    console.log('🚀 Khởi tạo module chi tiêu...');
    loadCurrentWeek();
    
    // Gán sự kiện cho các nút chuyển tuần
    const prevBtn = document.getElementById('prevWeekBtn');
    const nextBtn = document.getElementById('nextWeekBtn');
    
    if (prevBtn) prevBtn.onclick = () => changeWeek(-1);
    if (nextBtn) nextBtn.onclick = () => changeWeek(1);
    
    // Xử lý form nhập chi tiêu
    const expenseForm = document.getElementById('expenseForm');
    if (expenseForm) {
        const newForm = expenseForm.cloneNode(true);
        expenseForm.parentNode.replaceChild(newForm, expenseForm);
        newForm.addEventListener('submit', saveExpense);
    }
    
    // Kiểm tra nếu đang ở tab expenses thì load lại
    const expensesTab = document.getElementById('tab-expenses');
    if (expensesTab && expensesTab.classList.contains('active')) {
        loadCurrentWeek();
    }

    // === QUAN TRỌNG: LẮNG NGHE SỰ KIỆN ĐỔI DARK MODE ===
    // Khi bạn bấm nút Mặt trăng/Mặt trời, code này sẽ chạy để vẽ lại biểu đồ
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                console.log('🌓 Giao diện đã đổi, đang vẽ lại biểu đồ...');
                // Đợi 1 chút để CSS đổi màu nền xong rồi mới vẽ lại biểu đồ
                setTimeout(renderChart, 100);
            }
        });
    });
    
    // Bắt đầu theo dõi thẻ <html>
    observer.observe(document.documentElement, { attributes: true });
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getWeekDates(offset = 0) {
    const today = new Date();
    today.setDate(today.getDate() + (offset * 7));
    
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        dates.push(date);
    }
    return dates;
}

function changeWeek(direction) {
    currentWeekOffset += direction;
    loadCurrentWeek();
}

function loadCurrentWeek() {
    const dates = getWeekDates(currentWeekOffset);
    const weekNum = getWeekNumber(dates[0]);
    const year = dates[0].getFullYear();
    
    const weekTextEl = document.getElementById('currentWeekText');
    if (weekTextEl) {
        const startStr = `${dates[0].getDate()}/${dates[0].getMonth() + 1}`;
        const endStr = `${dates[6].getDate()}/${dates[6].getMonth() + 1}`;
        weekTextEl.innerHTML = `Tuần ${weekNum}, ${year}<br><span style="font-size:0.8rem; opacity:0.8">(${startStr} - ${endStr})</span>`;
    }
    
    const weekKey = `expenses_${year}_W${weekNum}`;
    const savedData = localStorage.getItem(weekKey);
    
    if (savedData) {
        currentWeekData = JSON.parse(savedData);
    } else {
        currentWeekData = {
            weekNum,
            year,
            budgetPlanned: 500000,
            expenses: {}
        };
    }
    
    renderBudgetSummary();
    renderDaysList(dates);
    renderInsights();
    renderChart(); // Vẽ biểu đồ
}

function renderBudgetSummary() {
    if (!currentWeekData) return;

    const planned = parseInt(currentWeekData.budgetPlanned) || 0;
    const actual = Object.values(currentWeekData.expenses).reduce((sum, exp) => sum + (parseInt(exp.amount) || 0), 0);
    const remaining = planned - actual;
    const percent = planned > 0 ? Math.min((actual / planned) * 100, 100) : (actual > 0 ? 100 : 0);
    
    const plannedEl = document.getElementById('budgetPlanned');
    const actualEl = document.getElementById('budgetActual');
    const remainingEl = document.getElementById('budgetRemaining');
    const progressEl = document.getElementById('budgetProgress');
    const percentEl = document.getElementById('budgetPercent');
    
    if (plannedEl) {
        plannedEl.innerHTML = `${formatMoney(planned)} <button onclick="editBudget()" style="border:none; background:rgba(255,255,255,0.2); border-radius:50%; width:24px; height:24px; cursor:pointer; color:white; font-size:0.8rem; vertical-align:middle;" title="Sửa ngân sách">✏️</button>`;
    }

    if (actualEl) actualEl.textContent = formatMoney(actual);
    if (remainingEl) remainingEl.textContent = formatMoney(remaining);
    
    if (progressEl) {
        progressEl.style.width = `${percent}%`;
        if (percent < 70) progressEl.style.background = 'linear-gradient(90deg, #10b981, #059669)';
        else if (percent < 90) progressEl.style.background = 'linear-gradient(90deg, #fbbf24, #f59e0b)';
        else progressEl.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
    }
    
    if (percentEl) percentEl.textContent = `${Math.round(percent)}%`;
    
    if (remainingEl) {
        if (remaining < 0) remainingEl.style.color = '#ef4444';
        else remainingEl.style.color = '#86efac';
    }
}

window.editBudget = function() {
    if (!currentWeekData) return;
    const currentBudget = currentWeekData.budgetPlanned;
    const newBudgetStr = prompt("Nhập ngân sách dự kiến cho tuần này (VNĐ):", currentBudget);
    
    if (newBudgetStr !== null) {
        const newBudget = parseInt(newBudgetStr.replace(/\D/g, ''));
        if (!isNaN(newBudget) && newBudget > 0) {
            currentWeekData.budgetPlanned = newBudget;
            saveCurrentData();
            loadCurrentWeek();
            if (typeof showToast === 'function') showToast('success', `Đã cập nhật ngân sách: ${formatMoney(newBudget)}`);
        } else {
            alert("Vui lòng nhập số tiền hợp lệ!");
        }
    }
}

function renderDaysList(dates) {
    const listEl = document.getElementById('daysList');
    if (!listEl) return;
    
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dailyPlanned = Math.round((currentWeekData.budgetPlanned || 0) / 7);
    
    listEl.innerHTML = dates.map((date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${d}`;
        
        const expense = currentWeekData.expenses[dateKey];
        const hasExpense = !!expense;
        const amount = expense ? parseInt(expense.amount) : 0;
        const dayName = dayNames[date.getDay()];
        const displayDate = `${d}/${m}`;
        
        const isToday = new Date().toDateString() === date.toDateString();
        const highlightStyle = isToday ? 'border: 2px solid var(--accent-primary);' : '';
        const todayBadge = isToday ? '<span style="font-size:0.7rem; background:var(--accent-primary); color:white; padding:2px 6px; border-radius:10px; margin-left:5px;">Hôm nay</span>' : '';

        return `
            <div class="day-item" style="${highlightStyle}">
                <div class="day-info">
                    <div class="day-name">${dayName} ${todayBadge}</div>
                    <div class="day-date">${displayDate}</div>
                    ${expense?.note ? `<div style="font-size:0.8rem; color:var(--text-secondary); margin-top:4px;">📝 ${expense.note}</div>` : ''}
                </div>
                <div class="day-amount">
                    <div class="amount-actual" style="color: ${hasExpense ? 'var(--text-primary)' : '#ccc'}">
                        ${hasExpense ? formatMoney(amount) : '0đ'}
                    </div>
                    <div class="amount-planned">Dự chi: ${formatMoney(dailyPlanned)}</div>
                </div>
                <div class="day-actions">
                    <button class="btn-day-action ${hasExpense ? 'entered' : 'empty'}" 
                            onclick="openExpenseModal('${dateKey}', ${amount}, '${expense?.note || ''}')">
                        ${hasExpense ? '✏️ Sửa' : '➕ Nhập'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== VẼ BIỂU ĐỒ THÔNG MINH (TỰ ĐỘNG THEO DARK MODE) =====
function renderChart() {
    const ctx = document.getElementById('expenseChart');
    if (!ctx || !currentWeekData) return;

    // 1. Kiểm tra xem đang ở chế độ Dark hay Light
    // Chúng ta kiểm tra thuộc tính data-theme trên thẻ html
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    
    // 2. Thiết lập màu sắc dựa trên chế độ
    // Nếu Dark Mode: Chữ màu trắng sáng (#e2e8f0), Lưới mờ
    // Nếu Light Mode: Chữ màu xanh đậm (#14532d), Lưới đậm hơn chút
    const textColor = isDarkMode ? '#e2e8f0' : '#14532d';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

    const dates = getWeekDates(currentWeekOffset);
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    
    const dataValues = dates.map(date => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${d}`;
        return currentWeekData.expenses[dateKey]?.amount || 0;
    });

    const labels = dates.map(date => {
        const dayName = dayNames[date.getDay()];
        return `${dayName} (${date.getDate()}/${date.getMonth() + 1})`;
    });

    // Hủy biểu đồ cũ nếu có để vẽ lại
    if (expenseChart) {
        expenseChart.destroy();
    }

    // Vẽ biểu đồ mới
    if (typeof Chart !== 'undefined') {
        expenseChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Chi tiêu (VNĐ)',
                    data: dataValues,
                    backgroundColor: dataValues.map(val => val > 200000 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(34, 197, 94, 0.8)'),
                    borderColor: dataValues.map(val => val > 200000 ? '#ef4444' : '#22c55e'),
                    borderWidth: 1,
                    borderRadius: 4,
                    barPercentage: 0.6 // Cột nhỏ gọn hơn
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: { 
                            color: textColor, // Màu chữ trục X thay đổi theo theme
                            font: { size: 11 }
                        },
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor, // Màu chữ trục Y thay đổi theo theme
                            callback: function(value) { 
                                // Rút gọn số tiền cho đỡ tốn chỗ (VD: 100k)
                                return (value / 1000) + 'k'; 
                            },
                            font: { size: 11 }
                        },
                        grid: { 
                            color: gridColor, // Màu lưới thay đổi theo theme
                            borderDash: [5, 5] 
                        },
                        border: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
                        titleColor: isDarkMode ? '#000' : '#fff',
                        bodyColor: isDarkMode ? '#000' : '#fff',
                        callbacks: {
                            label: function(context) { return formatMoney(context.raw); }
                        }
                    }
                }
            }
        });
    }
}

window.openExpenseModal = function(dateKey, amount, note) {
    const modal = document.getElementById('expenseModal');
    if (!modal) return;
    document.getElementById('expenseDate').value = dateKey;
    document.getElementById('expenseAmount').value = amount || '';
    document.getElementById('expenseNote').value = note || '';
    if (typeof openModal === 'function') openModal(modal);
    else modal.classList.add('active');
};

function saveExpense(e) {
    e.preventDefault();
    const dateKey = document.getElementById('expenseDate').value;
    const amount = parseInt(document.getElementById('expenseAmount').value) || 0;
    const note = document.getElementById('expenseNote').value.trim();
    
    if (!currentWeekData.expenses) currentWeekData.expenses = {};
    
    currentWeekData.expenses[dateKey] = {
        amount,
        note,
        timestamp: Date.now()
    };
    
    saveCurrentData();
    
    const modal = document.getElementById('expenseModal');
    if (typeof closeModal === 'function') closeModal(modal);
    else modal.classList.remove('active');
    
    loadCurrentWeek();
    if (typeof showToast === 'function') showToast('success', '✅ Đã lưu chi tiêu thành công!');
}

function saveCurrentData() {
    const weekKey = `expenses_${currentWeekData.year}_W${currentWeekData.weekNum}`;
    localStorage.setItem(weekKey, JSON.stringify(currentWeekData));
}

function renderInsights() {
    const card = document.getElementById('insightsCard');
    const list = document.getElementById('insightsList');
    if (!card || !list) return;

    const planned = currentWeekData.budgetPlanned;
    const actual = Object.values(currentWeekData.expenses).reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const percent = planned > 0 ? (actual / planned) * 100 : 0;
    
    let insightsHtml = '';
    
    if (percent > 100) {
        insightsHtml += `<div class="insight-item"><div class="insight-icon">🚨</div><div class="insight-text">Bạn đã vượt ngân sách <b>${formatMoney(actual - planned)}</b>.</div></div>`;
    } else if (percent > 80) {
        insightsHtml += `<div class="insight-item"><div class="insight-icon">⚠️</div><div class="insight-text">Bạn sắp hết ngân sách tuần này.</div></div>`;
    } else {
        insightsHtml += `<div class="insight-item"><div class="insight-icon">👍</div><div class="insight-text">Chi tiêu đang trong tầm kiểm soát.</div></div>`;
    }
    
    list.innerHTML = insightsHtml;
    card.style.display = insightsHtml ? 'block' : 'none';
}

function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

document.addEventListener('DOMContentLoaded', () => {
    initExpenseTracking();
});

document.addEventListener('tabChange', (e) => {
    if (e.detail && e.detail.to === 'expenses') {
        loadCurrentWeek();
    }
});