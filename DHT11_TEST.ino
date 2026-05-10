// ============================================================
//  DHT11 Sensor Test - Arduino UNO R4 WiFi
//  Standalone diagnostic code
// ============================================================

#include <DHT.h>

// --- DHT11 Configuration -----------------------------------
#define DHT_PIN  2        // Digital Pin 2
#define DHT_TYPE DHT11

DHT dht(DHT_PIN, DHT_TYPE);

// ===========================================================
void setup() {
  Serial.begin(115200);
  
  // Wait for serial to be ready
  while (!Serial) {
    delay(100);
  }
  
  delay(2000);  // Give user time to open Serial Monitor
  
  Serial.println("\n\n==============================");
  Serial.println("  DHT11 SENSOR TEST");
  Serial.println("==============================");
  Serial.print("DHT Type:    "); Serial.println("DHT11");
  Serial.print("Data Pin:    "); Serial.println(DHT_PIN);
  Serial.println("-------------------------------");
  
  // Initialize DHT
  dht.begin();
  Serial.println("DHT initialized. Waiting 2 seconds...");
  delay(2000);
  
  Serial.println("\nStarting readings...\n");
}

// ===========================================================
void loop() {
  Serial.println("-------------------------------");
  Serial.print("Time: ");
  Serial.print(millis() / 1000);
  Serial.println(" seconds");
  
  // Add stabilization delay (DHT11 needs ~2-3 seconds between reads)
  delay(2500);
  
  // Read humidity and temperature
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  float temperatureF = dht.readTemperature(true);  // Fahrenheit
  
  // Check if any reads failed
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("[ERROR] DHT11 read FAILED!");
    Serial.println("Possible causes:");
    Serial.println("  1. Check wiring (VCC=5V, GND, DATA=Pin2)");
    Serial.println("  2. Check if data pin needs 10kΩ pull-up resistor");
    Serial.println("  3. Sensor may be damaged");
    Serial.println("  4. Not waiting long enough between reads");
  } else {
    Serial.println("[SUCCESS] DHT11 reading OK!");
    Serial.print("  Humidity:       "); Serial.print(humidity); Serial.println(" %");
    Serial.print("  Temperature:    "); Serial.print(temperature); Serial.println(" °C");
    Serial.print("  Temperature:    "); Serial.print(temperatureF); Serial.println(" °F");
    
    // Calculate heat index (optional)
    float heatIndex = dht.computeHeatIndex(temperature, humidity, false);
    Serial.print("  Heat Index:     "); Serial.print(heatIndex); Serial.println(" °C");
    
    // Sanity check - valid ranges for DHT11
    if (humidity < 0 || humidity > 100) {
      Serial.println("  [WARNING] Humidity out of expected range (0-100%)");
    }
    if (temperature < -40 || temperature > 80) {
      Serial.println("  [WARNING] Temperature out of expected range (-40 to +80°C)");
    }
  }
  
  Serial.println();
  // Wait 5 seconds before next attempt
  delay(5000);
}
