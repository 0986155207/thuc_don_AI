// ===== CẤU HÌNH & KHO DỮ LIỆU =====
const API_BASE_URL = '';
const API_CALL_DELAY = 3000;

// ===== localStorage HELPERS =====
const LS_FAVORITES = 'thucdon_favorites';
const LS_HISTORY = 'thucdon_history';
const LS_RECIPES = 'thucdon_recipes';

function lsGet(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function lsSet(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}
let lastAPICall = 0;
let recipeCache = {}; // 📦 Kho chứa an toàn cho mọi món ăn

// ===== HÀM ĐIỀU TIẾT API =====
async function throttleAPICall() {
    const now = Date.now();
    const diff = now - lastAPICall;
    if (diff < API_CALL_DELAY) {
        await new Promise(r => setTimeout(r, API_CALL_DELAY - diff));
    }
    lastAPICall = Date.now();
}

// ===== TRẠNG THÁI =====
const state = {
    currentTab: 'home',
    currentMenu: null,
    favorites: [],
    history: [],
    savedRecipes: [],
    currentViewingRecipe: null,
    theme: localStorage.getItem('theme') || 'light'
};

// ===== KHỞI ĐỘNG =====
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeEventListeners();
    loadFavorites();
    loadHistory();
    
    // Đăng ký PWA
    if ('serviceWorker' in navigator) {
        try { navigator.serviceWorker.register('./sw.js'); } catch (e) {}
    }
    
    // Banner cài đặt
    if (/Android|iPhone/i.test(navigator.userAgent)) setTimeout(showInstallBanner, 3000);
});

// ===== XỬ LÝ SỰ KIỆN =====
function initializeEventListeners() {
    // 1. Đổi giao diện
    const themeBtn = document.getElementById('themeToggle');
    if(themeBtn) themeBtn.onclick = () => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', state.theme);
        initializeTheme();
    };

    // 2. Chuyển Tab
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            
            const content = document.getElementById(`tab-${btn.dataset.tab}`);
            if(content) content.classList.add('active');
            
            if(btn.dataset.tab === 'favorites') displayFavorites();
            if(btn.dataset.tab === 'history') displayHistory();
        };
    });

    // 3. Nút chức năng chính
    const genBtn = document.getElementById('generateMenuBtn');
    if(genBtn) genBtn.onclick = generateWeeklyMenu;

    const analyzeBtn = document.getElementById('analyzeNutritionBtn');
    if(analyzeBtn) analyzeBtn.onclick = analyzeNutrition;

    const shopBtn = document.getElementById('viewShoppingListBtn');
    if(shopBtn) shopBtn.onclick = showShoppingList;

    // 4. Đóng Modal
    document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
        el.onclick = function() {
            const modal = this.closest('.modal');
            if(modal) modal.classList.remove('active');
        };
    });
}

function initializeTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
}

// ===== LOGIC TẠO THỰC ĐƠN =====
async function generateWeeklyMenu() {
    const loading = document.getElementById('loadingState');
    const menuSec = document.getElementById('menuSection');
    if(loading) loading.style.display = 'block';
    if(menuSec) menuSec.style.display = 'none';

    try {
        await throttleAPICall();
        const res = await fetch('/api/generate-weekly-menu', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                familySize: document.getElementById('familySize').value,
                budget: document.getElementById('budget').value,
                preferences: document.getElementById('preferences').value,
                dietaryRestrictions: document.getElementById('dietaryRestrictions').value
            })
        });
        
        const data = await res.json();
        if (data.success) {
            state.currentMenu = data.data;
            displayWeeklyMenu(data.data);
            showToast('success', '🎉 Đã tạo xong thực đơn!');
            // Lưu lịch sử vào localStorage
            const history = lsGet(LS_HISTORY);
            history.unshift({ id: Date.now().toString(), createdAt: new Date().toISOString(), menu: data.data });
            if (history.length > 20) history.splice(20);
            lsSet(LS_HISTORY, history);
            state.history = history;
        } else throw new Error(data.error);
    } catch (e) {
        showToast('error', 'Lỗi: ' + e.message);
    } finally {
        if(loading) loading.style.display = 'none';
    }
}

function displayWeeklyMenu(menuData) {
    const container = document.getElementById('daysContainer');
    const summary = document.getElementById('weekSummary');
    const section = document.getElementById('menuSection');
    if(!container) return;

    if(summary && menuData.weekSummary) {
        summary.innerHTML = `
            <div class="summary-grid">
                <div class="summary-item"><strong>💰 Tổng tiền:</strong> ${formatCurrency(menuData.weekSummary.totalCost)}</div>
                <div class="summary-item"><strong>🔥 Calo/ngày:</strong> ${menuData.weekSummary.avgCaloriesPerDay}</div>
                <div class="summary-item"><strong⚖️ Dinh dưỡng:</strong> ${menuData.weekSummary.nutritionBalance}</div>
            </div>`;
    }

    container.innerHTML = menuData.weekMenu.map(day => `
        <div class="day-card">
            <div class="day-header">
                <h3>${day.day}</h3>
                <small>${formatCurrency(day.totalCost)} - ${day.totalCalories} kcal</small>
            </div>
            <div class="meals-grid">
                ${createMealHTML(day.meals.breakfast, 'Sáng')}
                ${createMealHTML(day.meals.lunch, 'Trưa')}
                ${createMealHTML(day.meals.dinner, 'Tối')}
            </div>
        </div>
    `).join('');
    
    if(section) {
        section.style.display = 'block';
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// 🔥 HÀM QUAN TRỌNG: TẠO HTML VỚI ID AN TOÀN
function createMealHTML(meal, type) {
    const id = 'meal_' + Math.random().toString(36).substr(2, 9);
    recipeCache[id] = meal; // Lưu vào kho
    return `
        <div class="meal-card">
            <span class="meal-type">${type}</span>
            <h4>${meal.name}</h4>
            <p>${meal.description}</p>
            <div class="meal-stats">
                <small>🔥 ${meal.calories}kcal</small> • 
                <small>💰 ${formatCurrency(meal.estimatedCost)}</small>
            </div>
            <div class="meal-actions">
                <button class="btn btn-primary" onclick="viewRecipe('${id}')">📖 Công thức</button>
                <button class="btn btn-secondary" onclick="generateDishImage('${id}')">🖼️ Ảnh</button>
                <button class="btn btn-success" onclick="saveFavorite('${id}')">❤️ Lưu</button>
                <button class="btn btn-secondary" onclick="adjustServings('${id}')">⚖️</button>
            </div>
        </div>
    `;
}

// ===== TÍNH NĂNG 1: XEM CÔNG THỨC =====
window.viewRecipe = async function(id) {
    const meal = recipeCache[id] || state.favorites.find(f => f.id === id); 
    if(!meal) return showToast('error', 'Không tìm thấy món ăn');

    const modal = document.getElementById('recipeModal');
    const body = document.getElementById('recipeModalBody');
    if(modal) modal.classList.add('active');
    if(body) body.innerHTML = '<div class="loader"></div> Đang tải công thức...';

    try {
        await throttleAPICall();
        const res = await fetch('/api/generate-recipe', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ dishName: meal.name, servings: meal.servings || 4 })
        });
        const data = await res.json();
        
        if(data.success) {
            state.currentViewingRecipe = data.data; 
            displayRecipeModal(data.data);
        }
    } catch (e) {
        if(body) body.innerHTML = 'Lỗi: ' + e.message;
    }
};

function displayRecipeModal(recipe) {
    const body = document.getElementById('recipeModalBody');
    if(!body) return;
    
    body.innerHTML = `
        <h2>${recipe.dishName}</h2>
        <div class="meal-stats" style="display:flex; gap:15px; margin:15px 0; background:var(--bg-tertiary); padding:10px; border-radius:8px;">
            <span>⏱️ ${recipe.prepTime}</span>
            <span>🔥 ${recipe.cookTime}</span>
            <span>👥 ${recipe.servings} người</span>
        </div>
        
        <h3>🥘 Nguyên liệu</h3>
        <ul class="ingredients-list">
            ${recipe.ingredients.map(i => `<li><strong>${i.name}</strong>: ${i.amount}</li>`).join('')}
        </ul>
        
        <h3>👨‍🍳 Cách làm</h3>
        <ol class="recipe-steps">
            ${recipe.cookingSteps.map(s => `<li>${s.description}</li>`).join('')}
        </ol>
        
        <div style="margin-top:20px; display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap;">
            <button class="btn btn-secondary" onclick="printRecipe()">🖨️ In</button>
            <button class="btn btn-success" onclick="saveCurrentRecipe()">💾 Lưu Sổ Tay</button>
            <button class="btn btn-secondary" onclick="document.getElementById('recipeModal').classList.remove('active')">Đóng</button>
        </div>
    `;
}

// ===== TÍNH NĂNG 2: ẢNH MÓN ĂN =====
window.generateDishImage = async function(id) {
    const meal = recipeCache[id];
    if(!meal) return;
    
    const modal = document.getElementById('dishModal');
    const body = document.getElementById('dishModalBody');
    if(modal) modal.classList.add('active');
    if(body) body.innerHTML = '<div class="loader"></div> Đang tìm ảnh...';

    try {
        await throttleAPICall();
        const res = await fetch('/api/generate-dish-image', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ dishName: meal.name, description: meal.description })
        });
        const data = await res.json();
        if(data.success) {
            const imgUrl = data.data.imageSources?.[0]?.url || data.data.placeholderImage;
            body.innerHTML = `
                <h2>🖼️ ${meal.name}</h2>
                <img src="${imgUrl}" style="width:100%; border-radius:10px; margin:10px 0;">
                <p>${data.data.imageDescription}</p>
                <button class="btn btn-secondary" style="width:100%" onclick="document.getElementById('dishModal').classList.remove('active')">Đóng</button>
            `;
        }
    } catch (e) {
        if(body) body.innerHTML = 'Không tìm thấy ảnh.';
    }
};

// ===== TÍNH NĂNG 3: YÊU THÍCH & SỔ TAY =====
window.saveFavorite = function(id) {
    const meal = recipeCache[id];
    if(!meal) return;
    const favorites = lsGet(LS_FAVORITES);
    if(favorites.some(f => f.name === meal.name)) return showToast('warning', 'Đã có trong danh sách yêu thích!');
    const newFav = { id: Date.now().toString(), ...meal, savedAt: new Date().toISOString() };
    favorites.push(newFav);
    lsSet(LS_FAVORITES, favorites);
    state.favorites = favorites;
    showToast('success', '❤️ Đã thêm vào Yêu thích!');
};

window.saveCurrentRecipe = function() {
    if(!state.currentViewingRecipe) return;
    const recipes = lsGet(LS_RECIPES);
    if(recipes.some(r => r.dishName === state.currentViewingRecipe.dishName)) return showToast('warning', 'Công thức này đã được lưu rồi!');
    const newRecipe = { id: Date.now().toString(), ...state.currentViewingRecipe, savedAt: new Date().toISOString() };
    recipes.unshift(newRecipe);
    lsSet(LS_RECIPES, recipes);
    state.savedRecipes = recipes;
    showToast('success', '💾 Đã lưu vào Sổ tay!');
};

function loadFavorites() {
    state.favorites = lsGet(LS_FAVORITES);
    state.savedRecipes = lsGet(LS_RECIPES);
}

function displayFavorites() {
    const grid = document.getElementById('favoritesGrid');
    if(!grid) return;
    
    let html = '';
    // Sổ tay
    if(state.savedRecipes.length > 0) {
        html += `<h3>📚 Sổ tay (${state.savedRecipes.length})</h3>`;
        state.savedRecipes.forEach(r => recipeCache[r.id] = r); 
        html += state.savedRecipes.map(r => `
            <div class="favorite-card" style="border:2px solid var(--accent-success)">
                <h4>${r.dishName}</h4>
                <div style="margin-bottom:10px">👥 ${r.servings} người</div>
                <button class="btn btn-success" onclick="viewRecipe('${r.id}')">Xem lại</button>
                <button class="btn btn-danger" onclick="deleteSavedRecipe('${r.id}')">🗑️</button>
            </div>
        `).join('');
    }
    // Yêu thích
    if(state.favorites.length > 0) {
        html += `<h3 style="margin-top:20px">❤️ Đã thích (${state.favorites.length})</h3>`;
        state.favorites.forEach(f => recipeCache[f.id] = f);
        html += state.favorites.map(f => `
            <div class="favorite-card">
                <h4>${f.name}</h4>
                <button class="btn btn-primary" onclick="viewRecipe('${f.id}')">Tạo công thức</button>
                <button class="btn btn-danger" onclick="removeFavorite('${f.id}')">🗑️</button>
            </div>
        `).join('');
    }
    grid.innerHTML = html || '<div class="empty-state"><p>Chưa có món nào.</p></div>';
}

window.deleteSavedRecipe = function(id) {
    if(!confirm('Xóa công thức này?')) return;
    const recipes = lsGet(LS_RECIPES).filter(r => r.id !== id);
    lsSet(LS_RECIPES, recipes);
    state.savedRecipes = recipes;
    displayFavorites();
};

window.removeFavorite = function(id) {
    if(!confirm('Xóa món này?')) return;
    const favorites = lsGet(LS_FAVORITES).filter(f => f.id !== id);
    lsSet(LS_FAVORITES, favorites);
    state.favorites = favorites;
    displayFavorites();
};

// ===== TÍNH NĂNG 4: DANH SÁCH MUA SẮM =====
window.showShoppingList = function() {
    if (!state.currentMenu?.shoppingList) return showToast('warning', 'Chưa có thực đơn!');
    
    const modal = document.getElementById('shoppingModal');
    const body = document.getElementById('shoppingModalBody');
    if(!modal) return;
    
    const list = state.currentMenu.shoppingList;
    body.innerHTML = `
        <h2>🛒 Danh sách đi chợ</h2>
        ${Object.entries(list).map(([cat, items]) => `
            <div style="margin-bottom:15px">
                <h3 style="text-transform:capitalize; border-bottom:1px solid #eee">${cat}</h3>
                <ul style="list-style:none; padding:0">
                    ${items.map(i => `<li style="padding:5px 0"><input type="checkbox"> ${i}</li>`).join('')}
                </ul>
            </div>
        `).join('')}
        <div style="margin-top:20px; display:flex; gap:10px">
            <button class="btn btn-primary" style="flex:1" onclick="copyShoppingList()">📋 Copy Zalo</button>
            <button class="btn btn-secondary" style="flex:1" onclick="window.print()">🖨️ In</button>
            <button class="btn btn-secondary" onclick="document.getElementById('shoppingModal').classList.remove('active')">Đóng</button>
        </div>
    `;
    modal.classList.add('active');
};

window.copyShoppingList = function() {
    const list = state.currentMenu.shoppingList;
    let txt = "🛒 DANH SÁCH MUA SẮM:\n";
    if(list.proteins) txt += "THỊT/CÁ: " + list.proteins.join(", ") + "\n";
    if(list.vegetables) txt += "RAU: " + list.vegetables.join(", ") + "\n";
    if(list.others) txt += "KHÁC: " + list.others.join(", ") + "\n";
    
    navigator.clipboard.writeText(txt).then(() => showToast('success', 'Đã copy! Dán vào Zalo nhé.'));
};

// ===== TÍNH NĂNG 5: PHÂN TÍCH DINH DƯỠNG =====
window.analyzeNutrition = async function() {
    if (!state.currentMenu) return showToast('warning', 'Chưa có thực đơn!');
    
    const modal = document.getElementById('nutritionModal');
    const body = document.getElementById('nutritionModalBody');
    if(modal) modal.classList.add('active');
    if(body) body.innerHTML = '<div class="loader"></div> Đang phân tích...';

    try {
        const res = await fetch('/api/nutrition-analysis', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ weekMenu: state.currentMenu.weekMenu })
        });
        const data = await res.json();
        if(data.success) {
            const a = data.data;
            body.innerHTML = `
                <h2>📊 Điểm số: ${a.overallScore}/100</h2>
                ${Object.entries(a.analysis).map(([k, v]) => `
                    <div style="margin:10px 0; padding:10px; background:var(--bg-tertiary); border-radius:8px">
                        <strong>${k.toUpperCase()}:</strong> ${v.status}
                        <p style="margin:0; font-size:0.9em">${v.recommendation}</p>
                    </div>
                `).join('')}
                <button class="btn btn-secondary" style="width:100%; margin-top:10px" onclick="document.getElementById('nutritionModal').classList.remove('active')">Đóng</button>
            `;
        }
    } catch (e) {
        if(body) body.innerHTML = 'Lỗi phân tích: ' + e.message;
    }
};

// ===== TÍNH NĂNG 6: LỊCH SỬ =====
function loadHistory() {
    state.history = lsGet(LS_HISTORY);
}

function displayHistory() {
    const list = document.getElementById('historyList');
    if(!list) return;
    
    if(state.history.length === 0) return list.innerHTML = '<div class="empty-state"><p>Chưa có lịch sử.</p></div>';
    
    // Lưu menu vào cache để dùng lại khi click
    state.history.forEach((h, index) => {
        const historyId = 'hist_' + index;
        recipeCache[historyId] = h.menu;
    });

    list.innerHTML = state.history.map((h, index) => `
        <div class="history-card" onclick="loadHistoryMenu('hist_${index}')">
            <div class="history-header"><strong>📅 ${new Date(h.createdAt).toLocaleDateString('vi-VN')}</strong></div>
            <div>💰 ${formatCurrency(h.menu.weekSummary?.totalCost || 0)}</div>
        </div>
    `).join('');
}

window.loadHistoryMenu = function(id) {
    const menu = recipeCache[id];
    if(menu) {
        state.currentMenu = menu;
        document.querySelector('[data-tab="home"]').click(); // Chuyển về tab Home
        displayWeeklyMenu(menu);
        showToast('success', 'Đã tải lại menu cũ!');
    }
};

// ===== TIỆN ÍCH KHÁC =====
window.adjustServings = function(id) {
    const meal = recipeCache[id];
    if(!meal) return;
    const newSize = prompt(`Chỉnh khẩu phần cho "${meal.name}" (Hiện tại: ${meal.servings} người):`, meal.servings);
    if(newSize && newSize != meal.servings) {
        showToast('info', 'Đã ghi nhận! (Tính năng đang cập nhật logic API)');
    }
};

window.printRecipe = function() {
    const content = document.getElementById('recipeModalBody').innerHTML;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.write('<html><head><title>IN</title><style>body{font-family:sans-serif} button{display:none}</style></head><body>' + content + '</body></html>');
    doc.close();
    iframe.contentWindow.print();
    setTimeout(() => iframe.remove(), 1000);
};

function formatCurrency(n) {
    return new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(n);
}

function showToast(type, msg) {
    const box = document.getElementById('toastContainer');
    if(box) {
        const t = document.createElement('div');
        t.className = `toast toast-${type}`;
        t.innerText = (type=='success'?'✅ ':type=='error'?'❌ ':'⚠️ ') + msg;
        box.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }
}

function showInstallBanner() {
    if(document.getElementById('install-banner')) return;
    const b = document.createElement('div');
    b.id = 'install-banner';
    b.className = 'install-banner';
    b.innerHTML = `
        <div style="padding:15px; display:flex; justify-content:space-between; align-items:center;">
            <div><strong>📱 Cài đặt App</strong><br><small>Thêm vào màn hình chính</small></div>
            <button onclick="this.parentElement.parentElement.remove()" style="border:none;background:none;font-size:1.5rem">✖</button>
        </div>`;
    document.body.appendChild(b);
}