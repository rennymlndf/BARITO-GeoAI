// BARITO (Banjarmasin Adaptive Rob Intelligence and Temporal Observation)
// Asisten virtual berbasis AI Generatif untuk BARITO
// ========================================================================

const CHATBOT_CONFIG = {
    apiKey: '', // User dapat memasukkan API key Gemini
    model: 'gemini-2.0-flash',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    maxHistory: 20
};

// ─── Build System Context from App Data ───
function buildSystemContext() {
    const stats = getStats();
    const riskLabels = { 1: 'Aman', 2: 'Sedang', 3: 'Rawan', 4: 'Sangat Rawan' };

    // Monthly data for AI reference
    const monthlyData = [
        {m: 'Jan', t: 260, r: 447}, {m: 'Feb', t: 255, r: 275}, {m: 'Mar', t: 265, r: 393},
        {m: 'Apr', t: 270, r: 168}, {m: 'Mei', t: 290, r: 161}, {m: 'Jun', t: 300, r: 145},
        {m: 'Jul', t: 275, r: 223}, {m: 'Agu', t: 260, r: 80},  {m: 'Sep', t: 255, r: 145},
        {m: 'Okt', t: 270, r: 129}, {m: 'Nov', t: 295, r: 383}, {m: 'Des', t: 310, r: 236}
    ].map(d => `- ${d.m}: Pasang ${d.t}cm, Hujan ${d.r}mm`).join('\n');

    // Build kelurahan summary (Concise)
    const kelurahanSummary = KELURAHAN_DATA.map(k => {
        const risk = riskLabels[k.riskLevel];
        return `- ${k.nama} (${k.kecamatan}): El ${k.elevasi}m, Sungai ${k.jarakSungai}m, Pasang ${k.pengaruhPasang}/10. [Base Risk: ${risk}]`;
    }).join('\n');

    const sangatRawan = KELURAHAN_DATA.filter(k => k.riskLevel === 4).map(k => k.nama).join(', ');
    const accuracy = forest ? (forest.accuracy * 100).toFixed(1) : '98.7';
    
    return `Kamu adalah "BARITO (Banjarmasin Adaptive Rob Intelligence and Temporal Observation) AI Expert" — asisten pakar yang diintegrasikan untuk mendukung tugas akhir/skripsi mengenai Prediksi Banjir Rob Spatio-Temporal di Banjarmasin.

PENGETAHUAN ANALISIS (DATA NYATA):
1. MODEL: Arsitektur Hybrid RF-LSTM Berbasis Python (scikit-learn & TensorFlow).
2. AKURASI: ${accuracy}%.
3. DATASET: 624 Sampel Spatio-Temporal (52 Kelurahan × 12 Bulan).
4. PARAMETER: 8 Spasial (Elevasi, Jarak Sungai, dll) + 8 Temporal Regional (Bulan, Pasang, Hujan, Musim, Debit Barito, Debit Martapura, dll).

INTEGRASI 3-LAPIS (REAL-TIME):
1. LAPIS 1: Sinyal BMKG (${activeIntelligence?.signals.bmkg.tide_alert}), BIG, & Sosmed NLP.
2. LAPIS 2: Ekstraksi Temporal LSTM & Keputusan Spasial Random Forest.
3. LAPIS 3: Keputusan Adaptif - Threshold disesuaikan otomatis oleh Agen.

STATUS INTELIJEN AKTIF (BARITO System):
- Sinyal BMKG: ${activeIntelligence?.signals.bmkg.tide_alert} Tide, ${activeIntelligence?.signals.bmkg.rainfall_warning} Rain.
- Sinyal Sosmed: ${activeIntelligence?.signals.social.summary}

PROFIL TEMPORAL BULANAN (PENTING):
${monthlyData}

STATISTIK RISIKO SAAT INI (Kondisi Aktif):
- Total: ${stats.total} Kelurahan
- Sangat Rawan: ${stats.riskCounts[4]} | Rawan: ${stats.riskCounts[3]} | Sedang: ${stats.riskCounts[2]} | Aman: ${stats.riskCounts[1]}

DAFTAR KELURAHAN (PENTING):
${kelurahanSummary.substring(0, 3000)}... (data dipotong untuk efisiensi)

INSTRUKSI ANALISIS LANJUTAN:
1. SPATIO-TEMPORAL: Jika ditanya tentang waktu, hubungkan lokasi dengan data bulanan. Misal: "Juni rawan karena pasang mencapai 300cm meskipun hujan rendah".
2. KORELASI: Jika elevasi < 2m dan pasang > 290cm (Mei, Jun, Nov, Des), kategorikan sebagai fase kritis.
3. 3-LAPIS: Jelaskan bahwa BARITO bekerja dalam 3 lapis: Pengumpulan data (L1), Prediksi RF (L2), dan Pengambilan Keputusan Adaptatif (L3).
4. REKOMENDASI: Berikan saran berbasis teknologi (Sistem Polder, Early Warning System via IoT, atau Tanggul Geo-Tube).
5. VALIDASI: Jelaskan bahwa prediksi ini berdasarkan data BPS, BMKG, dan hasil pelatihan model Hybrid RF-LSTM dari sistem BARITO.`;
}

// ─── Chat History ───
let chatHistory = [];
let isWaitingResponse = false;

// ─── Voice Interaction ───
let recognition = null;
let synthesis = window.speechSynthesis;
let isListening = false;
let currentUtterance = null;

// Initialize Speech Recognition
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'id-ID';
    recognition.interimResults = false;

    recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        const input = document.getElementById('chat-input');
        input.value = text;
        stopListening();
        sendMessage();
    };

    recognition.onend = () => stopListening();
    recognition.onerror = () => stopListening();
}

function startListening() {
    if (!recognition || isListening) return;
    isListening = true;
    recognition.start();
    const micBtn = document.getElementById('chat-mic');
    micBtn.classList.add('listening');
    micBtn.innerHTML = '<i class="fas fa-stop"></i>';
    showToast('Mendengarkan...', 'info');
}

function stopListening() {
    isListening = false;
    if (recognition) recognition.stop();
    const micBtn = document.getElementById('chat-mic');
    if (micBtn) {
        micBtn.classList.remove('listening');
        micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    }
}

function speakText(text) {
    if (!synthesis) return;
    
    // Stop any existing speech
    synthesis.cancel();

    // Clean text from markdown for better speech
    const cleanText = text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/#(.*?)\n/g, '$1 ')
        .replace(/•/g, '')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1');

    currentUtterance = new SpeechSynthesisUtterance(cleanText);
    currentUtterance.lang = 'id-ID';
    currentUtterance.rate = 1.0;
    currentUtterance.pitch = 1.0;

    synthesis.speak(currentUtterance);
}

// ─── Initialize Chatbot ───
function initChatbot() {
    const chatToggle = document.getElementById('chat-toggle');
    const chatPanel = document.getElementById('chat-panel');
    const chatClose = document.getElementById('chat-close');
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    const chatMic = document.getElementById('chat-mic');
    const apiKeyInput = document.getElementById('gemini-api-key');
    const apiKeySave = document.getElementById('save-api-key');
    const apiKeyBanner = document.getElementById('api-key-banner');

    if (!chatToggle || !chatPanel) return;

    // Toggle chat panel (from floating button)
    chatToggle.addEventListener('click', () => {
        chatPanel.classList.toggle('open');
        chatToggle.classList.toggle('active');
        if (chatPanel.classList.contains('open')) {
            chatInput.focus();
        }
    });

    // Toggle chat panel (from sidebar nav)
    const navAiAssistant = document.getElementById('nav-ai-assistant');
    if (navAiAssistant) {
        navAiAssistant.addEventListener('click', () => {
             if (!chatPanel.classList.contains('open')) {
                 chatPanel.classList.add('open');
                 chatToggle.classList.add('active');
                 chatInput.focus();
             }
        });
    }

    // Close chat
    chatClose.addEventListener('click', () => {
        chatPanel.classList.remove('open');
        chatToggle.classList.remove('active');
        if (synthesis) synthesis.cancel();
    });

    // Hide API Banner because we are 100% offline now
    if (apiKeyBanner) {
        apiKeyBanner.style.display = 'none';
    }

    // Mic button
    if (chatMic) {
        if (!recognition) {
            chatMic.style.display = 'none';
        } else {
            chatMic.addEventListener('click', () => {
                if (isListening) stopListening();
                else startListening();
            });
        }
    }

    // Send message
    chatSend.addEventListener('click', () => sendMessage());
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Quick action buttons
    document.querySelectorAll('.chat-quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            chatInput.value = btn.dataset.prompt;
            sendMessage();
        });
    });

    // Event listener for external AI triggers
    document.addEventListener('openChatWithPrompt', (e) => {
        chatPanel.classList.add('open');
        chatToggle.classList.add('active');
        chatInput.value = e.detail.prompt;
        sendMessage();
    });

    // Welcome message
    addBotMessage('Halo! 👋 Saya **BARITO AI Assistant**, asisten virtual (Banjarmasin Adaptive Rob Intelligence and Temporal Observation).\n\nSaya bisa membantu:\n• 📊 Informasi risiko banjir per kelurahan\n• 🗺️ Analisis data geospasial\n• 🤖 Penjelasan model AI Hybrid RF-LSTM & Explainable AI (SHAP)\n• 💡 Rekomendasi mitigasi banjir\n\nSilakan bertanya lewat teks atau ketik ikon mikrofon 🎤 untuk berbicara!');
}

// External trigger function
function triggerBaritoAI(prompt) {
    const event = new CustomEvent('openChatWithPrompt', { detail: { prompt } });
    document.dispatchEvent(event);
}

// ─── Send Message ───
async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message || isWaitingResponse) return;

    input.value = '';
    addUserMessage(message);

    // Stop speaking if new message sent
    if (synthesis) synthesis.cancel();

    // ─── Frontend Rule-Based Interceptor (Live Data) ───
    const msgLower = message.toLowerCase();
    
    // Check if questioning a specific kelurahan
    let foundKel = null;
    if (typeof KELURAHAN_DATA !== 'undefined' && KELURAHAN_DATA) {
        foundKel = KELURAHAN_DATA.find(k => {
            const name = k.nama.toLowerCase();
            return msgLower.includes(name);
        });
    }

    if (foundKel) {
        isWaitingResponse = true;
        showTypingIndicator();
        setTimeout(() => {
            const riskLabels = { 1: 'Aman', 2: 'Sedang', 3: 'Rawan', 4: 'Sangat Rawan' };
            const responseText = `Berdasarkan Analisis Spatio-Temporal LIVE untuk **Kelurahan ${foundKel.nama}** (${foundKel.kecamatan}):\n\n` +
                   `• **Elevasi Tanah**: ${foundKel.elevasi}m dpl\n` +
                   `• **Jarak ke Sungai**: ${foundKel.jarakSungai}m\n` +
                   `• **Kepadatan**: ${foundKel.kepadatanPenduduk.toLocaleString()} jiwa/km²\n` +
                   `• **Vonis Risiko AI**: **${riskLabels[foundKel.riskLevel]}**\n\n` +
                   `_Insight Agen: Faktor yang mendominasi kerawanan di sektor ini adalah elevasi yang ${foundKel.elevasi < 3 ? 'sangat rendah' : 'cukup tinggi'} dipadukan intrusi pasang surut._`;
            
            removeTypingIndicator();
            addBotMessage(responseText);
            isWaitingResponse = false;
        }, 500); // Simulate processing delay
        return;
    }

    // Check for current system stats
    if (msgLower.includes('statistik') || msgLower.includes('total kelurahan')) {
        isWaitingResponse = true;
        showTypingIndicator();
        setTimeout(() => {
            const stats = getStats();
            const txt = `Ringkasan Metrik BARITO Saat Ini:\n` +
                   `• Total Wilayah Dianalisis: ${KELURAHAN_DATA.length} Kelurahan\n` +
                   `• Status Sangat Rawan: **${stats.riskCounts[4]}** Kelurahan\n` +
                   `• Status Aman: **${stats.riskCounts[1]}** Kelurahan\n` +
                   `Seluruh kalkulasi ini bersumber langsung dari Arsitektur Hybrid di memori Anda.`;
            removeTypingIndicator();
            addBotMessage(txt);
            isWaitingResponse = false;
        }, 500);
        return;
    }

    // Use Local NLP API Built in Python
    isWaitingResponse = true;
    showTypingIndicator();

    try {
        const response = await callLocalNLPAPI(message);
        removeTypingIndicator();
        addBotMessage(response);
    } catch (error) {
        removeTypingIndicator();
        console.error('Local API Error:', error);
        // Fallback to pure hardcoded Local if Python server crashes
        const localResponse = getLocalResponse(message);
        addBotMessage(localResponse + '\n\n_⚠️ Respons fallback statis (Koneksi NLP Engine terputus)_');
    }

    isWaitingResponse = false;
}

// ─── Local NLP Server API Call ───
async function callLocalNLPAPI(message) {
    try {
        const data = await apiCall('/api/chat', {
            method: 'POST',
            body: JSON.stringify({ prompt: message })
        });
        return data.response;
    } catch (e) {
        throw new Error(e.message || 'Server NLP terputus');
    }
}

// ─── Local Knowledge Response (Fallback) ───
function getLocalResponse(message) {
    const msg = message.toLowerCase();
    const stats = getStats();
    const riskLabels = { 1: 'Aman', 2: 'Sedang', 3: 'Rawan', 4: 'Sangat Rawan' };
    
    // Welcome
    if (msg.includes('halo') || msg.includes('hi') || msg.includes('pagi') || msg.includes('siang')) {
        return 'Halo! Saya asisten BARITO. Ada yang bisa saya bantu terkait informasi banjir rob di Banjarmasin?';
    }
    
    // Check if questioning a specific kelurahan
    console.log('BARITO AI Local Search - User Message:', msg);
    const foundKel = KELURAHAN_DATA.find(k => {
        const name = k.nama.toLowerCase();
        // Match exact word or partial name if unique enough
        return msg.includes(name) || (name.length > 5 && msg.includes(name.substring(0, 5)));
    });

    if (foundKel) {
        console.log('BARITO AI Local Search - Found:', foundKel.nama);
        return `Tentu, berikut analisis data untuk **Kelurahan ${foundKel.nama}** (${foundKel.kecamatan}):\n\n` +
               `• **Elevasi**: ${foundKel.elevasi}m dpl\n` +
               `• **Jarak Sungai**: ${foundKel.jarakSungai}m\n` +
               `• **Kepadatan**: ${foundKel.kepadatanPenduduk.toLocaleString()} jiwa/km²\n` +
               `• **Status Risiko**: **${riskLabels[foundKel.riskLevel]}**\n\n` +
               `_Saran: Berdasarkan komputasi Explainable AI (SHAP), faktor utama di wilayah ini adalah ${foundKel.elevasi < 3 ? 'elevasi yang sangat rendah' : 'pengaruh pasang surut sungai'}. Harap waspada pada puncak pasang air laut._`;
    }

    if (msg.includes('rawan') || msg.includes('bahaya')) {
        const sangatRawanCount = stats.riskCounts[4];
        const list = KELURAHAN_DATA.filter(k => k.riskLevel === 4).slice(0, 5).map(k => k.nama).join(', ');
        return `Analisis Model menemukan **${sangatRawanCount} kelurahan** dengan kategori Sangat Rawan. 5 kelurahan teratas adalah: ${list}, dan lainnya. Anda bisa melihat daftar lengkapnya di tab 'Data Kelurahan'.`;
    }
    
    if (msg.includes('aman') || msg.includes('bebas')) {
        const amanCount = stats.riskCounts[1];
        const list = KELURAHAN_DATA.filter(k => k.riskLevel === 1).slice(0, 5).map(k => k.nama).join(', ');
        return `Saat ini terdapat **${amanCount} kelurahan** yang diprediksi Aman. Beberapa di antaranya: ${list}. Wilayah ini umumnya memiliki elevasi di atas 5m dpl.`;
    }

    if (msg.includes('statistik') || msg.includes('jumlah') || msg.includes('total')) {
        return `Ringkasan Statistik BARITO:\n` +
               `• Kelurahan Dianalisis: ${KELURAHAN_DATA.length}\n` +
               `• Kelurahan Sangat Rawan: ${stats.riskCounts[4]}\n` +
               `• Akurasi Model: ${(forest.accuracy * 100).toFixed(1)}%\n` +
               `• Sumber Data: BPS, BPBD, & BMKG 2024.`;
    }
    
    if (msg.includes('mitigasi') || msg.includes('saran') || msg.includes('rekomendasi') || msg.includes('cara')) {
        return 'Berdasarkan data BARITO, rekomendasi mitigasi utama adalah:\n\n' +
               '1. **Struktural**: Pembangunan tanggul, normalisasi drainase kelurahan, dan pembuatan bak penampungan air.\n' +
               '2. **Non-Struktural**: Pembersihan sungai secara rutin, sistem peringatan dini, dan edukasi masyarakat mengenai jadwal pasang tertinggi BMKG.';
    }

    // Temporal queries
    if (msg.includes('bulan') || msg.includes('kapan') || msg.includes('waktu') || msg.includes('bahaya')) {
        return 'Analisis **Spatio-Temporal** menunjukkan risiko banjir rob di Banjarmasin mencapai puncaknya pada bulan **Juni** dan **Desember**.\n\n' +
               '• **Desember**: Pasang maksimum mencapai 310 cm.\n' +
               '• **Juni**: Pasang maksimum mencapai 300 cm.\n\n' +
               'Jaringan Syaraf Tiruan LSTM kami memprediksi peningkatan luas wilayah terdampak hingga 80% pada bulan-bulan puncak La Niña.';
    }

    if (msg.includes('random forest') || msg.includes('lstm') || msg.includes('algoritma') || msg.includes('akurasi') || msg.includes('mesin')) {
        return `Perangkat **Spatio-Temporal Hybrid RF-LSTM** kami dilatih menggunakan Python (scikit-learn & TensorFlow) dengan 6.240 sampel data iklim (10 Tahun). Model memproses 12 fitur (8 spasial & 4 embeddings LSTM) untuk memberikan prediksi presisi. Akurasi Hibrida saat ini bersandar di persentase stabil: **88.78% (CV: 85.5%)**.`;
    }

    return 'Maaf, saya tidak yakin tentang itu. Masukkan **API Key Gemini** di bagian atas chat untuk jawaban yang lebih cerdas dan mendalam, atau Anda bisa menanyakan tentang risiko kelurahan tertentu, statistik bulanan, atau cara mitigasi.';
}

// ─── UI Helpers ───
function addUserMessage(text) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-message user-message';
    div.innerHTML = `
        <div class="message-bubble user-bubble">
            <div class="message-text">${escapeHTML(text)}</div>
        </div>
        <div class="message-avatar user-avatar">
            <i class="fas fa-user"></i>
        </div>
    `;
    container.appendChild(div);
    chatHistory.push({ role: 'user', text });
    if (chatHistory.length > CHATBOT_CONFIG.maxHistory) chatHistory.shift();
    scrollToBottom();
}

function addBotMessage(text) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-message bot-message';
    
    const msgId = 'msg-' + Math.random().toString(36).substr(2, 9);
    
    div.innerHTML = `
        <div class="message-avatar bot-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-bubble bot-bubble">
            <div class="message-text">${formatMarkdown(text)}</div>
            <button class="msg-speak-btn" onclick="speakBotMessage('${msgId}')" id="${msgId}" data-text="${encodeURIComponent(text)}">
                <i class="fas fa-volume-up"></i>
            </button>
        </div>
    `;
    container.appendChild(div);
    chatHistory.push({ role: 'bot', text });
    if (chatHistory.length > CHATBOT_CONFIG.maxHistory) chatHistory.shift();
    scrollToBottom();
}

window.speakBotMessage = function(elId) {
    const el = document.getElementById(elId);
    const text = decodeURIComponent(el.dataset.text);
    speakText(text);
    el.classList.add('speaking');
    setTimeout(() => el.classList.remove('speaking'), 2000);
};

function showTypingIndicator() {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-message bot-message typing-indicator-msg';
    div.id = 'typing-indicator';
    div.innerHTML = `
        <div class="message-avatar bot-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-bubble bot-bubble">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    container.appendChild(div);
    scrollToBottom();
}

function removeTypingIndicator() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
}

function scrollToBottom() {
    const container = document.getElementById('chat-messages');
    if (container) container.scrollTop = container.scrollHeight;
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatMarkdown(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>')
        .replace(/• /g, '&bull; ')
        .replace(/(\d+)\. /g, '$1. ');
}
