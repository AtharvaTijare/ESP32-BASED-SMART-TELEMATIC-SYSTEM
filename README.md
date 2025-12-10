

# 🏍️ TeleMetrix: Intelligent Vehicle Monitoring Platform

TeleMetrix is a high-performance, real-time vehicle monitoring platform built for high-performance vehicles like the **Kawasaki H2R**. It uses an ESP32 microcontroller with an MPU6050 sensor to stream telemetry data (speed, acceleration, angular velocity, GPS location) to a web-based dashboard via WebSockets. The platform provides real-time driver scoring, accident risk assessment, and historical drive analysis, all presented with an aggressive, professional, government-data-inspired black and orange aesthetic.

## ✨ Features

  * **Real-Time Telemetry:** Streams live sensor data from the ESP32 to the dashboard using WebSockets.
  * **Driver Scoring:** Calculates real-time scores for **Smoothness** and **Cornering** based on G-force and angular velocity.
  * **Accident Risk Assessment:** Displays an instantaneous **Risk Grade** (A+ to F) based on detected extreme G-force events.
  * **Real-Time Event Logging:** Automatically detects and logs **High Speed Alerts** (\>$100$ km/h) and **Sharp Turns** (\>$1.0$ rad/s).
  * **Live GPS Tracking:** Uses Leaflet.js to plot the vehicle's real-time location and driving route.
  * **Interactive Charts:** Dynamic charts for **Speed vs. Time** and **Acceleration vs. Time**.
  * **Secure Simulation:** Implements a client-side login/registration system using `localStorage`.
  * **Session History:** Records live drive data and allows users to download/upload session files (JSON format) for later analysis.
  * **Emergency Contacts:** Allows saving emergency contact information locally.

## 🛠️ Technology Stack

| Component | Files | Description |
| :--- | :--- | :--- |
| **Microcontroller** | `testing1_7_morning_cluade.ino` | ESP32 running Arduino code for sensor reading and WebSocket server. |
| **Sensors** | `testing1_7_morning_cluade.ino` | MPU6050 (Accelerometer & Gyroscope) for motion data. |
| **Backend/IoT Protocol** | `testing1_7_morning_cluade.ino` | WebSockets for low-latency, real-time data streaming. |
| **Frontend** | `index.html`, `dashboard.html` | HTML5 structure for the landing page and the main application dashboard. |
| **Styling** | `index.css`, `dashboard.css` | Aggressive Black & Orange dark theme. Utilizes CSS Grid/Flexbox for responsive layout. |
| **Client-Side Logic** | `index.js`, `dashboard.js` | Core JavaScript for user authentication, dashboard logic, WebSocket client, chart manipulation (Chart.js), and map integration (Leaflet.js). |

## ⚙️ ESP32 Hardware & Setup

The platform relies on an ESP32 device connected to an MPU6050 module.

### ESP32 (Arduino) Code Summary (`testing1_7_morning_cluade.ino`)

The Arduino sketch configures the ESP32 to act as a WebSocket server and a sensor data provider.

  * [cite_start]**Libraries:** `WiFi.h`, `WebSocketsServer.h`, `ArduinoJson.h`, `Wire.h`, `MPU6050.h`[cite: 1].
  * [cite_start]**I2C Configuration:** Uses GPIO $21$ (SDA) and $22$ (SCL) for the MPU6050[cite: 11].
  * [cite_start]**MPU6050 Setup:** Configured for $\pm2g$ accelerometer range and $\pm250^\circ/s$ gyroscope range[cite: 19, 20].
  * **Data Acquisition:** Sensor data is read and converted:
      * [cite_start]Accelerometer raw values are converted to **$m/s^2$** (using a sensitivity of $16384$ for $\pm2g$)[cite: 32, 33, 34].
      * [cite_start]Gyroscope raw values are converted to **$rad/s$** (using a sensitivity of $131$ for $\pm250^\circ/s$ and conversion factor $\pi/180^\circ$)[cite: 35, 36, 37].
      * [cite_start]**Speed Simulation:** Speed in $km/h$ is simulated by integrating the acceleration magnitude ($v = at$) and applying a decay factor (0.98) to mimic friction, with data sent every $100ms$[cite: 38, 39, 40, 41, 5].
  * [cite_start]**WebSocket Control:** The ESP32 is controlled by `START` and `STOP` commands received from the client via WebSocket to activate/deactivate monitoring and data streaming[cite: 27, 28, 29].

### Initial Setup

1.  **Configure WiFi:** Update the following lines in `testing1_7_morning_cluade.ino` with your local network credentials:
    ```cpp
    const char* ssid = "Network_name"; [cite_start]// Replace with your WiFi SSID [cite: 2]
    const char* password = "987654320"; [cite_start]// Replace with your WiFi password [cite: 3]
    ```
2.  **Upload:** Upload the sketch to your ESP32 board.
3.  [cite_start]**Find IP:** The ESP32 will print its local IP address in the Serial Monitor (e.g., `Connect to: ws://192.168.1.XX/ws`)[cite: 12]. You will need this IP address on the dashboard to connect.

## 🚀 Getting Started with the Web App

### 1\. File Structure

Ensure you have the following files in your project directory:

```
/
├── index.html
├── index.css
├── index.js
├── dashboard.html
├── dashboard.css
├── dashboard.js
└── testing1_7_morning_cluade.ino
```

### 2\. Run the Web Application

Open `index.html` in your web browser.

### 3\. Login / Registration

The platform uses client-side local storage for a simulated authentication layer:

1.  Click **"System Login"** or **"Access Live Telemetry (H2R)"**.
2.  Navigate to the **REGISTER** tab.
3.  Create an account (Email/Password). Passwords are **NOT** hashed in this demo; they are stored in plain text in `localStorage` for simulation purposes only.
4.  Log in using your registered credentials.
5.  A smooth animation will play, and you will be redirected to `dashboard.html`.

### 4\. Connect to ESP32

1.  On the dashboard, click the **"Connect ESP32"** button in the warning banner.
2.  Enter the **IP Address** that the ESP32 printed to its Serial Monitor (e.g., `192.168.1.10`).
3.  The **System Status** indicator will change from `🔴 OFFLINE` to `🟢 ONLINE`.

### 5\. Start Monitoring

1.  Click the large **"ACTIVATE MONITORING"** button. This sends a `{"command": "START"}` WebSocket message to the ESP32.
2.  The button text changes to `STOP MONITORING`, and the ESP32 begins streaming data every $100ms$.
3.  The dashboard will begin updating:
      * **Data Cards:** Speed, G-Force, Angular Velocity, and raw MPU6050 readings update live.
      * **Map:** The vehicle marker moves, and a route path is drawn.
      * **Charts:** Speed and Acceleration charts plot the last 20 data points.
      * **Event Log:** Alerts for high speed and sharp turns will appear with a 5-second cooldown.
      * **Scores/Grade:** Driver scores and the risk grade are calculated and updated.

### 6\. End Session

1.  Click the **"STOP MONITORING"** button. This sends a `{"command": "STOP"}` message to the ESP32.
2.  The dashboard will automatically:
      * **Save Session:** A JSON file (`TeleMetrix_Session_*.json`) is downloaded to your browser with all the recorded telemetry data (`sessionDataLog`).
      * **Update History:** The session is added to the **Last Drives** list in the sidebar.
      * **Reset UI:** The counters and scores are reset, and an end-of-drive marker is placed on the map.
