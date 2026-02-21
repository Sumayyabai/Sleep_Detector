/**
 * app.js — Main Application Logic
 *
 * Handles webcam capture, image upload, API communication,
 * and UI updates for the SleepGuard AI sleep detection system.
 */

// ============================================
// State
// ============================================
let currentMode = 'webcam';
let webcamStream = null;
let autoDetectInterval = null;
let isProcessing = false;
let uploadedBase64 = null;
const detectionHistory = [];

// ============================================
// DOM References
// ============================================
const webcamSection = document.getElementById('webcam-section');
const uploadSection = document.getElementById('upload-section');
const webcamVideo = document.getElementById('webcam-video');
const captureCanvas = document.getElementById('capture-canvas');
const videoOverlay = document.getElementById('video-overlay');
const btnStartWebcam = document.getElementById('btn-start-webcam');
const btnCapture = document.getElementById('btn-capture');
const btnDetectUpload = document.getElementById('btn-detect-upload');
const autoDetectToggle = document.getElementById('auto-detect-toggle');
const statusIcon = document.getElementById('status-icon');
const statusText = document.getElementById('status-text');
const statusConfidence = document.getElementById('status-confidence');
const resultDetails = document.getElementById('result-details');
const resultDetailsText = document.getElementById('result-details-text');
const alarmSection = document.getElementById('alarm-section');
const historyList = document.getElementById('history-list');
const uploadPreview = document.getElementById('upload-preview');
const uploadPlaceholder = document.getElementById('upload-placeholder');
const uploadArea = document.getElementById('upload-area');

// ============================================
// Mode Switching
// ============================================
function switchMode(mode) {
    currentMode = mode;

    // Update buttons
    document.getElementById('btn-webcam').classList.toggle('active', mode === 'webcam');
    document.getElementById('btn-upload').classList.toggle('active', mode === 'upload');

    // Toggle sections
    if (mode === 'webcam') {
        webcamSection.classList.remove('hidden');
        uploadSection.classList.add('hidden');
    } else {
        webcamSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        // Stop webcam if switching away
        if (webcamStream) {
            stopAutoDetect();
        }
    }
}

// ============================================
// Webcam Functions
// ============================================
async function startWebcam() {
    try {
        // Initialize audio context on user interaction
        AlarmModule.initAudio();

        webcamStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            }
        });

        webcamVideo.srcObject = webcamStream;
        videoOverlay.classList.add('hidden');
        btnCapture.disabled = false;
        btnStartWebcam.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            Stop Webcam
        `;
        btnStartWebcam.onclick = stopWebcam;

        console.log('[App] Webcam started');
    } catch (err) {
        console.error('[App] Webcam error:', err);
        updateStatus('error', 'Camera access denied. Please allow camera permissions.');
    }
}

function stopWebcam() {
    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        webcamStream = null;
    }

    webcamVideo.srcObject = null;
    videoOverlay.classList.remove('hidden');
    btnCapture.disabled = true;
    autoDetectToggle.checked = false;
    stopAutoDetect();

    btnStartWebcam.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
        Start Webcam
    `;
    btnStartWebcam.onclick = startWebcam;

    console.log('[App] Webcam stopped');
}

function captureFrame() {
    if (!webcamStream) return null;

    const video = webcamVideo;
    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;

    const ctx = captureCanvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    return captureCanvas.toDataURL('image/jpeg', 0.8);
}

// ============================================
// Detection Functions
// ============================================
async function captureAndDetect() {
    if (isProcessing) return;

    const imageData = captureFrame();
    if (!imageData) {
        updateStatus('error', 'No webcam frame available');
        return;
    }

    await sendForDetection(imageData);
}

async function detectFromUpload() {
    if (isProcessing || !uploadedBase64) return;
    await sendForDetection(uploadedBase64);
}

async function sendForDetection(base64Image) {
    isProcessing = true;
    updateStatus('loading', 'Analyzing image...');

    try {
        const response = await fetch('/detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });

        const result = await response.json();

        if (result.status === 'error') {
            updateStatus('error', result.details || 'Detection failed');
        } else {
            updateStatus(result.status, getStatusLabel(result.status), result.confidence, result.details);

            // Handle alarm
            if (result.status === 'sleeping') {
                AlarmModule.startAlarm();
                alarmSection.classList.remove('hidden');
            } else {
                AlarmModule.stopAlarm();
                alarmSection.classList.add('hidden');
            }

            // Add to history
            addToHistory(result);
        }
    } catch (err) {
        console.error('[App] Detection error:', err);
        updateStatus('error', 'Failed to connect to server. Is it running?');
    }

    isProcessing = false;
}

// ============================================
// Auto Detection (Live Mode)
// ============================================
function toggleAutoDetect() {
    if (autoDetectToggle.checked) {
        startAutoDetect();
    } else {
        stopAutoDetect();
    }
}

function startAutoDetect() {
    if (!webcamStream) {
        autoDetectToggle.checked = false;
        return;
    }

    console.log('[App] Auto-detect started (3s interval)');
    // Capture immediately
    captureAndDetect();

    autoDetectInterval = setInterval(() => {
        if (!isProcessing && webcamStream) {
            captureAndDetect();
        }
    }, 3000);
}

function stopAutoDetect() {
    if (autoDetectInterval) {
        clearInterval(autoDetectInterval);
        autoDetectInterval = null;
    }
    console.log('[App] Auto-detect stopped');
}

// ============================================
// Image Upload Functions
// ============================================
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Initialize audio on user interaction
    AlarmModule.initAudio();

    const reader = new FileReader();
    reader.onload = (e) => {
        uploadedBase64 = e.target.result;
        uploadPreview.src = uploadedBase64;
        uploadPreview.classList.remove('hidden');
        uploadPlaceholder.classList.add('hidden');
        btnDetectUpload.disabled = false;
    };
    reader.readAsDataURL(file);
}

// Drag & Drop
if (uploadArea) {
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const input = document.getElementById('file-input');
            const dt = new DataTransfer();
            dt.items.add(file);
            input.files = dt.files;
            handleFileUpload({ target: input });
        }
    });
}

// ============================================
// UI Update Functions
// ============================================
function updateStatus(state, text, confidence = '', details = '') {
    // Update icon
    statusIcon.className = 'status-icon';

    const icons = {
        waiting: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
        loading: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>',
        awake: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
        sleeping: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 15s1.5-1 4-1 4 1 4 1"/><path d="M9 9.5h.01M15 9.5h.01"/><path d="M8.5 9L10 9M14 9L15.5 9"/></svg>',
        error: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
    };

    statusIcon.innerHTML = icons[state] || icons.waiting;
    statusIcon.classList.add(state);

    // Update text
    statusText.textContent = text;
    statusText.className = 'status-text';
    if (state === 'sleeping') statusText.classList.add('sleeping-text');
    if (state === 'awake') statusText.classList.add('awake-text');

    // Update confidence
    statusConfidence.textContent = confidence ? `Confidence: ${confidence}` : '';

    // Update details
    if (details) {
        resultDetails.classList.remove('hidden');
        resultDetailsText.textContent = details;
    } else {
        resultDetails.classList.add('hidden');
    }
}

function getStatusLabel(status) {
    const labels = {
        sleeping: '😴 SLEEPING DETECTED!',
        awake: '✅ AWAKE',
        error: '❌ Error'
    };
    return labels[status] || status;
}

function stopAlarm() {
    AlarmModule.stopAlarm();
    alarmSection.classList.add('hidden');
}

function addToHistory(result) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    detectionHistory.unshift({ ...result, time: timeStr });

    // Keep only last 10
    if (detectionHistory.length > 10) {
        detectionHistory.pop();
    }

    renderHistory();
}

function renderHistory() {
    if (detectionHistory.length === 0) {
        historyList.innerHTML = '<div class="history-empty">No detections yet</div>';
        return;
    }

    historyList.innerHTML = detectionHistory.map(item => `
        <div class="history-item">
            <div class="history-status">
                <span class="dot ${item.status}"></span>
                ${item.status === 'sleeping' ? '😴 Sleeping' : '✅ Awake'}
                <span style="color: var(--text-muted); font-weight: 400; font-size: 0.75rem;">(${item.confidence})</span>
            </div>
            <span class="history-time">${item.time}</span>
        </div>
    `).join('');
}

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('[SleepGuard AI] Application loaded');
    updateStatus('waiting', 'Waiting for image...');

    // Click on video overlay to start webcam
    videoOverlay.addEventListener('click', startWebcam);
});
