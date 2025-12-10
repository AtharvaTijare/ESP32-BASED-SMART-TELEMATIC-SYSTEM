// --- GLOBAL & AUTH ---
const LOGGED_IN_USER_ID = localStorage.getItem('userId') || 'Guest_User';

// --- VARIABLES & INITIALIZATION ---
const systemToggle = document.getElementById('systemToggle');
const realTimeStatus = document.getElementById('realTimeStatus');
const smoothnessScoreElement = document.getElementById('smoothnessScore');
const corneringScoreElement = document.getElementById('corneringScore');
const riskGradeElement = document.getElementById('riskGrade');
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const connectEspBtn = document.getElementById('connectEspBtn');
const espBanner = document.getElementById('espConnectBanner');
const dataSourceText = document.getElementById('dataSourceText');

// --- UI ELEMENTS ---
const espChartsSection = document.getElementById('espChartsSection');
const vehicleNameDisplay = document.getElementById('vehicleNameDisplay');

// --- DATA CARD IDs ---
const dataSpeed = document.getElementById('dataSpeed');
const dataAccel = document.getElementById('dataAccel');
const dataAngVel = document.getElementById('dataAngVel');
const dataAccelX = document.getElementById('dataAccelX');
const dataAccelY = document.getElementById('dataAccelY');
const dataAccelZ = document.getElementById('dataAccelZ');
const dataGyroX = document.getElementById('dataGyroX');
const dataGyroY = document.getElementById('dataGyroY');
const dataGyroZ = document.getElementById('dataGyroZ');

// --- STATE VARIABLES ---
let isSystemActive = false;
let map;
let marker;
let polyline;
let currentLatLng = [20.5937, 78.9629]; // Default: Nagpur
let routeCoordinates = [];
let websocket = null;
let speedChart, accelChart;
let sessionDataLog = [];

// --- NEW SECTION VARIABLES ---
const sidebarLinks = document.querySelectorAll('.sidebar-link');
const viewSections = document.querySelectorAll('.view-section');
const profileForm = document.getElementById('profileForm');
const profileNameInput = document.getElementById('profileName');
const profileVehicleInput = document.getElementById('profileVehicle');
const formStatus = document.getElementById('formStatus');
const contactsForm = document.getElementById('contactsForm');
const contactNameInput = document.getElementById('contactName');
const contactPhoneInput = document.getElementById('contactPhone');
const contactsList = document.getElementById('contactsList');
const jsonUpload = document.getElementById('jsonUpload');
const historySummary = document.getElementById('historySummary');

// --- NEW ALERT/EVENT VARIABLES ---
const highSpeedCountElement = document.getElementById('highSpeedCount');
const sharpTurnCountElement = document.getElementById('sharpTurnCount');
const realTimeAlertElement = document.getElementById('realTimeAlert');
const alertMessageElement = document.getElementById('alertMessage');

let highSpeedCount = 0;
let sharpTurnCount = 0;
const HIGH_SPEED_THRESHOLD_KMH = 100.0; // km/h threshold for high-speed alert
const SHARP_TURN_THRESHOLD_RADS = 1.0;  // rad/s threshold for sharp turn (Gyro Z-axis)
let lastAlertTime = 0;
const ALERT_COOLDOWN_MS = 5000; // 5 seconds cooldown for alert message

// ==========================================
// --- APP INITIALIZATION (MASTER FUNCTION) ---
// ==========================================
function initApp() {
    userName.textContent = `Welcome, ${LOGGED_IN_USER_ID.split('@')[0]}`;

    initMap();
    connectEspBtn.onclick = () => {
        const ip = prompt("Enter your ESP32's IP address:", "192.168.1.10");
        if (ip) { initWebSocket(ip); }
    };

    initSidebarLinks();
    initProfileSettings();
    initContacts();
    initHistoryUploader();

    // Set default view
    showView('dashboardView');
    // Initialize alert display message
    alertMessageElement.textContent = 'System is inactive. Press ACTIVATE to begin monitoring.';
    realTimeAlertElement.style.backgroundColor = '#333';
    realTimeAlertElement.style.borderColor = '#FF4500';
    realTimeAlertElement.style.display = 'block';
}

// ==========================================
// --- PAGE/VIEW NAVIGATION ---
// ==========================================

function initSidebarLinks() {
    const links = {
        'linkDashboard': 'dashboardView',
        'linkHistory': 'historyView',
        'linkContacts': 'contactsView',
        'linkSettings': 'settingsView'
    };

    for (const [linkId, viewId] of Object.entries(links)) {
        const linkElement = document.getElementById(linkId);
        if (linkElement) {
            linkElement.onclick = () => showView(viewId);
        }
    }
}

function showView(viewId) {
    viewSections.forEach(section => {
        section.classList.remove('active');
    });
    sidebarLinks.forEach(link => {
        link.classList.remove('active');
    });

    document.getElementById(viewId)?.classList.add('active');

    const activeLink = document.getElementById(`link${viewId.charAt(0).toUpperCase() + viewId.slice(1).replace('View', '')}`);
    activeLink?.classList.add('active');

    // Re-initialize map when navigating back to dashboard, in case it was destroyed or map pane was hidden
    if (viewId === 'dashboardView') {
        initMap();
    }
}


// ==========================================
// --- SECTION 1: LIVE DASHBOARD CORE ---
// ==========================================

logoutBtn.onclick = () => {
    localStorage.removeItem('userId');
    window.location.replace("index.html");
};

function initMap() {
    // Logic to get current location and call setupLeafletMap (remains unchanged)
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => { currentLatLng = [position.coords.latitude, position.coords.longitude]; setupLeafletMap(currentLatLng); },
            (error) => { console.warn("Geolocation failed, using default."); setupLeafletMap(currentLatLng); },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    } else { setupLeafletMap(currentLatLng); }
}

function setupLeafletMap(latlng) {
    if (map) {
        map.remove();
    }
    map = L.map('map').setView(latlng, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
    marker = L.marker(latlng).addTo(map).bindPopup("Current Vehicle Location").openPopup();
    polyline = L.polyline(routeCoordinates, { color: '#FF4500', weight: 5 }).addTo(map);
}

function getChartConfig(dataLabel, color, yAxisTitle) {
    // Chart config remains unchanged
    return {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: dataLabel, data: [], borderColor: color, backgroundColor: `${color}33`, tension: 0.1
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: {
                    title: { display: true, text: yAxisTitle, color: color },
                    grid: { color: '#333' },
                    ticks: { color: '#B0B0B0' }
                },
                x: {
                    grid: { color: '#333' },
                    ticks: { color: '#B0B0B0' }
                }
            },
            plugins: { legend: { labels: { color: '#E0E0E0' } } }
        }
    };
}

function initSpeedChart() {
    if (speedChart) speedChart.destroy();
    const ctx = document.getElementById('speedChart').getContext('2d');
    speedChart = new Chart(ctx, getChartConfig('Speed (km/h)', '#FF4500', 'km/h'));
}
function initAccelChart() {
    if (accelChart) accelChart.destroy();
    const ctx = document.getElementById('accelChart').getContext('2d');
    accelChart = new Chart(ctx, getChartConfig('Acceleration (m/s²)', '#28A745', 'm/s²'));
}

function initWebSocket(ip) {
    let gateway = `ws://${ip}/ws`;
    dataSourceText.textContent = `Connecting to ${ip}...`;
    websocket = new WebSocket(gateway);
    websocket.onopen = onWsOpen;
    websocket.onclose = onWsClose;
    websocket.onmessage = onWsMessage;
    websocket.onerror = (err) => {
        console.error("WebSocket Error:", err);
        dataSourceText.textContent = "Connection failed. Check IP or firewall.";
    };
}

function onWsOpen(event) {
    // WebSocket open logic (remains unchanged, except alert initialization)
    espBanner.style.display = 'none';
    dataSourceText.textContent = "ESP32 Connected. Activate system to begin.";
    espChartsSection.style.display = 'grid';
    realTimeStatus.textContent = '🟢 ONLINE';
    realTimeStatus.classList.add('status-active');
    realTimeStatus.classList.remove('status-offline');
    initSpeedChart();
    initAccelChart();

    // Set initial connected alert
    alertMessageElement.textContent = 'Awaiting activation command...';
    realTimeAlertElement.style.backgroundColor = '#333';
    realTimeAlertElement.style.borderColor = '#FF4500';
    realTimeAlertElement.style.display = 'block';
}

function onWsClose(event) {
    // WebSocket close logic (remains unchanged)
    espBanner.style.display = 'flex';
    websocket = null;
    dataSourceText.textContent = "ESP32 Disconnected. Please reconnect.";
    espChartsSection.style.display = 'none';
    realTimeStatus.textContent = '🔴 OFFLINE';
    realTimeStatus.classList.remove('status-active');
    realTimeStatus.classList.add('status-offline');
    if (speedChart) speedChart.destroy();
    if (accelChart) accelChart.destroy();
    if (isSystemActive) {
        systemToggle.click();
    }
    // Reset counters on disconnect
    highSpeedCount = 0;
    sharpTurnCount = 0;
    highSpeedCountElement.textContent = 0;
    sharpTurnCountElement.textContent = 0;
    alertMessageElement.textContent = 'System disconnected. Please reconnect ESP32.';
    realTimeAlertElement.style.backgroundColor = '#49000A';
    realTimeAlertElement.style.borderColor = '#DC3545';
    realTimeAlertElement.style.display = 'block';
}


function onWsMessage(event) {
    if (!isSystemActive) return;

    try {
        const data = JSON.parse(event.data);

        // --- CRITICAL: Add timestamp for history ---
        data.timestamp = new Date().toISOString();
        sessionDataLog.push(data);

        const time = new Date().toLocaleTimeString();
        const resultantAccel = Math.sqrt(data.accel.x ** 2 + data.accel.y ** 2 + data.accel.z ** 2);
        const gForce = resultantAccel / 9.81;
        const resultantGyro = Math.sqrt(data.gyro.x ** 2 + data.gyro.y ** 2 + data.gyro.z ** 2);

        // --- 1. UPDATE DATA CARDS ---
        dataSpeed.textContent = data.speed.toFixed(1);
        dataAccel.textContent = resultantAccel.toFixed(2);
        dataAngVel.textContent = resultantGyro.toFixed(3);
        dataAccelX.textContent = data.accel.x.toFixed(3);
        dataAccelY.textContent = data.accel.y.toFixed(3);
        dataAccelZ.textContent = data.accel.z.toFixed(3);
        dataGyroX.textContent = data.gyro.x.toFixed(3);
        dataGyroY.textContent = data.gyro.y.toFixed(3);
        dataGyroZ.textContent = data.gyro.z.toFixed(3);

        // --- NEW: REAL-TIME EVENT DETECTION AND ALERT LOGIC ---
        let currentAlert = null;
        const currentTime = Date.now();

        // High Speed Alert (Threshold: 100.0 km/h)
        if (data.speed > HIGH_SPEED_THRESHOLD_KMH) {
            if (currentTime - lastAlertTime > ALERT_COOLDOWN_MS) {
                highSpeedCount++;
                highSpeedCountElement.textContent = highSpeedCount;
                currentAlert = `🚨 EXCESSIVE SPEED: ${data.speed.toFixed(1)} km/h! SLOW DOWN.`;
            }
        }

        // Sharp Turn Alert (Uses Gyro Z-axis for Yaw rate, Threshold: 1.0 rad/s)
        if (Math.abs(data.gyro.z) > SHARP_TURN_THRESHOLD_RADS) {
            if (currentTime - lastAlertTime > ALERT_COOLDOWN_MS) {
                sharpTurnCount++;
                sharpTurnCountElement.textContent = sharpTurnCount;
                currentAlert = `⚠️ SHARP TURN: Yaw Rate ${Math.abs(data.gyro.z).toFixed(2)} rad/s detected!`;
            }
        }

        // Display Alert with Cooldown
        if (currentAlert) {
            alertMessageElement.textContent = currentAlert;
            realTimeAlertElement.style.backgroundColor = '#49000A';
            realTimeAlertElement.style.borderColor = '#DC3545';
            realTimeAlertElement.style.display = 'block';
            lastAlertTime = currentTime;
            // Hide alert after cooldown period
            setTimeout(() => {
                // Check if the current alert is still the one that triggered the timeout
                if (Date.now() - lastAlertTime >= ALERT_COOLDOWN_MS) {
                    alertMessageElement.textContent = 'Smooth driving detected.';
                    realTimeAlertElement.style.backgroundColor = '#003300';
                    realTimeAlertElement.style.borderColor = '#28A745';
                }
            }, ALERT_COOLDOWN_MS);
        } else {
            // Default smooth driving message
            alertMessageElement.textContent = 'Smooth driving detected.';
            realTimeAlertElement.style.backgroundColor = '#003300';
            realTimeAlertElement.style.borderColor = '#28A745';
            realTimeAlertElement.style.display = 'block';
        }
        // --- END NEW LOGIC ---

        // --- 2. UPDATE CHARTS ---
        updateEspCharts(time, data.speed, resultantAccel);

        // --- 3. UPDATE MAP ---
        currentLatLng = [data.lat, data.lon];
        marker.setLatLng(currentLatLng);
        routeCoordinates.push(currentLatLng);
        polyline.setLatLngs(routeCoordinates);
        map.panTo(currentLatLng);

        // --- 4. UPDATE SCORES & RISK GRADE (remains unchanged) ---
        let riskLevel = gForce > 1.3 ? 1.0 : gForce > 0.95 ? 0.7 : 0.3;
        let currentSmoothness = parseFloat(smoothnessScoreElement.textContent.replace('%', '')) || 90;
        let currentCornering = parseFloat(corneringScoreElement.textContent.replace('%', '')) || 90;

        smoothnessScoreElement.textContent = `${Math.min(99, Math.max(0, currentSmoothness * 0.98 + (1 - riskLevel) * 5)).toFixed(0)}%`;
        corneringScoreElement.textContent = `${Math.min(99, Math.max(0, currentCornering * 0.98 + (1 - riskLevel) * 5)).toFixed(0)}%`;

        const gradeElement = riskGradeElement.querySelector('.grade');
        const emojiElement = riskGradeElement.querySelector('.emoji');
        const statusTextElement = riskGradeElement.querySelector('p');

        if (riskLevel >= 1.0) {
            gradeElement.textContent = 'F'; emojiElement.textContent = '🚨'; statusTextElement.textContent = 'CRITICAL: Extreme G-Force Detected!'; gradeElement.style.color = '#DC3545';
        }
        else if (riskLevel > 0.6) { gradeElement.textContent = 'C'; emojiElement.textContent = '⚠️'; statusTextElement.textContent = 'Moderate Risk Detected'; gradeElement.style.color = '#FFC107'; }
        else { gradeElement.textContent = 'A+'; emojiElement.textContent = '😌'; statusTextElement.textContent = 'Smooth Driving'; gradeElement.style.color = '#28A745'; }

    } catch (e) {
        console.error("Failed to parse WebSocket JSON data:", e);
    }
}

function updateEspCharts(time, speed, accel) {
    const charts = [speedChart, accelChart];
    const data = [speed, accel];

    for (let i = 0; i < charts.length; i++) {
        if (!charts[i]) continue;
        if (charts[i].data.labels.length > 20) {
            charts[i].data.labels.shift();
            charts[i].data.datasets[0].data.shift();
        }
        charts[i].data.labels.push(time);
        charts[i].data.datasets[0].data.push(data[i]);
        charts[i].update('quiet');
    }
}

function downloadSessionData() {
    if (sessionDataLog.length === 0) {
        return;
    }
    const dataToSave = {
        startTime: sessionDataLog[0].timestamp,
        endTime: sessionDataLog[sessionDataLog.length - 1].timestamp,
        dataPoints: sessionDataLog.length,
        log: sessionDataLog
    };
    const dataStr = JSON.stringify(dataToSave, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const timestamp = new Date(dataToSave.startTime).toISOString().replace(/:/g, '-').slice(0, 19);
    a.download = `TeleMetrix_Session_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

// --- MODIFIED FUNCTION ---
systemToggle.onclick = function () {
    if (isSystemActive) {
        // --- STOPPING ---
        isSystemActive = false;
        systemToggle.textContent = 'ACTIVATE MONITORING';
        systemToggle.classList.remove('active-status');

        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({ command: "STOP" }));
        }

        L.circle(currentLatLng, { color: 'red', fillColor: '#DC3545', fillOpacity: 0.6, radius: 200 }).addTo(map).bindPopup("Drive Session Ended").openPopup();

        // --- NEW: Get data *before* resetting UI and save history ---
        const finalGrade = riskGradeElement.querySelector('.grade').textContent;
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateTimeString = `${date} ${time}`;

        const historyTableBody = document.getElementById('historicDataBody');
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td>${dateTimeString}</td>
            <td>${finalGrade}</td>
        `;
        historyTableBody.prepend(newRow);
        const placeholderRows = historyTableBody.querySelectorAll('.placeholder-row');
        placeholderRows.forEach(row => row.remove());

        // Save session log
        downloadSessionData();

        // Now reset the UI
        riskGradeElement.querySelector('.grade').textContent = 'N/A';
        riskGradeElement.querySelector('.emoji').textContent = '😴';
        riskGradeElement.querySelector('p').textContent = 'System is inactive';
        riskGradeElement.querySelector('p').style.color = '#B0B0B0';
        smoothnessScoreElement.textContent = 'N/A';
        corneringScoreElement.textContent = 'N/A';

        // Reset event counters
        highSpeedCount = 0;
        sharpTurnCount = 0;
        highSpeedCountElement.textContent = 0;
        sharpTurnCountElement.textContent = 0;
        alertMessageElement.textContent = 'System is inactive. Press ACTIVATE to begin monitoring.';
        realTimeAlertElement.style.backgroundColor = '#333';
        realTimeAlertElement.style.borderColor = '#FF4500';
        realTimeAlertElement.style.display = 'block';

    } else {
        // --- STARTING ---
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            isSystemActive = true;
            systemToggle.textContent = 'STOP MONITORING';
            systemToggle.classList.add('active-status');

            if (polyline) map.removeLayer(polyline);
            routeCoordinates = [];
            polyline = L.polyline(routeCoordinates, { color: '#FF4500', weight: 5 }).addTo(map);

            sessionDataLog = [];
            smoothnessScoreElement.textContent = '90%';
            corneringScoreElement.textContent = '90%';
            initSpeedChart();
            initAccelChart();

            // Reset event counters
            highSpeedCount = 0;
            sharpTurnCount = 0;
            highSpeedCountElement.textContent = 0;
            sharpTurnCountElement.textContent = 0;
            alertMessageElement.textContent = 'Monitoring Active. Awaiting new data...';
            realTimeAlertElement.style.backgroundColor = '#333';
            realTimeAlertElement.style.borderColor = '#FF4500';
            realTimeAlertElement.style.display = 'block';

            websocket.send(JSON.stringify({ command: "START" }));
        } else {
            alert("ESP32 is not connected. Please connect the device first.");
        }
    }
}

// ==========================================
// --- SECTION 2: DRIVER HISTORY (Save/Load) ---
// ==========================================

function initHistoryUploader() {
    jsonUpload.onchange = handleFileUpload;
}

function handleFileUpload(event) {
    // File upload logic (remains unchanged)
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            displayHistoryData(data, file.name);
        } catch (err) {
            console.error("Error parsing JSON file:", err);
            alert("Could not read file. Is it a valid session JSON?");
        }
    };
    reader.readAsText(file);
}

function displayHistoryData(data, fileName) {
    // Display loaded data logic (remains unchanged)
    let logArray;
    let startTime, endTime;

    if (data.log && Array.isArray(data.log)) {
        logArray = data.log;
        startTime = new Date(data.startTime);
        endTime = new Date(data.endTime);
    }
    else if (Array.isArray(data) && data.length > 0) {
        logArray = data;
        startTime = new Date(logArray[0].timestamp);
        endTime = new Date(logArray[logArray.length - 1].timestamp);
    }
    else {
        alert("File is empty or invalid.");
        return;
    }

    const durationMs = endTime - startTime;
    const durationSec = Math.floor(durationMs / 1000);
    const durationMin = Math.floor(durationSec / 60);
    const durationStr = `${durationMin} min, ${durationSec % 60} sec`;

    let maxSpeed = 0;
    let maxAccel = 0;

    logArray.forEach(dataPoint => {
        if (dataPoint.speed > maxSpeed) {
            maxSpeed = dataPoint.speed;
        }
        const resultantAccel = Math.sqrt(dataPoint.accel.x ** 2 + dataPoint.accel.y ** 2 + dataPoint.accel.z ** 2);
        if (resultantAccel > maxAccel) {
            maxAccel = resultantAccel;
        }
    });

    document.getElementById('historyFileName').textContent = `Summary for: ${fileName}`;
    document.getElementById('historyStartTime').textContent = startTime.toLocaleString();
    document.getElementById('historyEndTime').textContent = endTime.toLocaleString();
    document.getElementById('historyDuration').textContent = durationStr;
    document.getElementById('historyMaxSpeed').textContent = `${maxSpeed.toFixed(1)} km/h`;
    document.getElementById('historyMaxAccel').textContent = `${maxAccel.toFixed(2)} m/s²`;

    historySummary.style.display = 'block';
}


// ==========================================
// --- SECTION 3: EMERGENCY CONTACTS ---
// ==========================================

function initContacts() {
    contactsForm.onsubmit = addContact;
    renderContacts();
}

function getContacts() {
    const contactsKey = `emergencyContacts_${LOGGED_IN_USER_ID}`;
    return JSON.parse(localStorage.getItem(contactsKey)) || [];
}

function saveContacts(contacts) {
    const contactsKey = `emergencyContacts_${LOGGED_IN_USER_ID}`;
    localStorage.setItem(contactsKey, JSON.stringify(contacts));
}

function addContact(event) {
    event.preventDefault();
    const name = contactNameInput.value;
    const phone = contactPhoneInput.value;

    if (name && phone) {
        const contacts = getContacts();
        contacts.push({ name, phone });
        saveContacts(contacts);
        renderContacts();
        contactsForm.reset();
    }
}

function renderContacts() {
    const contacts = getContacts();
    contactsList.innerHTML = '';

    if (contacts.length === 0) {
        contactsList.innerHTML = '<li>No contacts added yet.</li>';
        return;
    }

    contacts.forEach(contact => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div>
                <span class="contact-name">${contact.name}</span>
            </div>
            <span class="contact-phone">${contact.phone}</span>
        `;
        contactsList.appendChild(li);
    });
}


// ==========================================
// --- SECTION 4: SETTINGS ---
// ==========================================

function initProfileSettings() {
    profileForm.onsubmit = saveProfile;
    loadProfile();
}

function loadProfile() {
    const profileKey = `profile_${LOGGED_IN_USER_ID}`;
    const profile = JSON.parse(localStorage.getItem(profileKey)) || {};

    profileNameInput.value = profile.name || LOGGED_IN_USER_ID.split('@')[0];
    profileVehicleInput.value = profile.vehicle || 'Kawasaki H2R';

    vehicleNameDisplay.textContent = `Active Vehicle: ${profile.vehicle || 'Kawasaki H2R'}`;
}

function saveProfile(event) {
    event.preventDefault();
    const profile = {
        name: profileNameInput.value,
        vehicle: profileVehicleInput.value
    };

    const profileKey = `profile_${LOGGED_IN_USER_ID}`;
    localStorage.setItem(profileKey, JSON.stringify(profile));

    vehicleNameDisplay.textContent = `Active Vehicle: ${profile.vehicle}`;
    userName.textContent = `Welcome, ${profile.name}`;

    formStatus.textContent = "Saved!";
    setTimeout(() => { formStatus.textContent = ""; }, 2000);
}

// --- RUN APP ---
window.onload = initApp;