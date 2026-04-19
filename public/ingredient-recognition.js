// ===== INGREDIENT RECOGNITION MODULE =====

let stream = null;
let currentFacingMode = 'environment'; // 'user' or 'environment'
let lastCapturedImage = null;

// Initialize Ingredient Recognition
function initIngredientRecognition() {
    // Button click handlers
    document.getElementById('startCameraBtn')?.addEventListener('click', startCamera);
    document.getElementById('capturePhotoBtn')?.addEventListener('click', capturePhoto);
    document.getElementById('switchCameraBtn')?.addEventListener('click', switchCamera);
    
   // THÊM SỰ KIỆN NÀY:
    document.getElementById('analyzeTextBtn')?.addEventListener('click', analyzeTextIngredients);
    
    // Cho phép ấn Enter để tìm
    document.getElementById('manualIngredientsInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') analyzeTextIngredients();
    });
    
    console.log('✅ Ingredient recognition initialized (+Manual Input)');
}

// THÊM HÀM MỚI: Phân tích từ văn bản
async function analyzeTextIngredients() {
    const input = document.getElementById('manualIngredientsInput');
    const text = input.value.trim();
    
    if (!text) {
        showToast('warning', 'Vui lòng nhập tên nguyên liệu!');
        return;
    }
    
    const loadingEl = document.getElementById('ingredientsLoading');
    const resultsEl = document.getElementById('analysisResults');
    
    try {
        loadingEl.style.display = 'block';
        loadingEl.querySelector('.loading-text').textContent = 'Đang tìm món ngon từ tủ lạnh của bạn...';
        resultsEl.style.display = 'none';
        
        const response = await fetch(`${API_BASE_URL}/api/suggest-from-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ingredients: text })
        });
        
        const data = await response.json();
        
        if (data.suggestedDishes) {
            displayIngredients(data.ingredients);
            displaySuggestedDishes(data.suggestedDishes);
            
            loadingEl.style.display = 'none';
            resultsEl.style.display = 'block';
            showToast('success', '✅ Đã tìm thấy món ăn phù hợp!');
            
            // Cuộn xuống kết quả
            resultsEl.scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) {
        console.error(error);
        loadingEl.style.display = 'none';
        showToast('error', 'Lỗi khi tìm kiếm. Thử lại sau!');
    }
}

// Start Camera
async function startCamera() {
    try {
        const video = document.getElementById('cameraVideo');
        const placeholder = document.getElementById('cameraPlaceholder');
        const startBtn = document.getElementById('startCameraBtn');
        const captureBtn = document.getElementById('capturePhotoBtn');
        const switchBtn = document.getElementById('switchCameraBtn');
        
        // Request camera access
        const constraints = {
            video: {
                facingMode: currentFacingMode,
                width: { ideal: 1280 },
                height: { ideal: 960 }
            }
        };
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        
        // Hide placeholder, show video
        placeholder.style.display = 'none';
        video.style.display = 'block';
        
        // Update buttons
        startBtn.style.display = 'none';
        captureBtn.style.display = 'inline-flex';
        switchBtn.style.display = 'inline-flex';
        
        console.log('✅ Camera started:', currentFacingMode);
        showToast('success', '📷 Camera đã mở!');
        
    } catch (error) {
        console.error('❌ Camera error:', error);
        
        let errorMessage = 'Không thể mở camera!';
        if (error.name === 'NotAllowedError') {
            errorMessage = 'Vui lòng cho phép truy cập camera!';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'Không tìm thấy camera!';
        }
        
        showToast('error', '❌ ' + errorMessage);
    }
}

// Stop Camera
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        
        const video = document.getElementById('cameraVideo');
        const placeholder = document.getElementById('cameraPlaceholder');
        const startBtn = document.getElementById('startCameraBtn');
        const captureBtn = document.getElementById('capturePhotoBtn');
        const switchBtn = document.getElementById('switchCameraBtn');
        
        video.style.display = 'none';
        placeholder.style.display = 'flex';
        
        startBtn.style.display = 'inline-flex';
        captureBtn.style.display = 'none';
        switchBtn.style.display = 'none';
        
        console.log('📷 Camera stopped');
    }
}

// Switch Camera (Front/Back)
async function switchCamera() {
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    stopCamera();
    await startCamera();
    
    const mode = currentFacingMode === 'environment' ? 'Sau' : 'Trước';
    showToast('success', `🔄 Đã chuyển sang camera ${mode}`);
}

// Capture Photo
async function capturePhoto() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);
    
    // Get image as base64
    lastCapturedImage = canvas.toDataURL('image/jpeg', 0.8);
    
    console.log('📸 Photo captured');
    showToast('success', '📸 Đã chụp ảnh!');
    
    // Stop camera
    stopCamera();
    
    // Analyze with AI
    await analyzeIngredients(lastCapturedImage);
}

// Analyze Ingredients with Gemini Vision
async function analyzeIngredients(imageData) {
    const loadingEl = document.getElementById('ingredientsLoading');
    const resultsEl = document.getElementById('analysisResults');
    
    try {
        // Show loading
        loadingEl.style.display = 'block';
        resultsEl.style.display = 'none';
        
        // Send to backend API
        const response = await fetch(`${API_BASE_URL}/api/analyze-ingredients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: imageData.split(',')[1] // Remove data:image/jpeg;base64, prefix
            })
        });
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        
        console.log('✅ Ingredients analyzed:', data);
        
        // Display results
        displayIngredients(data.ingredients);
        displaySuggestedDishes(data.suggestedDishes);
        
        // Hide loading, show results
        loadingEl.style.display = 'none';
        resultsEl.style.display = 'block';
        
        showToast('success', '✅ Đã phân tích xong!');
        
    } catch (error) {
        console.error('❌ Analysis error:', error);
        loadingEl.style.display = 'none';
        showToast('error', '❌ Lỗi phân tích! Vui lòng thử lại.');
    }
}

// Display Ingredients
function displayIngredients(ingredients) {
    const listEl = document.getElementById('ingredientsList');
    
    if (!ingredients || ingredients.length === 0) {
        listEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Không phát hiện nguyên liệu nào</p>';
        return;
    }
    
    listEl.innerHTML = ingredients.map(ing => `
        <div class="ingredient-card">
            <div class="ingredient-icon">${ing.icon || '🥕'}</div>
            <div class="ingredient-name">${ing.name}</div>
            <div class="ingredient-quantity">${ing.quantity || ''}</div>
        </div>
    `).join('');
}

// Display Suggested Dishes
function displaySuggestedDishes(dishes) {
    const listEl = document.getElementById('suggestedDishes');
    
    if (!dishes || dishes.length === 0) {
        listEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Không có gợi ý món ăn</p>';
        return;
    }
    
    listEl.innerHTML = dishes.map(dish => `
        <div class="suggested-dish-card" onclick="viewDishRecipe('${dish.name}')">
            <div class="suggested-dish-name">${dish.name}</div>
            <div class="suggested-dish-ingredients">
                Nguyên liệu: ${dish.matchedIngredients.join(', ')}
            </div>
            <div class="suggested-dish-match">
                Phù hợp ${dish.matchPercentage}%
            </div>
        </div>
    `).join('');
}

// View Dish Recipe (integrate with existing recipe system)
async function viewDishRecipe(dishName) {
    showToast('info', `🔍 Đang tìm công thức ${dishName}...`);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/generate-recipe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dishName: dishName,
                servings: 4
            })
        });
        
        if (!response.ok) {
            throw new Error('Recipe fetch failed');
        }
        
        const recipe = await response.json();
        
        // Open recipe modal (reuse existing modal)
        openRecipeModal(recipe);
        
    } catch (error) {
        console.error('❌ Recipe error:', error);
        showToast('error', '❌ Không tìm thấy công thức!');
    }
}

// Stop camera when switching tabs
document.addEventListener('tabChange', (e) => {
    if (e.detail.from === 'ingredients') {
        stopCamera();
    }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initIngredientRecognition();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopCamera();
});