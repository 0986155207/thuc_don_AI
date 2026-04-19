// ===== VOICE INPUT MODULE =====

let recognition = null;
let isListening = false;

// Initialize Voice Recognition
function initVoiceInput() {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        console.log('❌ Voice recognition not supported');
        document.getElementById('voiceInputBtn').disabled = true;
        document.getElementById('voiceInputBtn').innerHTML = '<span>🎤 Không hỗ trợ trên trình duyệt này</span>';
        return;
    }
    
    // Create recognition instance
    recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    // Event listeners
    recognition.onstart = handleVoiceStart;
    recognition.onresult = handleVoiceResult;
    recognition.onerror = handleVoiceError;
    recognition.onend = handleVoiceEnd;
    
    // Button click handlers
    document.getElementById('voiceInputBtn').addEventListener('click', openVoiceModal);
    document.getElementById('startVoiceBtn').addEventListener('click', startVoiceRecognition);
    document.getElementById('stopVoiceBtn').addEventListener('click', stopVoiceRecognition);
    
    console.log('✅ Voice input initialized');
}

// Open Voice Modal
function openVoiceModal() {
    const modal = document.getElementById('voiceModal');
    openModal(modal);
    resetVoiceUI();
}

// Reset Voice UI
function resetVoiceUI() {
    const status = document.getElementById('voiceStatus');
    const transcript = document.getElementById('voiceTranscript');
    const startBtn = document.getElementById('startVoiceBtn');
    const stopBtn = document.getElementById('stopVoiceBtn');
    
    status.classList.remove('voice-recording');
    status.querySelector('.voice-status-text').textContent = 'Nhấn nút bên dưới và bắt đầu nói...';
    transcript.style.display = 'none';
    startBtn.style.display = 'inline-flex';
    stopBtn.style.display = 'none';
    
    // Reset waves
    document.querySelectorAll('.voice-wave').forEach(wave => {
        wave.classList.remove('listening');
    });
}

// Start Voice Recognition
function startVoiceRecognition() {
    if (!recognition) {
        showToast('error', '❌ Voice recognition không khả dụng');
        return;
    }
    
    try {
        recognition.start();
        console.log('🎤 Voice recognition started');
    } catch (error) {
        if (error.name === 'InvalidStateError') {
            // Already running
            console.log('⚠️ Already listening');
        } else {
            console.error('❌ Start error:', error);
            showToast('error', '❌ Không thể bắt đầu: ' + error.message);
        }
    }
}

// Stop Voice Recognition
function stopVoiceRecognition() {
    if (recognition && isListening) {
        recognition.stop();
        console.log('⏹️ Voice recognition stopped');
    }
}

// Handle Voice Start
function handleVoiceStart() {
    isListening = true;
    const status = document.getElementById('voiceStatus');
    const startBtn = document.getElementById('startVoiceBtn');
    const stopBtn = document.getElementById('stopVoiceBtn');
    
    status.classList.add('voice-recording');
    status.querySelector('.voice-status-text').textContent = '🎙️ Đang lắng nghe... Hãy nói!';
    startBtn.style.display = 'none';
    stopBtn.style.display = 'inline-flex';
    
    // Animate waves
    document.querySelectorAll('.voice-wave').forEach(wave => {
        wave.classList.add('listening');
    });
    
    console.log('🎙️ Listening started');
}

// Handle Voice Result
function handleVoiceResult(event) {
    const transcript = event.results[0][0].transcript;
    const confidence = event.results[0][0].confidence;
    
    console.log('📝 Transcript:', transcript);
    console.log('✅ Confidence:', (confidence * 100).toFixed(1) + '%');
    
    // Display transcript
    const transcriptEl = document.getElementById('voiceTranscript');
    const transcriptText = document.getElementById('transcriptText');
    transcriptEl.style.display = 'block';
    transcriptText.textContent = transcript;
    
    // Parse and fill form
    parseVoiceInput(transcript);
    
    // Show success
    showToast('success', '✅ Đã điền thông tin tự động!');
    
    // Close modal after 2 seconds
    setTimeout(() => {
        closeModal(document.getElementById('voiceModal'));
    }, 2000);
}

// Handle Voice Error
function handleVoiceError(event) {
    console.error('❌ Voice error:', event.error);
    
    let errorMessage = 'Đã xảy ra lỗi';
    
    switch (event.error) {
        case 'no-speech':
            errorMessage = 'Không nghe thấy giọng nói. Vui lòng thử lại!';
            break;
        case 'audio-capture':
            errorMessage = 'Không tìm thấy microphone. Kiểm tra quyền truy cập!';
            break;
        case 'not-allowed':
            errorMessage = 'Vui lòng cho phép truy cập microphone!';
            break;
        case 'network':
            errorMessage = 'Lỗi mạng. Kiểm tra kết nối internet!';
            break;
        default:
            errorMessage = 'Lỗi: ' + event.error;
    }
    
    showToast('error', '❌ ' + errorMessage);
    resetVoiceUI();
    isListening = false;
}

// Handle Voice End
function handleVoiceEnd() {
    isListening = false;
    const status = document.getElementById('voiceStatus');
    const startBtn = document.getElementById('startVoiceBtn');
    const stopBtn = document.getElementById('stopVoiceBtn');
    
    status.classList.remove('voice-recording');
    status.querySelector('.voice-status-text').textContent = 'Đã dừng lắng nghe';
    startBtn.style.display = 'inline-flex';
    stopBtn.style.display = 'none';
    
    // Stop wave animation
    document.querySelectorAll('.voice-wave').forEach(wave => {
        wave.classList.remove('listening');
    });
    
    console.log('🎙️ Listening ended');
}

// Parse Voice Input and Fill Form
function parseVoiceInput(text) {
    const lowerText = text.toLowerCase();
    
    // Extract family size (số người)
    const familySizeMatch = lowerText.match(/(\d+)\s*(người|thành viên|người trong gia đình)/i);
    if (familySizeMatch) {
        const size = parseInt(familySizeMatch[1]);
        document.getElementById('familySize').value = size;
        console.log('👨‍👩‍👧‍👦 Family size:', size);
    }
    
    // Extract budget (ngân sách)
    if (lowerText.includes('tiết kiệm') || lowerText.includes('rẻ') || lowerText.includes('ít tiền')) {
        document.getElementById('budget').value = 'tiết kiệm';
        console.log('💰 Budget: tiết kiệm');
    } else if (lowerText.includes('thoải mái') || lowerText.includes('cao cấp') || lowerText.includes('nhiều tiền')) {
        document.getElementById('budget').value = 'thoải mái';
        console.log('💰 Budget: thoải mái');
    } else if (lowerText.includes('trung bình') || lowerText.includes('bình thường')) {
        document.getElementById('budget').value = 'trung bình';
        console.log('💰 Budget: trung bình');
    }
    
    // Extract preferences (sở thích)
    const preferences = [];
    
    // Regional preferences
    if (lowerText.includes('miền bắc') || lowerText.includes('hà nội')) {
        preferences.push('món miền Bắc');
    }
    if (lowerText.includes('miền nam') || lowerText.includes('sài gòn') || lowerText.includes('hồ chí minh')) {
        preferences.push('món miền Nam');
    }
    if (lowerText.includes('miền trung') || lowerText.includes('huế')) {
        preferences.push('món miền Trung');
    }
    
    // Cooking style
    if (lowerText.includes('ít dầu') || lowerText.includes('ít mỡ') || lowerText.includes('thanh đạm')) {
        preferences.push('ít dầu mỡ');
    }
    if (lowerText.includes('cay') || lowerText.includes('매운')) {
        preferences.push('món cay');
    }
    if (lowerText.includes('ngọt')) {
        preferences.push('vị ngọt');
    }
    
    if (preferences.length > 0) {
        document.getElementById('preferences').value = preferences.join(', ');
        console.log('🍽️ Preferences:', preferences.join(', '));
    }
    
    // Extract restrictions (hạn chế)
    const restrictions = [];
    
    if (lowerText.includes('không ăn hải sản') || lowerText.includes('không thích hải sản')) {
        restrictions.push('không ăn hải sản');
    }
    if (lowerText.includes('chay') || lowerText.includes('ăn chay')) {
        restrictions.push('ăn chay');
    }
    if (lowerText.includes('không ăn thịt')) {
        restrictions.push('không ăn thịt');
    }
    if (lowerText.includes('không ăn trứng')) {
        restrictions.push('không ăn trứng');
    }
    if (lowerText.includes('dị ứng')) {
        restrictions.push('có dị ứng');
    }
    
    if (restrictions.length > 0) {
        document.getElementById('dietaryRestrictions').value = restrictions.join(', ');
        console.log('🚫 Restrictions:', restrictions.join(', '));
    }
    
    // Log full parse
    console.log('✅ Voice input parsed successfully');
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initVoiceInput();
});