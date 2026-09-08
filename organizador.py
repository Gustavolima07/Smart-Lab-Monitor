import psutil
import serial
import time
import json
import wmi
from screeninfo import get_monitors

# 1. PORTA DO ESP32 TRAVADA (Não pode ser alterada pelo app)
PORTA_ESP32 = 'COM5' 
BAUD_RATE = 115200

try:
    esp32 = serial.Serial(PORTA_ESP32, BAUD_RATE, timeout=1)
    time.sleep(2)
    print(f"Conectado e travado no ESP32 na porta {PORTA_ESP32}")
except serial.SerialException:
    print(f"Erro: ESP32 não encontrado na {PORTA_ESP32}.")
    exit()

# Inicia a ferramenta do Windows para ler Hardwares
computador = wmi.WMI()

def checar_rede():
    interfaces = psutil.net_if_stats()
    for nome, status in interfaces.items():
        if status.isup and "Loopback" not in nome and "lo" not in nome:
            return True
    return False

def checar_perifericos():
    # Verifica se existe pelo menos 1 teclado conectado
    teclados = computador.Win32_Keyboard()
    tem_teclado = len(teclados) > 0

    # Verifica se existe pelo menos 1 mouse conectado (Pointing Device)
    mouses = computador.Win32_PointingDevice()
    tem_mouse = len(mouses) > 0

    # Verifica se há monitores conectados dando vídeo
    try:
        monitores = get_monitors()
        tem_monitor = len(monitores) > 0
    except:
        tem_monitor = False

    return tem_teclado, tem_mouse, tem_monitor

# Loop principal
while True:
    teclado_ok, mouse_ok, monitor_ok = checar_perifericos()
    
    dados_pc = {
        "ligado": True,
        "rede_ativa": checar_rede(),
        "teclado": teclado_ok,
        "mouse": mouse_ok,
        "video": monitor_ok
    }

    pacote_json = json.dumps(dados_pc)
    esp32.write((pacote_json + '\n').encode('utf-8'))
    print(f"Enviado: {pacote_json}")

    time.sleep(5)