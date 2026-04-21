/*
  SustainX Smart Dustbin Alert System
  ESP32 IoT Client Example
  
  Description:
  Sends a POST request to the SustainX backend when the dustbin level
  (simulated or measured via Ultrasonic sensor) reaches >= 80%.
*/

#include <WiFi.h>
#include <HTTPClient.h>

// --- Configuration ---
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Backend URL & API Key
const char* serverUrl = "http://YOUR_LOCAL_IP:5000/api/iot/data";
const char* iotSecret = "sustainx_iot_secret";

// Dustbin Configuration
const char* block = "A"; // Assigned block for this ESP32

void setup() {
  Serial.begin(115200);

  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to WiFi!");
}

void loop() {
  // 1. Measure Dustbin Level (Simulated for this example)
  // Replace this with actual sensor logic (e.g., HC-SR04 Ultrasonic)
  int fillLevelPercentage = 92; // Simulated 92% full

  if (fillLevelPercentage >= 80) {
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      
      // Initialize HTTP request
      http.begin(serverUrl);
      
      // Set headers
      http.addHeader("Content-Type", "application/json");
      http.addHeader("x-api-key", iotSecret);

      // Prepare JSON payload
      String payload = "{\"block\":\"" + String(block) + "\", \"level\":" + String(fillLevelPercentage) + "}";

      Serial.print("Sending Alert: ");
      Serial.println(payload);

      // Send POST request
      int httpResponseCode = http.POST(payload);

      if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.print("Response Code: ");
        Serial.println(httpResponseCode);
        Serial.println("Server Response: " + response);
      } else {
        Serial.print("Error on sending POST: ");
        Serial.println(httpResponseCode);
      }

      http.end();
    } else {
      Serial.println("WiFi Disconnected");
    }
  }

  // Poll every 30 seconds to prevent spamming the server
  delay(30000); 
}
