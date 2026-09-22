#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include "WebPageHandler.h"
#include <Firebase_ESP_Client.h>

// Fornece informações auxiliares para o Firebase
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// ================= CONFIGURAÇÕES =================

// 1. Firebase
#define API_KEY ""
#define DATABASE_URL ""

// 2. Tela OLED e Botão
#define LARGURA_TELA 128
#define ALTURA_TELA 64
#define PINO_RESET -1
#define ENDERECO_I2C 0x3C

#define BUTTON_PIN 23

// 3. Portal Wi-Fi (Modo AP)
#define AP_NAME "Smart-Lab-Monitor"
#define AP_PASS "12345678"

#define HOLD_TIME 3000
#define WIFI_TIMEOUT 15000
#define CONFIG_TIMEOUT 180000

// ================= OBJETOS =================
Adafruit_SSD1306 display(LARGURA_TELA, ALTURA_TELA, &Wire, PINO_RESET);
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

Preferences prefs;
WebServer* server = nullptr;
WebPageHandler* pageHandler = nullptr;

// Variáveis para a interrupção do botão
volatile bool buttonPressed = false;
volatile unsigned long buttonPressStart = 0;

void IRAM_ATTR handleButtonInterrupt() {
  if (!buttonPressed && digitalRead(BUTTON_PIN) == LOW) {
    buttonPressed = true;
    buttonPressStart = millis();
  }
}

// ======================================
// PORTAL DE CONFIGURAÇÃO (MODO AP)
// ======================================
void runConfigPortal() {
  delay(5000);
  display.clearDisplay();
  display.setCursor(0, 0);
  display.print("Modo Config");
  display.display();

  WiFi.disconnect(true);
  delay(100);
  WiFi.mode(WIFI_AP);

  IPAddress local_IP(192, 168, 0, 1);
  IPAddress gateway(192, 168, 0, 1);
  IPAddress subnet(255, 255, 255, 0);
  WiFi.softAPConfig(local_IP, gateway, subnet);
  WiFi.softAP(AP_NAME, AP_PASS);

  delay(5000);
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("AP Criado:");
  display.println("Rede: " AP_NAME);
  display.println("Senha: " AP_PASS);
  display.println("IP: " + WiFi.softAPIP().toString());
  display.display();

  if (server) delete server;
  server = new WebServer(80);

  if (pageHandler) delete pageHandler;
  pageHandler = new WebPageHandler(*server);
  pageHandler->begin();

  unsigned long startTime = millis();
  while (millis() - startTime < CONFIG_TIMEOUT) {
    server->handleClient();
    delay(2);
  }

  display.clearDisplay();
  display.setCursor(0, 0);
  display.print("Reiniciando...");
  display.display();
  delay(2000);
  ESP.restart();
}

// ======================================
// SETUP
// ======================================
void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), handleButtonInterrupt, FALLING);

  // 1. Inicia o OLED
  if (!display.begin(SSD1306_SWITCHCAPVCC, ENDERECO_I2C)) {
    Serial.println(F("Falha no OLED"));
    for (;;)
      ;
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 10);
  display.println("Iniciando Sistema...");
  display.display();
  delay(2000);

  // 2. Carrega credenciais do Wi-Fi e Firebase usando Preferences
  prefs.begin("device_prefs", true);  // ABERTURA DA MEMÓRIA

  String ssid = prefs.getString("wifi_ssid", "");
  String pass = prefs.getString("wifi_pass", "");
  String ambienteId = prefs.getString("ambiente_id", "");
  String salaNome = prefs.getString("sala_nome", "lab_default");
  String pcNome = prefs.getString("pc_nome", "pc_default");

  prefs.end();  // FECHAMENTO DA MEMÓRIA

  display.clearDisplay();
  display.setCursor(0, 10);
  display.println("Prefs OK");
  display.display();
  delay(1000);

  // 3. Lógica de Conexão Wi-Fi
  if (ssid != "") {
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("Conectando:");
    display.println(ssid);
    display.display();

    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid.c_str(), pass.c_str());

    unsigned long startAttempt = millis();
    bool connected = false;

    while (millis() - startAttempt < WIFI_TIMEOUT) {
      if (WiFi.status() == WL_CONNECTED) {
        connected = true;
        break;
      }
      delay(500);

      if (buttonPressed && (millis() - buttonPressStart >= HOLD_TIME)) {
        buttonPressed = false;
        display.clearDisplay();
        display.setCursor(0, 0);
        display.println("Abrindo Portal...");
        display.display();
        delay(2000);
        runConfigPortal();
        return;
      }
    }

    if (connected) {
      display.clearDisplay();
      display.setCursor(0, 0);
      display.println("WiFi Conectado!");
      display.println(WiFi.localIP().toString());
      display.display();
      delay(2000);
    } else {
      display.clearDisplay();
      display.setCursor(0, 0);
      display.println("WiFi Falhou");
      display.display();
      delay(2000);
      runConfigPortal();
    }
  } else {
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("Sem WiFi Salvo");
    display.display();
    delay(2000);
    runConfigPortal();
  }

  // 4. Configura e Conecta ao Firebase
  if (WiFi.status() == WL_CONNECTED) {
    config.api_key = API_KEY;
    config.database_url = DATABASE_URL;
    config.signer.test_mode = true;

    Firebase.begin(&config, &auth);
    Firebase.reconnectWiFi(true);

    display.clearDisplay();
    display.setCursor(0, 10);
    display.println("Firebase Iniciado!");
    display.println("Aguardando PC...");
    display.display();
  }
}

// ======================================
// LOOP PRINCIPAL
// ======================================
// ======================================
// LOOP PRINCIPAL
// ======================================
void loop() {
  if (buttonPressed) {
    if (digitalRead(BUTTON_PIN) == HIGH) {
      if (millis() - buttonPressStart >= HOLD_TIME) {
        display.clearDisplay();
        display.setCursor(0, 0);
        display.println("Botao Segurado");
        display.println("Abrindo Portal...");
        display.display();
        delay(2000);
        buttonPressed = false;
        runConfigPortal();
      }
      buttonPressed = false;
    }
  }

  // AQUI LÊ DA PORTA USB (Serial)
  if (Serial.available() > 0) {
    String jsonRecebido = Serial.readStringUntil('\n');

    JsonDocument doc;
    DeserializationError erro = deserializeJson(doc, jsonRecebido);

    if (erro) return;

    bool pcLigado = doc["ligado"];
    bool redeAtiva = doc["rede_ativa"];
    bool temTeclado = doc["teclado"];
    bool temMouse = doc["mouse"];
    bool temVideo = doc["video"];

    bool erroNoFirebase = false;
    String mensagemDeErro = "";
    String basePath = "";  // <-- CORRIGIDO: Declaramos a variável aqui fora!

    // --- ATUALIZA O FIREBASE ---
    if (WiFi.status() == WL_CONNECTED) {
      prefs.begin("device_prefs", true);
      String ambienteId = prefs.getString("ambiente_id", "");
      String salaNome = prefs.getString("sala_nome", "");
      String pcNome = prefs.getString("pc_nome", "");
      prefs.end();
      // LIMPEZA CRÍTICA: Remove espaços em branco invisíveis no começo e no fim
      ambienteId.trim();
      salaNome.trim();
      pcNome.trim();

      // PROTEÇÃO CONTRA URL QUEBRADA: Troca espaços no meio do nome por underline (_)
      salaNome.replace(" ", "_");
      pcNome.replace(" ", "_");
      // Montamos o caminho sem usar a palavra "String" de novo
      basePath = "/ambientes/" + ambienteId + "/escola/" + salaNome + "/" + pcNome;

      // Tenta gravar o primeiro dado. Se der erro, captura o motivo!
      if (!Firebase.RTDB.setBool(&fbdo, basePath + "/ligado", pcLigado)) {
        erroNoFirebase = true;
        mensagemDeErro = fbdo.errorReason();
      }

      Firebase.RTDB.setBool(&fbdo, basePath + "/rede_ativa", redeAtiva);
      Firebase.RTDB.setBool(&fbdo, basePath + "/teclado", temTeclado);
      Firebase.RTDB.setBool(&fbdo, basePath + "/mouse", temMouse);
      Firebase.RTDB.setBool(&fbdo, basePath + "/video", temVideo);
    }

    // --- ATUALIZA A TELA OLED ---
    display.clearDisplay();
    display.setTextSize(1);

    if (erroNoFirebase) {
      // TELA DE ERRO (Trava por 5 segundos para você conseguir ler)
      display.setCursor(0, 0);
      display.println("ERRO FIREBASE!");
      display.drawLine(0, 10, 128, 10, SSD1306_WHITE);

      display.setCursor(0, 15);
      display.println(mensagemDeErro);  // Mostra o "bad request"

      display.setCursor(0, 30);
      display.println("Caminho gerado:");

      // Imprime o caminho para vermos se tem algo em branco!
      display.setCursor(0, 40);
      display.println(basePath);

      display.display();
      delay(5000);
    } else {
      // TELA NORMAL DE STATUS
      display.setCursor(0, 0);
      display.println("STATUS DO PC (Wi-Fi)");
      display.drawLine(0, 10, 128, 10, SSD1306_WHITE);

      display.setCursor(0, 20);
      display.print("Energia: ");
      display.println(pcLigado ? "LIGADO" : "DESLIGADO");

      display.setCursor(0, 35);
      display.print("Rede: ");
      display.println(redeAtiva ? "CONECTADA" : "SEM ACESSO");

      display.setCursor(0, 50);
      display.print("Nuvem: ");
      display.println(Firebase.ready() ? "Sincronizado" : "Desconectado");

      display.display();
    }
  }
}