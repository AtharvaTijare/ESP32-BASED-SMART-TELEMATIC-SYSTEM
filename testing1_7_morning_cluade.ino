#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <MPU6050.h>

// ===== WiFi Configuration =====
const char* ssid = "Network_name";           // Replace with your WiFi SSID
const char* password = "987654320";   // Replace with your WiFi password

// ===== Hardware Setup =====
MPU6050 mpu;

// ===== WebSocket Server =====
WebSocketsServer webSocket = WebSocketsServer(80);

// ===== System State =====
bool monitoringActive = false;
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 100;  // Send data every 100ms

// ===== Sensor Data Variables =====
struct SensorData {
  float speed = 0.0;
  float lat = 20.5937;    // Default latitude (India)
  float lon = 78.9629;    // Default longitude (India)
  float accelX = 0.0;
  float accelY = 0.0;
  float accelZ = 0.0;
  float gyroX = 0.0;
  float gyroY = 0.0;
  float gyroZ = 0.0;
} sensorData;

// ===== Function Prototypes =====
void setupWiFi();
void setupMPU6050();
void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length);
void readSensors();
void sendSensorData();

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n=== TeleMetrix ESP32 Starting ===");
  
  // Initialize I2C for MPU6050
  Wire.begin(21, 22);  // SDA=21, SCL=22
  
  // Setup components
  setupWiFi();
  setupMPU6050();
  
  // Start WebSocket server
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  
  Serial.println("=== System Ready ===");
  Serial.print("Connect to: ws://");
  Serial.print(WiFi.localIP());
  Serial.println("/ws");
}

void loop() {
  webSocket.loop();
  
  // Send sensor data if monitoring is active
  if (monitoringActive && (millis() - lastSendTime >= sendInterval)) {
    readSensors();
    sendSensorData();
    lastSendTime = millis();
  }
}

// ===== WiFi Setup =====
void setupWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi Connection Failed!");
    Serial.println("Creating Access Point...");
    WiFi.softAP("TeleMetrix-ESP32", "telemetrix123");
    Serial.print("AP IP: ");
    Serial.println(WiFi.softAPIP());
  }
}

// ===== MPU6050 Setup =====
void setupMPU6050() {
  Serial.println("Initializing MPU6050...");
  
  mpu.initialize();
  
  if (mpu.testConnection()) {
    Serial.println("MPU6050 Connected Successfully!");
    
    // Configure MPU6050
    mpu.setFullScaleAccelRange(MPU6050_ACCEL_FS_2);  // ±2g
    mpu.setFullScaleGyroRange(MPU6050_GYRO_FS_250);  // ±250°/s
    
  } else {
    Serial.println("MPU6050 Connection Failed!");
  }
}

// ===== WebSocket Event Handler =====
void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.printf("[%u] Disconnected!\n", num);
      monitoringActive = false;
      break;
      
    case WStype_CONNECTED: {
      IPAddress ip = webSocket.remoteIP(num);
      Serial.printf("[%u] Connected from %d.%d.%d.%d\n", num, ip[0], ip[1], ip[2], ip[3]);
      break;
    }
    
    case WStype_TEXT: {
      Serial.printf("[%u] Received: %s\n", num, payload);
      
      // Parse JSON command
      StaticJsonDocument<200> doc;
      DeserializationError error = deserializeJson(doc, payload);
      
      if (!error) {
        const char* command = doc["command"];
        
        if (strcmp(command, "START") == 0) {
          monitoringActive = true;
          Serial.println("Monitoring STARTED");
        } 
        else if (strcmp(command, "STOP") == 0) {
          monitoringActive = false;
          Serial.println("Monitoring STOPPED");
        }
      }
      break;
    }
    
    default:
      break;
  }
}

// ===== Read Sensor Data =====
void readSensors() {
  // Read MPU6050 accelerometer (raw values)
  int16_t ax, ay, az;
  mpu.getAcceleration(&ax, &ay, &az);
  
  // Convert to m/s² (LSB sensitivity for ±2g is 16384)
  sensorData.accelX = (ax / 16384.0) * 9.81;
  sensorData.accelY = (ay / 16384.0) * 9.81;
  sensorData.accelZ = (az / 16384.0) * 9.81;
  
  // Read MPU6050 gyroscope (raw values)
  int16_t gx, gy, gz;
  mpu.getRotation(&gx, &gy, &gz);
  
  // Convert to rad/s (LSB sensitivity for ±250°/s is 131)
  sensorData.gyroX = (gx / 131.0) * (PI / 180.0);
  sensorData.gyroY = (gy / 131.0) * (PI / 180.0);
  sensorData.gyroZ = (gz / 131.0) * (PI / 180.0);
  
  // Simulate speed from accelerometer
  static float velocity = 0.0;
  float accelMagnitude = sqrt(pow(sensorData.accelX, 2) + 
                               pow(sensorData.accelY, 2) + 
                               pow(sensorData.accelZ, 2));
  velocity += accelMagnitude * (sendInterval / 1000.0); // v = at
  sensorData.speed = max(0.0f, velocity * 3.6f); // Convert m/s to km/h
  
  // Decay velocity (simulate friction)
  velocity *= 0.98;
  
  // Simulate location drift (small random changes)
  sensorData.lat += (random(-100, 100) / 1000000.0);
  sensorData.lon += (random(-100, 100) / 1000000.0);
}

// ===== Send Data via WebSocket =====
void sendSensorData() {
  StaticJsonDocument<300> doc;
  
  doc["speed"] = sensorData.speed;
  doc["lat"] = sensorData.lat;
  doc["lon"] = sensorData.lon;
  
  JsonObject accel = doc.createNestedObject("accel");
  accel["x"] = sensorData.accelX;
  accel["y"] = sensorData.accelY;
  accel["z"] = sensorData.accelZ;
  
  JsonObject gyro = doc.createNestedObject("gyro");
  gyro["x"] = sensorData.gyroX;
  gyro["y"] = sensorData.gyroY;
  gyro["z"] = sensorData.gyroZ;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  webSocket.broadcastTXT(jsonString);
}