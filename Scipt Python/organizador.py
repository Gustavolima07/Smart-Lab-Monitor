import psutil
import serial
import time
import json
import wmi
import sys
import winreg
from screeninfo import get_monitors

PORTA_ESP32 = 'COM5' 
BAUD_RATE = 115200

def adicionar_ao_inicializar():
    """
    Registra o caminho do .exe no Registro do Windows
    para rodar automaticamente na inicializacao do usuario.
    """
    try:
        # Obtem o caminho absoluto do .exe que esta rodando
        caminho_exe = sys.executable
        
        # Chave de registro para programas de inicializacao do usuario atual (nao exige Admin)
        chave_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
        
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, chave_path, 0, winreg.KEY_SET_VALUE) as chave:
            winreg.SetValueEx(chave, "SmartLabMonitor", 0, winreg.REG_SZ, f'"{caminho_exe}"')
    except Exception as e:
        pass

def conectar_esp32():
    while True:
        try:
            esp32 = serial.Serial(PORTA_ESP32, BAUD_RATE, timeout=1)
            time.sleep(2)
            return esp32
        except serial.SerialException:
            time.sleep(5)

def checar_rede():
    try:
        interfaces = psutil.net_if_stats()
        for nome, status in interfaces.items():
            if status.isup and "Loopback" not in nome and "lo" not in nome:
                return True
    except:
        pass
    return False

def checar_perifericos(computador):
    try:
        teclados = computador.Win32_Keyboard()
        tem_teclado = len(teclados) > 0
    except:
        tem_teclado = False

    try:
        mouses = computador.Win32_PointingDevice()
        tem_mouse = len(mouses) > 0
    except:
        tem_mouse = False

    try:
        monitores = get_monitors()
        tem_monitor = len(monitores) > 0
    except:
        tem_monitor = False

    return tem_teclado, tem_mouse, tem_monitor

def main():
    # 1. Configura auto-inicializacao com o Windows no momento em que e executado
    adicionar_ao_inicializar()

    # 2. Conecta ao ESP32 (fica em loop ate conseguir)
    esp32 = conectar_esp32()
    
    # 3. Inicia ferramenta do Windows
    computador = wmi.WMI()

    while True:
        try:
            teclado_ok, mouse_ok, monitor_ok = checar_perifericos(computador)
            
            dados_pc = {
                "ligado": True,
                "rede_ativa": checar_rede(),
                "teclado": teclado_ok,
                "mouse": mouse_ok,
                "video": monitor_ok
            }

            pacote_json = json.dumps(dados_pc)
            esp32.write((pacote_json + '\n').encode('utf-8'))
        except (serial.SerialException, Exception):
            esp32 = conectar_esp32()

        time.sleep(5)

if __name__ == "__main__":
    main()