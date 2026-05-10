// ============================================================
//  Smart Farm IoT Node — Arduino UNO R4 WiFi
//  UPGRADED: SSL + Wake-Publish-Sleep Power Management
//  FIXED: Better wake timing, DHT stabilization
// ============================================================

#include <DHT.h>
#include <WiFiS3.h>
#include <WiFiSSLClient.h>
#include <Adafruit_MQTT.h>
#include <Adafruit_MQTT_Client.h>

// --- CHANGE PER DEVICE -------------------------------------
const char* SENSOR_ID = "NODE_03";
const char* LOCATION  = "Pasay_Station";

// --- WiFi --------------------------------------------------
const char* WIFI_SSID = "Converge_2.4GHz_gZ2H";
const char* WIFI_PASS = "qu4pFbHE";

// --- Adafruit IO -------------------------------------------
#define MQTT_SERVER  "io.adafruit.com"
#define MQTT_PORT    8883
#define AIO_USERNAME "RenHenryDelgado"
#define AIO_KEY      "YOUR_AIO_KEY_HERE"  // Replace with your Adafruit IO key

// --- Feeds -------------------------------------------------
#define FEED_TEMPERATURE  AIO_USERNAME "/feeds/smartfarm.temperature"
#define FEED_HUMIDITY     AIO_USERNAME "/feeds/smartfarm.humidity"
#define FEED_LDR          AIO_USERNAME "/feeds/smartfarm.ldr"
#define FEED_STATUS       AIO_USERNAME "/feeds/smartfarm.status"

// --- Pins --------------------------------------------------
#define DHT_PIN  2
#define DHT_TYPE DHT11
#define LDR_PIN  A0
#define LED_RED  7

// --- Sleep duration (15 minutes = 900,000 ms) --------------
#define SLEEP_DURATION_MS 15000UL

// --- Thresholds --------------------------------------------
const int LDR_THRESHOLD = 300;

// --- Globals -----------------------------------------------
DHT           dht(DHT_PIN, DHT_TYPE);
WiFiSSLClient wifiClient;

Adafruit_MQTT_Client   mqtt(&wifiClient, MQTT_SERVER, MQTT_PORT, AIO_USERNAME, AIO_KEY);
Adafruit_MQTT_Publish  feedTemperature(&mqtt, FEED_TEMPERATURE);
Adafruit_MQTT_Publish  feedHumidity   (&mqtt, FEED_HUMIDITY);
Adafruit_MQTT_Publish  feedLDR        (&mqtt, FEED_LDR);
Adafruit_MQTT_Publish  feedStatus     (&mqtt, FEED_STATUS);

// ===========================================================
void setup() {
  Serial.begin(115200);
  dht.begin();
  pinMode(LED_RED, OUTPUT);

  blinkLED(3, 150);

  Serial.println("==============================");
  Serial.println("  Smart Farm Sensor Node");
  Serial.print("  ID:        "); Serial.println(SENSOR_ID);
  Serial.print("  Location:  "); Serial.println(LOCATION);
  Serial.println("  Mode:      Wake-Publish-Sleep");
  Serial.println("  Transport: MQTTS SSL :8883");
  Serial.println("==============================");
}

// ===========================================================
//  MAIN LOOP — Wake → Read → Publish → Sleep → Repeat
// ===========================================================
void loop() {
  // --- WAKE: connect WiFi + MQTT --------------------------
  connectWiFi();
  delay(1000);  // FIX: Give WiFi time to stabilize after connect
  mqttConnect();

  // --- READ: sensors --------------------------------------
  int   ldrValue   = analogRead(LDR_PIN);
  bool  isDaytime  = (ldrValue > LDR_THRESHOLD);

  Serial.println("------------------------------");
  Serial.print("[LDR]  Raw value : "); Serial.println(ldrValue);
  Serial.print("[Edge] Daytime   : "); Serial.println(isDaytime ? "YES" : "NO");

  if (!isDaytime) {
    digitalWrite(LED_RED, HIGH);
    Serial.println("[Edge] Nighttime — publishing suppressed status.");
    feedStatus.publish("nighttime_suppressed");

  } else {
    digitalWrite(LED_RED, LOW);
    delay(3000);  // FIX: Increased from 2000ms to 3000ms for DHT stabilization

    float humidity    = dht.readHumidity();
    float temperature = dht.readTemperature();

    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("[DHT11] Read failed. Check wiring.");
      Serial.println("[DHT11] Verify: PIN2, VCC (5V), GND, data line pullup");
      blinkLED(4, 400);
    } else {
      Serial.print("[DHT11] Temp     : "); Serial.print(temperature); Serial.println(" C");
      Serial.print("[DHT11] Humidity : "); Serial.print(humidity);    Serial.println(" %");
      publishData(temperature, humidity, ldrValue);
    }
  }

  // --- SLEEP: disconnect → radio off → wait → radio on ----
  goToSleep();
}

// ===========================================================
void publishData(float temp, float hum, int ldr) {
  bool ok = true;
  if (!feedTemperature.publish(temp))      { Serial.println("[MQTT] Temp failed.");     ok = false; }
  else Serial.print("[MQTT] Temp OK: "),   Serial.println(temp);

  if (!feedHumidity.publish(hum))          { Serial.println("[MQTT] Humidity failed."); ok = false; }
  else Serial.print("[MQTT] Humidity OK: "),Serial.println(hum);

  if (!feedLDR.publish((int32_t)ldr))      { Serial.println("[MQTT] LDR failed.");      ok = false; }
  else Serial.print("[MQTT] LDR OK: "),    Serial.println(ldr);

  String s = String(SENSOR_ID) + "|" + String(LOCATION) + "|daytime";
  feedStatus.publish(s.c_str());

  if (ok) Serial.println("[MQTT] All published successfully.");
  else    blinkLED(2, 200);
}

// ===========================================================
void goToSleep() {
  Serial.println("[Sleep] Disconnecting MQTT...");
  mqtt.disconnect();

  Serial.println("[Sleep] Turning off WiFi radio...");
  WiFi.disconnect();
  WiFi.end();                               // ← powers down radio
  digitalWrite(LED_RED, LOW);

  Serial.print("[Sleep] Sleeping for 15 seconds... ");
  Serial.println("(15000 ms)");

  // UNO R4 has no true deep sleep — simulated with delay
  unsigned long sleepStart = millis();
  while (millis() - sleepStart < SLEEP_DURATION_MS) {
    delay(1000);  // idle wait, lowest possible activity
  }

  Serial.println("[Wake]  Sleep complete. Re-initialising WiFi...");
  // FIX: Initialize WiFi for next cycle (don't call begin here)
  // Let connectWiFi() handle the connection in the next loop
}

// ===========================================================
void mqttConnect() {
  if (mqtt.connected()) return;
  Serial.print("[MQTT] Connecting to "); Serial.print(MQTT_SERVER);
  Serial.print(":"); Serial.println(MQTT_PORT);

  uint8_t retries = 5;
  int8_t  ret;
  while ((ret = mqtt.connect()) != 0) {
    Serial.print("[MQTT] Error: "); Serial.println(mqtt.connectErrorString(ret));
    mqtt.disconnect();
    blinkLED(5, 250);
    retries--;
    if (retries == 0) { Serial.println("[MQTT] Giving up."); return; }
    Serial.println("[MQTT] Retrying in 5s...");
    delay(5000);
  }
  Serial.println("[MQTT] Connected!");
}

// ===========================================================
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("[WiFi] Connecting to "); Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500); Serial.print("."); attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected!");
    Serial.print("[WiFi] IP: "); Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WiFi] Failed.");
  }
}

// ===========================================================
void blinkLED(int times, int ms) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_RED, HIGH); delay(ms);
    digitalWrite(LED_RED, LOW);  delay(ms);
  }
}
