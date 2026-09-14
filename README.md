# 🖥️ Smart Lab Monitor

O **Smart Lab Monitor** é uma aplicação Full-Stack multiplataforma (Mobile/Web + IoT) focada no monitoramento em tempo real do hardware de laboratórios de informática. O sistema integra microcontroladores (ESP32) conectados às máquinas com um App em React Native, utilizando o Firebase como ponte de sincronização.

## 🚀 Funcionalidades do Aplicativo

* **Multiplataforma Nativa:** O código fonte gera builds nativas para Android/iOS via Expo e renderiza perfeitamente no navegador Web, adaptando regras de layout (como comportamento do teclado e uploads em Base64).
* **Gestão de Ambientes (Role-Based Access):** Usuários com perfil de Administrador podem criar, editar e excluir "Ambientes" (ex: Câmpus Central, Escola X). Usuários técnicos só enxergam os ambientes aos quais têm permissão.
* **Monitoramento Real-Time:** Uma dashboard dinâmica que escuta o banco de dados via `onValue`, exibindo o status instantâneo do hardware dos PCs (Ligado/Desligado, Rede, Mouse, Teclado e Vídeo).
* **Comunicação Integrada (Chat):** Sistema de mensagens instantâneas exclusivo para membros do mesmo ambiente.
* **Sistema de Anexos de Hardware:** Em caso de defeito em um computador, a equipe técnica pode "anexar" um card de alerta daquele PC diretamente na conversa. O clique no card redireciona automaticamente para os detalhes da máquina afetada.
* **Notificações Push & Badges:** Escuta ativa em background que atualiza o total de mensagens não lidas no Menu Lateral e emite alertas Push no smartphone.

## 📡 Integração com Hardware (ESP32)

O coração do monitoramento é feito utilizando placas **ESP32** integradas com displays OLED, rodando código em C++ com gerenciamento inteligente de rede.

### Como o ESP32 Funciona:
1. **Coleta de Dados Locais (Serial):** O computador sendo monitorado roda um script (Python/C#) que levanta o status físico de seus periféricos (Rede, Mouse, Teclado, Vídeo) e envia um pacote JSON via cabo USB (Comunicação Serial) para o ESP32.
2. **Gerenciador de Wi-Fi Dinâmico (Smart Config):** O ESP32 **não possui Wi-Fi fixo no código**. Ele utiliza a biblioteca `Preferences` (NVS) para lembrar a última rede conectada. 
   * Se a rede falhar, ou se não houver rede salva, ele entra em **Modo AP (Access Point)**, criando uma rede Wi-Fi própria (nome: `SIMOREQ`). O usuário acessa o IP `192.168.0.1` pelo celular e cadastra a rede local pelo navegador.
   * *Acesso manual:* É possível forçar o Modo AP a qualquer momento segurando o botão físico (Pino 23) por 3 segundos.
3. **Upload Real-Time (Firebase):** Após conectar, o ESP32 decodifica o JSON da porta Serial e envia os dados consolidados diretamente para o Realtime Database, utilizando o caminho exato gerado pelo aplicativo:
   `/ambientes/<ID_DO_AMBIENTE>/escola/<NOME_DA_SALA>/<NOME_DO_PC>`
4. **Feedback Visual:** A placa possui um display **OLED SSD1306 (128x64)** que exibe em tempo real:
   * Status da conexão Wi-Fi.
   * IP atribuído.
   * Status do PC (Ligado/Desligado, com/sem rede).
   * Status da sincronização com a nuvem (Firebase).

## 🛠️ Tecnologias Utilizadas

### Front-End (App)
* **React Native & Expo:** Framework principal multiplataforma.
* **React Navigation:** Gerenciamento híbrido com Stack (Pilha) e Drawer (Menu Lateral).
* **Expo Image Picker / AsyncStorage:** Tratamento de mídias e persistência de sessão offline.

### Back-End & Infraestrutura
* **Firebase Authentication:** Login seguro com E-mail/Senha e integração Google.
* **Firebase Realtime Database:** Armazenamento NoSQL focado em WebSockets para atualizações sem refresh.

### IoT (Hardware)
* **Placa:** ESP32 (Wi-Fi/Bluetooth embutido).
* **Display:** OLED I2C 128x64.
* **Linguagem:** C++ (Arduino IDE / PlatformIO).
* **Bibliotecas Principais:** `ArduinoJson`, `Firebase_ESP_Client`, `Preferences`, `Adafruit_SSD1306`.

## ⚙️ Como executar o projeto

### 1. Configurando o Aplicativo
```bash
# Clone o repositório
git clone [https://github.com/Gustavolima07/Smart-Lab-Monitor.git](https://github.com/Gustavolima07/Smart-Lab-Monitor.git)

# Acesse a pasta e instale as dependências
cd Smart-Lab-Monitor
npm install

# Inicie o servidor de desenvolvimento do Expo
npx expo start