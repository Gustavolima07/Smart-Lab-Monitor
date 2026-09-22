# 🖥️ Smart Lab Monitor

O **Smart Lab Monitor** é uma solução Full-Stack e IoT multiplataforma (Mobile/Web + Microcontroladores + Agente de Hardware Local) desenvolvida para a monitorização em tempo real do estado de hardware de laboratórios de informática.

A arquitetura do sistema conecta o computador monitorado (via script/executável Python), um microcontrolador **ESP32** acoplado, uma aplicação móvel/web desenvolvida em **React Native / Expo** e o **Firebase Realtime Database** para sincronização instantânea de dados.

---

## 🚀 Funcionalidades da Aplicação (`/organizador-app`)

* **Multiplataforma Nativa (Android, iOS e Web):** Execução fluida em dispositivos móveis e navegadores Web, adaptando a navegação, diálogos e comportamento de interface para cada ecossistema.
* **Gestão de Ambientes com Permissões (RBAC):** 
  * **Administradores:** Têm privilégios totais para criar, listar e remover Ambientes (ex.: Câmpus Central, Bloco A).
  * **Técnicos / Utilizadores Padrão:** Acedem apenas aos ambientes para os quais lhes foram explicitamente concedidas permissões.
* **Exibição e Cópia Rápida de IDs:**
  * Na **Tela Inicial** e na **Lista de Laboratórios**, o **ID único do Firebase** (ex.: `-P24Clba...`) é exibido em *badges* destacadas.
  * O clique no ID copia o valor diretamente para a área de transferência (*clipboard*), facilitando a configuração dos caminhos no portal Web do ESP32.
* **Dashboard em Tempo Real:**
  * Atualização contínua via WebSockets (`onValue`) que reflete instantaneamente o diagnóstico dos computadores: Ligado/Desligado, Placa de Rede Ativa, Teclado, Rato e Monitor/Vídeo.
* **Chat Interno Integrado:**
  * Canal de comunicação em tempo real exclusivo para a equipa técnica alocada naquele ambiente.
* **Anexos de Hardware no Chat:**
  * Permite partilhar o *card* de um PC com falha diretamente na conversa. O clique no *card* redireciona a navegação para a página de detalhes do PC afetado.
* **Notificações e Indicadores (*Badges*):**
  * Atualização do total de mensagens não lidas no menu lateral e emissão de alertas.

---

## 🐍 Agente de Hardware Local & Executável (`/Scipt Python`)

Localizado na pasta `Scipt Python/`, este módulo corre no sistema operativo do computador do laboratório:

### 1. Script Fonte (`organizador.py`)
* **Detecção de Hardware:** Utiliza `psutil`, `wmi` e `screeninfo` para verificar periodicamente o estado da placa de rede, periféricos (teclado e rato) e saída de vídeo (monitores ativos).
* **Resiliência e Reconexão:** Possui um loop de reconexão automática com a porta Serial (`COM5`). Se o ESP32 for desligado ou desconectado, o script não encerra; continua a tentar reconectar a cada 5 segundos até reestabelecer a comunicação.
* **Auto-Inicialização Dinâmica (`winreg`):** Ao ser executado pela primeira vez, o script regista automaticamente o seu próprio caminho executável na chave do Registro do Windows (`HKCU\Software\Microsoft\Windows\CurrentVersion\Run`). Isso garante que seja aberto em segundo plano sempre que o Windows for iniciado, sem exigir permissões de Administrador.

### 2. Executável Autônomo (`/dist/organizador.exe`)
* **Compilação PyInstaller:** Gerado com as flags `--noconsole --onefile`, rodando 100% oculto em segundo plano (sem janela preta de terminal).
* **Execução Única:** Basta abrir o `organizador.exe` uma única vez no PC do laboratório. Ele irá cadastrar-se no arranque do Windows e iniciará o envio dos dados JSON para o ESP32 imediatamente.

---

## 📡 Funcionamento do Código do ESP32 (`/ESP32`)

A pasta `/ESP32` contém o firmware C++ gravado no microcontrolador conectado à porta USB do computador.

### Estrutura dos Ficheiros (`/ESP32`)
* `organizador-esp32.ino`: Ciclo de vida principal (`setup` e `loop`), leitura da porta Serial USB, envio de dados ao Firebase e atualização do display OLED.
* `WebPageHandler.h` e `WebPageHandler.cpp`: Servidor Web local e gestão da memória não-volátil (NVS/Preferences).
* `index.html`: Portal estático servido pelo ESP32 no Modo Access Point.

### Fluxo de Trabalho do Hardware:
1. **Portal de Configuração (Modo AP):** Se não houver Wi-Fi guardado ou se o botão físico (GPIO 23) for mantido pressionado por 3s, o ESP32 cria a rede `SIMOREQ`. Ao aceder ao IP `192.168.0.1`, o técnico define o SSID, Senha, **ID do Ambiente** (copiado da app) e o **Nome da Sala/Laboratório**.
2. **Recepção Serial:** Recebe o pacote JSON enviado pelo `organizador.exe` via USB a cada 5 segundos.
3. **Envio para a Nuvem:** Envia os dados estruturados para o Firebase Realtime Database no caminho:
   `/ambientes/<ID_DO_AMBIENTE>/<NOME_DA_SALA>/<NOME_DO_PC>`
4. **Display OLED (SSD1306):** Exibe em tempo real o IP obtido, status do Wi-Fi, recepção Serial e sincronização com a nuvem.

---

## 🛠️ Tecnologias Utilizadas

* **App (`/organizador-app`):** React Native, Expo, React Navigation, Expo Clipboard, Moti, Firebase Realtime Database & Auth.
* **Agente Local (`/Scipt Python`):** Python 3 (`psutil`, `pyserial`, `wmi`, `screeninfo`, `winreg`), PyInstaller.
* **Firmware (`/ESP32`):** C++, Arduino Framework, `Firebase_ESP_Client`, `ArduinoJson`, `Preferences`, `Adafruit_SSD1306`.

---

## ⚙️ Como Executar e Compilar

### 1. Iniciar a Aplicação React Native
```bash
cd organizador-app
npm install
npx expo start
---

## 📁 Estrutura do Repositório

```text
organizador/
├── ESP32/                       # Firmware em C++ para o microcontrolador ESP32
│   ├── index.html               # Interface Web do portal de configuração
│   ├── organizador-esp32.ino    # Ficheiro principal (Loop, Firebase e Leitura Serial)
│   ├── WebPageHandler.cpp       # Implementação do servidor Web e gravação em NVS
│   └── WebPageHandler.h         # Definições do servidor Web
├── organizador-app/             # Aplicação React Native / Expo (Mobile e Web)
│   ├── src/                     # Ecrãs, componentes e contextos da app
│   ├── App.js                   # Ponto de entrada do React Native
│   └── package.json             # Dependências e scripts da app
├── Scipt Python/                # Agente de monitorização local e compilação .exe
│   ├── build/                   # Ficheiros temporários de compilação do PyInstaller
│   ├── dist/                    # Executável compilado de produção
│   │   └── organizador.exe      # Executável final com auto-inicialização no Windows
│   ├── organizador.py           # Script fonte em Python com leitura de hardware e regedit
│   └── organizador.spec         # Ficheiro de especificação de compilação do PyInstaller
└── README.md                    # Documentação do projeto
```

