
    // ===== CONFIGURATION =====
const API_BASE_URL = ''; // Để trống vì chạy cùng server
const API_CALL_DELAY = 3000; // Giới hạn gọi API (3 giây/lần)
let lastAPICall = 0;

// ===== API THROTTLING (Hàm điều tiết gọi API) =====
async function throttleAPICall() {
    const now = Date.now();
    const timeSinceLastCall = now - lastAPICall;
    
    if (timeSinceLastCall < API_CALL_DELAY) {
        const waitTime = API_CALL_DELAY - timeSinceLastCall;
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    lastAPICall = Date.now();
}

// ===== STATE MANAGEMENT =====
const state = {
    currentTab: 'home',
    currentMenu: null,
    favorites: [],
    history: [],
    currentViewingRecipe: null, // <--- Thêm dòng này
    savedRecipes: [],            // <--- Thêm dòng này
    theme: localStorage.getItem('theme') || 'light'
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeEventListeners();
    loadFavorites();
    loadHistory();
    registerServiceWorker();
    checkForUpdates();
    handleInstallPrompt();
});

// ===== PWA SERVICE WORKER =====
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('✅ Service Worker registered:', registration.scope);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showToast('info', '🔄 Có phiên bản mới! Tải lại trang để cập nhật.');
                        }
                    });
                });
            })
            .catch((error) => {
                console.log('❌ Service Worker registration failed:', error);
            });
    }
}

function checkForUpdates() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
    }
}

// ===== PWA INSTALL PROMPT =====
let deferredPrompt;

function handleInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallBanner();
    });
    
    window.addEventListener('appinstalled', () => {
        console.log('✅ PWA installed successfully');
        showToast('success', '🎉 Đã cài đặt ứng dụng thành công!');
        deferredPrompt = null;
        hideInstallBanner();
    });
}

function showInstallBanner() {
    // Only show on mobile devices
    if (!/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        return;
    }
    
    const banner = document.createElement('div');
    banner.id = 'install-banner';
    banner.className = 'install-banner';
    banner.innerHTML = `
        <div class="install-banner-content">
            <div class="install-banner-icon">🌱</div>
            <div class="install-banner-text">
                <strong>Cài đặt ứng dụng</strong>
                <p>Thêm vào màn hình chính để truy cập nhanh</p>
            </div>
            <button class="btn btn-primary btn-install" id="installBtn">Cài đặt</button>
            <button class="btn-close-banner" id="closeBannerBtn">×</button>
        </div>
    `;
    
    document.body.appendChild(banner);
    
    document.getElementById('installBtn').addEventListener('click', installApp);
    document.getElementById('closeBannerBtn').addEventListener('click', hideInstallBanner);
    
    // Auto hide after 30 seconds
    setTimeout(hideInstallBanner, 30000);
}

function hideInstallBanner() {
    const banner = document.getElementById('install-banner');
    if (banner) {
        banner.style.animation = 'slideDown 0.3s ease-out';
        setTimeout(() => banner.remove(), 300);
    }
}

async function installApp() {
    if (!deferredPrompt) {
        // iOS instructions
        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            showIOSInstallInstructions();
        }
        return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        console.log('User accepted installation');
    } else {
        console.log('User dismissed installation');
    }
    
    deferredPrompt = null;
    hideInstallBanner();
}

function showIOSInstallInstructions() {
    const modal = document.getElementById('dishModal');
    const modalBody = document.getElementById('dishModalBody');
    
    modalBody.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <h2 style="margin-bottom: 1.5rem;">📱 Cài đặt trên iOS</h2>
            <div style="text-align: left; max-width: 400px; margin: 0 auto;">
                <p style="margin-bottom: 1rem;"><strong>Bước 1:</strong> Nhấn nút <strong>Chia sẻ</strong> (⎙) ở dưới cùng</p>
                <p style="margin-bottom: 1rem;"><strong>Bước 2:</strong> Cuộn xuống và chọn <strong>"Thêm vào Màn hình chính"</strong></p>
                <p style="margin-bottom: 1rem;"><strong>Bước 3:</strong> Nhấn <strong>"Thêm"</strong> ở góc trên bên phải</p>
            </div>
            <div style="margin-top: 2rem; padding: 1rem; background: var(--bg-tertiary); border-radius: var(--radius-lg);">
                <p style="font-size: 0.9rem; color: var(--text-secondary);">
                    💡 Sau khi thêm, bạn có thể mở ứng dụng từ màn hình chính như một app thật!
                </p>
            </div>
            <button class="btn btn-primary" onclick="closeModal(document.getElementById('dishModal'))" style="margin-top: 2rem;">
                Đã hiểu
            </button>
        </div>
    `;
    
    openModal(modal);
}

// ===== THEME MANAGEMENT =====
function initializeTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    updateThemeIcon();
}

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', state.theme);
    document.documentElement.setAttribute('data-theme', state.theme);
    updateThemeIcon();
    showToast('success', `Đã chuyển sang ${state.theme === 'light' ? 'sáng' : 'tối'} mode`);
}

function updateThemeIcon() {
    const icon = document.querySelector('.toggle-icon');
    icon.textContent = state.theme === 'light' ? '🌙' : '🌞';
}

// ===== EVENT LISTENERS =====
function initializeEventListeners() {
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.currentTarget.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Generate menu
    document.getElementById('generateMenuBtn').addEventListener('click', generateWeeklyMenu);
    
    // Modal close
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            closeModal(e.target.closest('.modal'));
        });
    });
    
    // Modal overlay close
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            closeModal(e.target.closest('.modal'));
        });
    });
    
    // Analyze nutrition
    const analyzeBtn = document.getElementById('analyzeNutritionBtn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', analyzeNutrition);
    }
    
    // Shopping list
    const shoppingBtn = document.getElementById('viewShoppingListBtn');
    if (shoppingBtn) {
        shoppingBtn.addEventListener('click', showShoppingList);
    }
}

// ===== TAB MANAGEMENT =====
function switchTab(tabName) {
    const previousTab = state.currentTab;
    state.currentTab = tabName;
    
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
    
    // Dispatch tab change event
    document.dispatchEvent(new CustomEvent('tabChange', {
        detail: { from: previousTab, to: tabName }
    }));
    
    // Load data for specific tabs
    if (tabName === 'favorites') {
        displayFavorites();
    } else if (tabName === 'history') {
        displayHistory();
    }
}

// ===== MENU GENERATION =====
async function generateWeeklyMenu() {
    const familySize = parseInt(document.getElementById('familySize').value);
    const budget = document.getElementById('budget').value;
    const preferences = document.getElementById('preferences').value;
    const dietaryRestrictions = document.getElementById('dietaryRestrictions').value;
    
    // Show loading
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('menuSection').style.display = 'none';
    
    try {
        // Throttle API call
        await throttleAPICall();
        
        const response = await fetch(`${API_BASE_URL}/api/generate-weekly-menu`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                familySize,
                budget,
                preferences,
                dietaryRestrictions
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            state.currentMenu = result.data;
            displayWeeklyMenu(result.data);
            showToast('success', '🎉 Đã tạo thực đơn tuần thành công!');
        } else {
            throw new Error(result.error || 'Không thể tạo thực đơn');
        }
    } catch (error) {
        console.error('Error:', error);
        
        // Handle quota exceeded error
        if (error.message.includes('quota') || error.message.includes('429') || error.message.includes('Too Many Requests')) {
            showToast('error', '⚠️ Đã vượt quá giới hạn API. Vui lòng đợi 1-2 phút và thử lại.');
            showQuotaExceededMessage();
        } else {
            showToast('error', 'Lỗi: ' + error.message);
        }
    } finally {
        document.getElementById('loadingState').style.display = 'none';
    }
}

function showQuotaExceededMessage() {
    const loadingContainer = document.getElementById('loadingState');
    loadingContainer.style.display = 'block';
    loadingContainer.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
            <h3 style="color: var(--accent-warning); margin-bottom: 1rem;">
                Đã Vượt Quá Giới Hạn API Gemini
            </h3>
            <p style="color: var(--text-secondary); margin-bottom: 2rem;">
                Gemini API miễn phí có giới hạn:<br>
                • 20 requests/phút<br>
                • 1,500 requests/ngày<br><br>
                Vui lòng đợi 1-2 phút hoặc thử lại sau.
            </p>
            <button class="btn btn-primary" onclick="location.reload()">
                🔄 Tải Lại Trang
            </button>
        </div>
    `;
}

// ===== DISPLAY WEEKLY MENU =====
function displayWeeklyMenu(menuData) {
    const menuSection = document.getElementById('menuSection');
    const weekSummary = document.getElementById('weekSummary');
    const daysContainer = document.getElementById('daysContainer');
    
    // Display week summary
    if (menuData.weekSummary) {
        weekSummary.innerHTML = `
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-label">💰 Tổng chi phí tuần</div>
                    <div class="summary-value">${formatCurrency(menuData.weekSummary.totalCost)}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">🔥 Calories trung bình/ngày</div>
                    <div class="summary-value">${menuData.weekSummary.avgCaloriesPerDay}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">⚖️ Cân bằng dinh dưỡng</div>
                    <div class="summary-value">${menuData.weekSummary.nutritionBalance}</div>
                </div>
            </div>
        `;
    }
    
    // Display days
    daysContainer.innerHTML = menuData.weekMenu.map(day => createDayCard(day)).join('');
    
    // Show menu section
    menuSection.style.display = 'block';
    
    // Scroll to menu
    menuSection.scrollIntoView({ behavior: 'smooth' });
}

// ===== CREATE DAY CARD =====
function createDayCard(day) {
    return `
        <div class="day-card">
            <div class="day-header">
                <div>
                    <div class="day-title">${day.day}</div>
                    <div class="day-date">${day.date || ''}</div>
                </div>
                <div class="day-stats">
                    <div>🔥 ${day.totalCalories} kcal</div>
                    <div>💰 ${formatCurrency(day.totalCost)}</div>
                </div>
            </div>
            <div class="meals-grid">
                ${createMealCard(day.meals.breakfast, 'Sáng', '🌅')}
                ${createMealCard(day.meals.lunch, 'Trưa', '☀️')}
                ${createMealCard(day.meals.dinner, 'Tối', '🌙')}
            </div>
        </div>
    `;
}

// ===== CREATE MEAL CARD =====
function createMealCard(meal, mealType, icon) {
    const mealId = `${mealType}-${meal.name.replace(/\s/g, '-')}`;
    
    return `
        <div class="meal-card" data-meal='${JSON.stringify(meal).replace(/'/g, "&apos;")}'>
            <span class="meal-type">${icon} ${mealType}</span>
            <h3 class="meal-name">${meal.name}</h3>
            <p class="meal-description">${meal.description}</p>
            <div class="meal-stats">
                <div class="stat-item">
                    <span class="stat-icon">🔥</span>
                    <span>${meal.calories} kcal</span>
                </div>
                <div class="stat-item">
                    <span class="stat-icon">💰</span>
                    <span>${formatCurrency(meal.estimatedCost)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-icon">⏱️</span>
                    <span>${meal.prepTime + meal.cookTime} phút</span>
                </div>
                <div class="stat-item">
                    <span class="stat-icon">👥</span>
                    <span>${meal.servings} người</span>
                </div>
            </div>
            <div class="meal-actions">
                <button class="btn btn-primary btn-icon-only" onclick='viewRecipe(${JSON.stringify(meal).replace(/'/g, "&apos;")})' title="Xem công thức">
                    📖
                </button>
                <button class="btn btn-secondary btn-icon-only" onclick='generateDishImage(${JSON.stringify(meal).replace(/'/g, "&apos;")})' title="Tạo hình ảnh">
                    🖼️
                </button>
                <button class="btn btn-success btn-icon-only" onclick='saveFavorite(${JSON.stringify(meal).replace(/'/g, "&apos;")})' title="Lưu yêu thích">
                    ❤️
                </button>
                <button class="btn btn-secondary btn-icon-only" onclick='adjustServings(${JSON.stringify(meal).replace(/'/g, "&apos;")})' title="Điều chỉnh khẩu phần">
                    ⚖️
                </button>
            </div>
        </div>
    `;
}

// ===== VIEW RECIPE =====
async function viewRecipe(meal) {
    const modal = document.getElementById('recipeModal');
    const modalBody = document.getElementById('recipeModalBody');
    
    modalBody.innerHTML = `
        <div class="loading-container">
            <div class="loader"></div>
            <p class="loading-text">Đang tải công thức...</p>
        </div>
    `;
    
    openModal(modal);
    
    try {
        // Throttle API call
        await throttleAPICall();
        
        const response = await fetch(`${API_BASE_URL}/api/generate-recipe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dishName: meal.name,
                servings: meal.servings
            })
        });
        
        const result = await response.json();
        
       if (result.success) {
          state.currentViewingRecipe = result.data; // Lưu lại để dùng cho nút Save
          displayRecipe(result.data);
     } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        
        if (error.message.includes('quota') || error.message.includes('429')) {
            modalBody.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <h3 style="color: var(--accent-warning);">Vượt Quá Giới Hạn API</h3>
                    <p style="color: var(--text-secondary); margin: 1rem 0;">
                        Vui lòng đợi 1-2 phút và thử lại.
                    </p>
                    <button class="btn btn-secondary" onclick="closeModal(document.getElementById('recipeModal'))">
                        Đóng
                    </button>
                </div>
            `;
        } else {
            modalBody.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">😔</div>
                    <p class="empty-text">Không thể tải công thức</p>
                    <p class="empty-subtext">${error.message}</p>
                </div>
            `;
        }
    }
}

// ===== DISPLAY RECIPE (Đã thêm nút In) =====
function displayRecipe(recipe) {
    const modalBody = document.getElementById('recipeModalBody');
    
    modalBody.innerHTML = `
        <h2>📖 ${recipe.dishName}</h2>
        <div class="meal-stats" style="margin: 1rem 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
            <div class="stat-item">
                <span class="stat-icon">👥</span>
                <span>${recipe.servings} người</span>
            </div>
            <div class="stat-item">
                <span class="stat-icon">⏱️</span>
                <span>Chuẩn bị: ${recipe.prepTime}</span>
            </div>
            <div class="stat-item">
                <span class="stat-icon">🔥</span>
                <span>Nấu: ${recipe.cookTime}</span>
            </div>
        </div>
        
        <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-lg); margin: 1rem 0;">
            <strong>Độ khó:</strong> ${recipe.difficulty}
        </div>
        
        <h3 style="margin-top: 2rem;">🥘 Nguyên liệu</h3>
        <ul class="ingredients-list">
            ${recipe.ingredients.map(ing => `
                <li class="ingredient-item">
                    <div>
                        <span class="ingredient-name">${ing.name}</span>
                        ${ing.notes ? `<div style="font-size: 0.875rem; color: var(--text-tertiary); margin-top: 0.25rem;">${ing.notes}</div>` : ''}
                    </div>
                    <span class="ingredient-amount">${ing.amount}</span>
                </li>
            `).join('')}
        </ul>
        
        ${recipe.preparation && recipe.preparation.length > 0 ? `
            <h3 style="margin-top: 2rem;">🔪 Sơ chế nguyên liệu</h3>
            <ul style="list-style: disc; padding-left: 1.5rem;">
                ${recipe.preparation.map(step => `<li style="margin-bottom: 0.5rem;">${step}</li>`).join('')}
            </ul>
        ` : ''}
        
        <h3 style="margin-top: 2rem;">👨‍🍳 Các bước nấu</h3>
        <ol class="recipe-steps">
            ${recipe.cookingSteps.map(step => `
                <li class="recipe-step">
                    <div class="step-title">${step.title}</div>
                    <div class="step-description">${step.description}</div>
                    ${step.duration || step.temperature || step.tips ? `
                        <div class="step-meta">
                            ${step.duration ? `<span>⏱️ ${step.duration}</span>` : ''}
                            ${step.temperature ? `<span>🌡️ ${step.temperature}</span>` : ''}
                            ${step.tips ? `<span>💡 ${step.tips}</span>` : ''}
                        </div>
                    ` : ''}
                </li>
            `).join('')}
        </ol>
        
        ${recipe.expertTips && recipe.expertTips.length > 0 ? `
            <h3 style="margin-top: 2rem;">💡 Mẹo từ chuyên gia</h3>
            <div style="background: var(--gradient-success); color: white; padding: 1.5rem; border-radius: var(--radius-lg);">
                <ul style="list-style: none;">
                    ${recipe.expertTips.map(tip => `<li style="margin-bottom: 0.75rem;">✨ ${tip}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
        
        ${recipe.serving ? `
            <h3 style="margin-top: 2rem;">🍽️ Cách trình bày</h3>
            <div style="background: var(--bg-tertiary); padding: 1.5rem; border-radius: var(--radius-lg);">
                <p><strong>Bày trí:</strong> ${recipe.serving.presentation}</p>
                <p><strong>Ăn kèm:</strong> ${recipe.serving.accompaniments.join(', ')}</p>
                <p><strong>Trang trí:</strong> ${recipe.serving.garnish}</p>
            </div>
        ` : ''}
        
        ${recipe.storage ? `
            <h3 style="margin-top: 2rem;">📦 Bảo quản</h3>
            <div style="background: var(--bg-tertiary); padding: 1.5rem; border-radius: var(--radius-lg);">
                <p><strong>Tủ lạnh:</strong> ${recipe.storage.refrigerator}</p>
                <p><strong>Đông lạnh:</strong> ${recipe.storage.freezer}</p>
                <p><strong>Hâm nóng:</strong> ${recipe.storage.reheating}</p>
            </div>
        ` : ''}
        
        ${recipe.variations && recipe.variations.length > 0 ? `
            <h3 style="margin-top: 2rem;">🔄 Biến thể</h3>
            ${recipe.variations.map(variant => `
                <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-lg); margin-bottom: 0.5rem;">
                    <strong>${variant.name}:</strong> ${variant.changes}
                </div>
            `).join('')}
        ` : ''}
        
        ${recipe.nutritionInfo ? `
            <h3 style="margin-top: 2rem;">📊 Thông tin dinh dưỡng (1 khẩu phần)</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem;">
                <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-lg); text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700;">${recipe.nutritionInfo.calories}</div>
                    <div style="color: var(--text-secondary); font-size: 0.875rem;">Calories</div>
                </div>
                <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-lg); text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700;">${recipe.nutritionInfo.protein}</div>
                    <div style="color: var(--text-secondary); font-size: 0.875rem;">Protein</div>
                </div>
                <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-lg); text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700;">${recipe.nutritionInfo.carbs}</div>
                    <div style="color: var(--text-secondary); font-size: 0.875rem;">Carbs</div>
                </div>
                <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-lg); text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700;">${recipe.nutritionInfo.fat}</div>
                    <div style="color: var(--text-secondary); font-size: 0.875rem;">Fat</div>
                </div>
            </div>
        ` : ''}

        <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 1rem; flex-wrap: wrap;">
            
            <button class="btn btn-secondary" onclick="printRecipe()">
                🖨️ In
            </button>

            <button class="btn btn-success" onclick="saveCurrentRecipe()">
                💾 Lưu công thức
            </button>
            
            <button class="btn btn-secondary" onclick="closeModal(document.getElementById('recipeModal'))">
                Đóng
            </button>
        </div>
    `;
}

// ===== PRINT RECIPE FUNCTION (Phiên bản In Ngầm - Sửa lỗi chớp màn hình) =====
function printRecipe() {
    // 1. Lấy nội dung công thức
    const content = document.getElementById('recipeModalBody').innerHTML;
    
    // 2. Tạo một khung in ảo (Iframe) ẩn đi
    const iframe = document.createElement('iframe');
    
    // Đặt style để ẩn iframe này khỏi mắt người dùng
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    
    document.body.appendChild(iframe);
    
    // 3. Viết nội dung vào iframe
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write('<html><head><title>In Công Thức - Thực Đơn Xanh</title>');
    
    // Thêm CSS để trang in đẹp mắt
    doc.write('<style>');
    doc.write(`
        @page { size: A4; margin: 2cm; }
        body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #1f2937; }
        h2 { color: #166534; border-bottom: 2px solid #22c55e; padding-bottom: 10px; font-size: 24px; margin-top: 0; }
        h3 { color: #15803d; margin-top: 25px; font-size: 18px; border-bottom: 1px dashed #ccc; padding-bottom: 5px; }
        .meal-stats { display: flex; justify-content: space-between; margin: 20px 0; padding: 15px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-weight: bold; font-size: 0.9em; }
        .ingredients-list { list-style: none; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .ingredient-item { display: flex; justify-content: space-between; border-bottom: 1px dotted #e5e7eb; padding: 5px 0; }
        .ingredient-name { font-weight: 600; }
        .recipe-step { margin-bottom: 15px; page-break-inside: avoid; }
        .step-title { font-weight: bold; color: #166534; font-size: 1.1em; margin-bottom: 5px; display: block; }
        .step-description { text-align: justify; }
        /* Ẩn các nút bấm và icon không cần thiết khi in */
        button, .btn, .modal-close, .favorite-badge { display: none !important; }
        /* Logo thương hiệu */
        .print-header { text-align: center; margin-bottom: 30px; border-bottom: 3px double #22c55e; padding-bottom: 15px; }
    `);
    doc.write('</style>');
    doc.write('</head><body>');
    
    // Header trang in
    doc.write(`
        <div class="print-header">
            <div style="font-size: 24px;">🌱 THỰC ĐƠN XANH</div>
            <div style="font-size: 14px; color: #666;">Ăn Xanh - Sống Khỏe - Bảo Vệ Môi Trường</div>
        </div>
    `);
    
    // Nội dung chính
    doc.write(content);
    
    doc.write('</body></html>');
    doc.close();
    
    // 4. Thực hiện lệnh in
    // Đợi 500ms để trình duyệt tải xong ảnh/font rồi mới in
    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        
        // Xóa iframe sau khi in xong (đợi 1s để chắc chắn lệnh in đã gửi đi)
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 1000);
    }, 500);
}

// ===== GENERATE DISH IMAGE =====
async function generateDishImage(meal) {
    const modal = document.getElementById('dishModal');
    const modalBody = document.getElementById('dishModalBody');
    
    modalBody.innerHTML = `
        <div class="loading-container">
            <div class="loader"></div>
            <p class="loading-text">Đang tạo hình ảnh món ăn...</p>
        </div>
    `;
    
    openModal(modal);
    
    try {
        // Throttle API call
        await throttleAPICall();
        
        const response = await fetch(`${API_BASE_URL}/api/generate-dish-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dishName: meal.name,
                description: meal.description,
                ingredients: meal.ingredients || []
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayDishImage(meal, result.data);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        
        if (error.message.includes('quota') || error.message.includes('429')) {
            modalBody.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <h3 style="color: var(--accent-warning);">Vượt Quá Giới Hạn API</h3>
                    <p style="color: var(--text-secondary); margin: 1rem 0;">
                        Vui lòng đợi 1-2 phút và thử lại.<br>
                        Gemini API miễn phí có giới hạn 20 requests/phút.
                    </p>
                    <button class="btn btn-secondary" onclick="closeModal(document.getElementById('dishModal'))">
                        Đóng
                    </button>
                </div>
            `;
        } else {
            modalBody.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">😔</div>
                    <p class="empty-text">Không thể tạo hình ảnh</p>
                    <p class="empty-subtext">${error.message}</p>
                </div>
            `;
        }
    }
}

// ===== DISPLAY DISH IMAGE =====
function displayDishImage(meal, imageData) {
    const modalBody = document.getElementById('dishModalBody');
    
    // Tạo gallery ảnh từ nhiều nguồn
    const imageGallery = imageData.imageSources ? 
        imageData.imageSources.map((source, index) => `
            <div style="text-align: center; margin-bottom: 1rem;">
                <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                    ${source.description}
                </p>
                <img src="${source.url}" 
                     alt="${meal.name} - ${source.name}"
                     style="width: 100%; max-width: 600px; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); cursor: pointer;"
                     onclick="window.open('${source.url}', '_blank')"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <div style="display: none; background: var(--bg-tertiary); padding: 2rem; border-radius: var(--radius-lg); text-align: center;">
                    <p>⚠️ Không thể tải ảnh từ ${source.name}</p>
                </div>
            </div>
        `).join('') : 
        `<div style="margin: 1.5rem 0;">
            <img src="${imageData.placeholderImage}" 
                 alt="${meal.name}"
                 style="width: 100%; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg);"
                 onerror="this.src='https://via.placeholder.com/800x600?text=${encodeURIComponent(meal.name)}'">
        </div>`;
    
    modalBody.innerHTML = `
        <h2>🖼️ Hình Ảnh Món Ăn</h2>
        <h3 style="color: var(--text-secondary); margin-bottom: 2rem;">${meal.name}</h3>
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: var(--radius-lg); margin-bottom: 2rem; text-align: center;">
            <p style="font-size: 1.125rem; margin: 0;">
                💡 <strong>Lưu ý:</strong> Đây là ảnh minh họa từ các nguồn mở. Món ăn thực tế có thể khác một chút.
            </p>
        </div>
        
        ${imageGallery}
        
        <div style="background: var(--bg-tertiary); padding: 1.5rem; border-radius: var(--radius-lg); margin: 2rem 0;">
            <h3 style="margin-bottom: 1rem;">📸 Mô tả chi tiết hình ảnh</h3>
            <p style="line-height: 1.8; color: var(--text-secondary);">${imageData.imageDescription}</p>
        </div>
        
        ${imageData.presentation ? `
            <div style="background: var(--gradient-success); color: white; padding: 1.5rem; border-radius: var(--radius-lg);">
                <h3 style="margin-bottom: 1rem; color: white;">🍽️ Cách trình bày đẹp mắt</h3>
                <div style="display: grid; gap: 1rem;">
                    <div>
                        <strong>🎨 Bày trí:</strong> ${imageData.presentation.plating}
                    </div>
                    <div>
                        <strong>✨ Trang trí:</strong> ${imageData.presentation.garnish}
                    </div>
                    <div>
                        <strong>🥗 Ăn kèm:</strong> ${imageData.presentation.serveWith}
                    </div>
                </div>
            </div>
        ` : ''}
        
        ${imageData.searchKeywords && imageData.searchKeywords.length > 0 ? `
            <div style="margin-top: 2rem; padding: 1rem; background: var(--bg-tertiary); border-radius: var(--radius-lg);">
                <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                    🔍 Từ khóa tìm kiếm thêm ảnh:
                </p>
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                    ${imageData.searchKeywords.map(keyword => `
                        <span style="background: var(--accent-primary); color: white; padding: 0.25rem 0.75rem; border-radius: var(--radius-full); font-size: 0.875rem;">
                            ${keyword}
                        </span>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        
        <div style="margin-top: 2rem; padding: 1.5rem; background: var(--gradient-warm); color: white; border-radius: var(--radius-lg); text-align: center;">
            <p style="margin-bottom: 1rem;"><strong>💡 Mẹo chụp ảnh món ăn đẹp:</strong></p>
            <ul style="list-style: none; padding: 0; text-align: left;">
                <li style="margin-bottom: 0.5rem;">📱 Chụp từ góc 45 độ hoặc từ trên xuống</li>
                <li style="margin-bottom: 0.5rem;">☀️ Sử dụng ánh sáng tự nhiên</li>
                <li style="margin-bottom: 0.5rem;">🎨 Trang trí bằng rau mùi, hành lá tươi</li>
                <li style="margin-bottom: 0.5rem;">🍽️ Dùng đĩa/bát màu trơn, đơn giản</li>
                <li>✨ Lau sạch viền đĩa trước khi chụp</li>
            </ul>
        </div>
    `;
}

// ===== SAVE FAVORITE =====
async function saveFavorite(meal) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/favorites`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ dish: meal })
        });
        
        const result = await response.json();
        
        if (result.success) {
            state.favorites.push(result.data);
            showToast('success', `❤️ Đã lưu "${meal.name}" vào danh sách yêu thích`);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('error', 'Không thể lưu món yêu thích');
    }
}

// ===== ADJUST SERVINGS =====
async function adjustServings(meal) {
    const newServings = prompt(`Điều chỉnh khẩu phần cho "${meal.name}"\n\nKhẩu phần hiện tại: ${meal.servings} người\nNhập số người mới:`, meal.servings);
    
    if (!newServings || newServings === meal.servings.toString()) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/adjust-servings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recipe: meal,
                newServings: parseInt(newServings)
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAdjustedServings(meal, result.data.adjustedRecipe);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('error', 'Không thể điều chỉnh khẩu phần');
    }
}

// ===== SHOW ADJUSTED SERVINGS =====
function showAdjustedServings(originalMeal, adjustedRecipe) {
    const modal = document.getElementById('dishModal');
    const modalBody = document.getElementById('dishModalBody');
    
    modalBody.innerHTML = `
        <h2>⚖️ Điều chỉnh khẩu phần</h2>
        <h3 style="color: var(--text-secondary);">${originalMeal.name}</h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 2rem 0;">
            <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-lg); text-align: center;">
                <div style="font-size: 2rem; font-weight: 700;">${originalMeal.servings}</div>
                <div style="color: var(--text-secondary);">Khẩu phần cũ</div>
            </div>
            <div style="background: var(--gradient-primary); padding: 1rem; border-radius: var(--radius-lg); text-align: center; color: white;">
                <div style="font-size: 2rem; font-weight: 700;">${adjustedRecipe.servings}</div>
                <div>Khẩu phần mới</div>
            </div>
        </div>
        
        <h3>🥘 Nguyên liệu đã điều chỉnh</h3>
        <ul class="ingredients-list">
            ${adjustedRecipe.ingredients.map(ing => `
                <li class="ingredient-item">
                    <span class="ingredient-name">${ing.name}</span>
                    <span class="ingredient-amount">${ing.amount}</span>
                </li>
            `).join('')}
        </ul>
        
        ${adjustedRecipe.adjustmentNotes ? `
            <div style="background: var(--gradient-warm); color: white; padding: 1.5rem; border-radius: var(--radius-lg); margin-top: 1.5rem;">
                <strong>⚠️ Lưu ý:</strong> ${adjustedRecipe.adjustmentNotes}
            </div>
        ` : ''}
    `;
    
    openModal(modal);
}

// ===== ANALYZE NUTRITION =====
async function analyzeNutrition() {
    if (!state.currentMenu) {
        showToast('warning', 'Vui lòng tạo thực đơn trước');
        return;
    }
    
    const modal = document.getElementById('nutritionModal');
    const modalBody = document.getElementById('nutritionModalBody');
    
    modalBody.innerHTML = `
        <div class="loading-container">
            <div class="loader"></div>
            <p class="loading-text">Đang phân tích dinh dưỡng...</p>
        </div>
    `;
    
    openModal(modal);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/nutrition-analysis`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                weekMenu: state.currentMenu.weekMenu
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayNutritionAnalysis(result.data);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        modalBody.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">😔</div>
                <p class="empty-text">Không thể phân tích dinh dưỡng</p>
            </div>
        `;
    }
}

// ===== DISPLAY NUTRITION ANALYSIS =====
function displayNutritionAnalysis(analysis) {
    const modalBody = document.getElementById('nutritionModalBody');
    
    const getStatusColor = (status) => {
        if (status.includes('Đủ') || status.includes('Tốt')) return 'var(--accent-success)';
        if (status.includes('Thiếu') || status.includes('Cần')) return 'var(--accent-warning)';
        if (status.includes('Thừa')) return 'var(--accent-danger)';
        return 'var(--text-secondary)';
    };
    
    modalBody.innerHTML = `
        <h2>📊 Phân tích dinh dưỡng thực đơn tuần</h2>
        
        <div style="text-align: center; margin: 2rem 0;">
            <div style="font-size: 4rem; font-weight: 800; background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                ${analysis.overallScore}
            </div>
            <div style="color: var(--text-secondary); font-size: 1.125rem;">Điểm tổng thể</div>
        </div>
        
        <h3>🔍 Chi tiết phân tích</h3>
        ${Object.entries(analysis.analysis).map(([key, value]) => `
            <div style="background: var(--bg-tertiary); padding: 1.5rem; border-radius: var(--radius-lg); margin-bottom: 1rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                    <strong style="text-transform: capitalize;">${key === 'protein' ? 'Protein' : key === 'carbs' ? 'Carbohydrate' : key === 'vitamins' ? 'Vitamin' : 'Khoáng chất'}</strong>
                    <span style="padding: 0.25rem 1rem; background: ${getStatusColor(value.status)}; color: white; border-radius: var(--radius-full); font-size: 0.875rem;">
                        ${value.status}
                    </span>
                </div>
                <p style="color: var(--text-secondary); margin: 0;">${value.recommendation}</p>
            </div>
        `).join('')}
        
        ${analysis.strengths && analysis.strengths.length > 0 ? `
            <h3 style="margin-top: 2rem;">✅ Điểm mạnh</h3>
            <div style="background: var(--gradient-success); color: white; padding: 1.5rem; border-radius: var(--radius-lg);">
                <ul style="margin: 0; padding-left: 1.5rem;">
                    ${analysis.strengths.map(strength => `<li style="margin-bottom: 0.5rem;">${strength}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
        
        ${analysis.improvements && analysis.improvements.length > 0 ? `
            <h3 style="margin-top: 2rem;">💡 Cần cải thiện</h3>
            <div style="background: var(--gradient-warm); color: white; padding: 1.5rem; border-radius: var(--radius-lg);">
                <ul style="margin: 0; padding-left: 1.5rem;">
                    ${analysis.improvements.map(improvement => `<li style="margin-bottom: 0.5rem;">${improvement}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
        
        ${analysis.recommendations && analysis.recommendations.length > 0 ? `
            <h3 style="margin-top: 2rem;">🎯 Khuyến nghị</h3>
            <div style="background: var(--bg-tertiary); padding: 1.5rem; border-radius: var(--radius-lg);">
                <ol style="margin: 0; padding-left: 1.5rem;">
                    ${analysis.recommendations.map(rec => `<li style="margin-bottom: 0.5rem;">${rec}</li>`).join('')}
                </ol>
            </div>
        ` : ''}
    `;
}

// ===== SHOW SHOPPING LIST (Đã thêm nút Sao chép) =====
function showShoppingList() {
    if (!state.currentMenu || !state.currentMenu.shoppingList) {
        showToast('warning', 'Không có danh sách mua sắm');
        return;
    }
    
    const modal = document.getElementById('shoppingModal');
    const modalBody = document.getElementById('shoppingModalBody');
    const shoppingList = state.currentMenu.shoppingList;
    
    modalBody.innerHTML = `
        <h2>🛒 Danh sách mua sắm tuần</h2>
        <p style="color: var(--text-secondary); margin-bottom: 2rem;">Chuẩn bị đầy đủ nguyên liệu cho cả tuần</p>
        
        <div id="shoppingListContent">
        ${Object.entries(shoppingList).map(([category, items]) => `
            <div style="margin-bottom: 2rem;">
                <h3 style="text-transform: capitalize; margin-bottom: 1rem; color: var(--accent-secondary);">
                    ${category === 'proteins' ? '🥩 Thực phẩm giàu protein' : 
                      category === 'vegetables' ? '🥬 Rau củ quả' : 
                      category === 'grains' ? '🌾 Ngũ cốc & tinh bột' : 
                      '🧂 Gia vị & khác'}
                </h3>
                <ul style="list-style: none; padding: 0;">
                    ${items.map(item => `
                        <li style="padding: 0.5rem; border-bottom: 1px dashed var(--border-color); display: flex; align-items: center; gap: 1rem;">
                            <input type="checkbox" style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--accent-primary);">
                            <span style="font-size: 1.05rem;">${item}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `).join('')}
        </div>
        
        <div style="display: flex; gap: 1rem; margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
            <button class="btn btn-primary" onclick="copyShoppingList()" style="flex: 1;">
                📋 Sao chép gửi Zalo
            </button>
            <button class="btn btn-secondary" onclick="window.print()" style="flex: 1;">
                🖨️ In danh sách
            </button>
        </div>
    `;
    
    openModal(modal);
}

// Hàm xử lý Copy
window.copyShoppingList = function() {
    if (!state.currentMenu || !state.currentMenu.shoppingList) return;
    
    const list = state.currentMenu.shoppingList;
    let textToCopy = "🛒 DANH SÁCH ĐI CHỢ TUẦN NÀY:\n\n";
    
    if (list.proteins?.length) textToCopy += "🥩 THỊT/CÁ:\n- " + list.proteins.join("\n- ") + "\n\n";
    if (list.vegetables?.length) textToCopy += "🥬 RAU CỦ:\n- " + list.vegetables.join("\n- ") + "\n\n";
    if (list.grains?.length) textToCopy += "🌾 GẠO/MÌ:\n- " + list.grains.join("\n- ") + "\n\n";
    if (list.others?.length) textToCopy += "🧂 KHÁC:\n- " + list.others.join("\n- ");
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        showToast('success', '✅ Đã sao chép! Bạn có thể dán vào tin nhắn.');
    }).catch(err => {
        showToast('error', 'Không thể sao chép');
    });
};

// ===== FAVORITES =====
async function loadFavorites() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/favorites`);
        const result = await response.json();
        
        if (result.success) {
            state.favorites = result.data;
        }
    } catch (error) {
        console.error('Error loading favorites:', error);
    }
}

// Load cả 2 loại dữ liệu
async function loadFavorites() {
    await Promise.all([
        fetch(`${API_BASE_URL}/api/favorites`).then(r => r.json()).then(d => state.favorites = d.data || []),
        fetch(`${API_BASE_URL}/api/saved-recipes`).then(r => r.json()).then(d => state.savedRecipes = d.data || [])
    ]);
    displayFavorites(); // Gọi hiển thị sau khi load xong
}

// Hiển thị giao diện mới
function displayFavorites() {
    const grid = document.getElementById('favoritesGrid');

    let htmlContent = '';

    // PHẦN 1: CÔNG THỨC ĐÃ LƯU (Full chi tiết)
    if (state.savedRecipes && state.savedRecipes.length > 0) {
        htmlContent += `<h3 style="grid-column: 1/-1; margin: 1rem 0;">📚 Sổ tay công thức (${state.savedRecipes.length})</h3>`;
        htmlContent += state.savedRecipes.map(recipe => `
            <div class="favorite-card" style="border: 2px solid var(--accent-success);">
                <div class="favorite-badge">💾</div>
                <h3>${recipe.dishName}</h3>
                <div class="meal-stats" style="margin: 1rem 0; font-size: 0.9rem;">
                     <span>⏱️ ${recipe.prepTime} + ${recipe.cookTime}</span> | 
                     <span>👥 ${recipe.servings} người</span>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-success" onclick='openSavedRecipe("${recipe.id}")' style="flex: 1;">
                        Xem ngay (Offline)
                    </button>
                    <button class="btn btn-danger btn-icon-only" onclick="deleteSavedRecipe('${recipe.id}')">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    // PHẦN 2: MÓN ĂN YÊU THÍCH (Chỉ có tên)
    if (state.favorites && state.favorites.length > 0) {
        htmlContent += `<h3 style="grid-column: 1/-1; margin: 2rem 0 1rem 0; border-top: 1px solid #eee; padding-top: 1rem;">❤️ Món ăn đã thích (${state.favorites.length})</h3>`;
        htmlContent += state.favorites.map(fav => `
            <div class="favorite-card">
                <div class="favorite-badge">❤️</div>
                <h3>${fav.name}</h3>
                <p style="color: var(--text-secondary); margin: 1rem 0;">${fav.description}</p>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-primary" onclick='viewRecipe(${JSON.stringify(fav).replace(/'/g, "&apos;")})' style="flex: 1;">
                        📖 Tạo công thức
                    </button>
                    <button class="btn btn-danger btn-icon-only" onclick="removeFavorite('${fav.id}')">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    if (htmlContent === '') {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👨‍🍳</div>
                <p class="empty-text">Chưa lưu công thức nào</p>
                <p class="empty-subtext">Hãy xem công thức và nhấn "Lưu" để thêm vào đây</p>
            </div>`;
    } else {
        grid.innerHTML = htmlContent;
    }
}

// Mở công thức đã lưu (Không cần gọi API AI)
function openSavedRecipe(id) {
    const recipe = state.savedRecipes.find(r => r.id === id);
    if (recipe) {
        const modal = document.getElementById('recipeModal');
        state.currentViewingRecipe = recipe; // Cập nhật state
        openModal(modal);
        displayRecipe(recipe);

        // Ẩn nút Lưu vì đã lưu rồi
        setTimeout(() => {
            const saveBtns = document.querySelectorAll('button[onclick="saveCurrentRecipe()"]');
            saveBtns.forEach(btn => btn.style.display = 'none');
        }, 100);
    }
}

// Xóa công thức
async function deleteSavedRecipe(id) {
    if (!confirm('Xóa công thức này khỏi sổ tay?')) return;
    try {
        await fetch(`${API_BASE_URL}/api/saved-recipes/${id}`, { method: 'DELETE' });
        loadSavedRecipes(); // Reload lại UI
        showToast('success', 'Đã xóa công thức');
    } catch (e) { console.error(e); }
}

// Helper để load lại danh sách
async function loadSavedRecipes() {
    const res = await fetch(`${API_BASE_URL}/api/saved-recipes`);
    const data = await res.json();
    state.savedRecipes = data.data || [];
    displayFavorites();
}

async function removeFavorite(id) {
    if (!confirm('Bạn có chắc muốn xóa món này khỏi danh sách yêu thích?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/favorites/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            state.favorites = state.favorites.filter(fav => fav.id !== id);
            displayFavorites();
            showToast('success', 'Đã xóa món yêu thích');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('error', 'Không thể xóa món yêu thích');
    }
}

// ===== HISTORY =====
async function loadHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/menu-history`);
        const result = await response.json();
        
        if (result.success) {
            state.history = result.data;
        }
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

function displayHistory() {
    const list = document.getElementById('historyList');
    
    if (state.history.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <p class="empty-text">Chưa có lịch sử thực đơn</p>
                <p class="empty-subtext">Tạo thực đơn mới để bắt đầu</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = state.history.map(history => {
        const date = new Date(history.createdAt);
        return `
            <div class="history-card" onclick='loadHistoryMenu(${JSON.stringify(history.menu).replace(/'/g, "&apos;")})'>
                <div class="history-header">
                    <div class="history-date">
                        📅 ${date.toLocaleDateString('vi-VN', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}
                    </div>
                    <div style="color: var(--text-tertiary); font-size: 0.875rem;">
                        ${date.toLocaleTimeString('vi-VN')}
                    </div>
                </div>
                <div class="history-summary">
                    <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
                        <span>💰 ${formatCurrency(history.menu.weekSummary?.totalCost || 0)}</span>
                        <span>🔥 ${history.menu.weekSummary?.avgCaloriesPerDay || 0} kcal/ngày</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function loadHistoryMenu(menu) {
    state.currentMenu = menu;
    switchTab('home');
    displayWeeklyMenu(menu);
    showToast('success', 'Đã tải thực đơn từ lịch sử');
}

// ===== MODAL MANAGEMENT =====
function openModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// ===== TOAST NOTIFICATIONS =====
function showToast(type, message) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-message">${message}</div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s reverse';
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 3000);
}

// ===== UTILITY FUNCTIONS =====
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

async function saveCurrentRecipe() {
    if (!state.currentViewingRecipe) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/saved-recipes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipe: state.currentViewingRecipe })
        });

        const result = await response.json();

        if (result.success) {
            showToast('success', '💾 Đã lưu công thức vào sổ tay!');
            loadSavedRecipes(); // Tải lại danh sách
        } else {
            showToast('warning', result.error);
        }
    } catch (error) {
        console.error(error);
        showToast('error', 'Lỗi khi lưu công thức');
    }
}

// ===== EXPORT FUNCTIONS TO GLOBAL SCOPE =====
window.viewRecipe = viewRecipe;
window.generateDishImage = generateDishImage;
window.saveFavorite = saveFavorite;
window.adjustServings = adjustServings;
window.removeFavorite = removeFavorite;
window.loadHistoryMenu = loadHistoryMenu;
window.saveCurrentRecipe = saveCurrentRecipe;
window.openSavedRecipe = openSavedRecipe;
window.deleteSavedRecipe = deleteSavedRecipe;
window.printRecipe = printRecipe;