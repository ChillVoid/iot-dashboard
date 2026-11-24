"""Compile and upload Stack Moko Baby firmware to a USB-connected ESP32.

The upload writes only the bootloader, partition table, boot selector and
application at fixed offsets. It never runs erase_flash and refuses to write
over the NVS partition, so the cabinet's recovery journal is preserved.
Never use the Wokwi merged image on real hardware.

  --selftest   wiring self-test build (no Wi-Fi, token, journal or backend)
  --bridge     button bridge for the web game screen (Plan B): prints PRESS lines over USB
  (default)    game firmware using the private firmware/stack_moko_baby/config.h
"""
import argparse
import json
import os
import shutil
import struct
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'firmware'/'stack_moko_baby'
BRIDGE=ROOT/'firmware'/'button_bridge'
FQBN='esp32:esp32:esp32'
SELFTEST_FLAGS=['--build-property','compiler.cpp.extra_flags=-DSTACK_HARDWARE_TEST=1']


def arduino_cli():
    cli=shutil.which('arduino-cli') or str(ROOT/'.tools'/'esp32-integration-20261122'/'arduino'/'arduino-cli.exe')
    if not Path(cli).is_file(): raise SystemExit('Arduino CLI is missing; install it or use the documented tools folder.')
    return cli


def partitions(table):
    """Parse an ESP32 binary partition table into (type, subtype, offset, size, label)."""
    found=[]
    for start in range(0,len(table)-31,32):
        magic,kind,subtype,offset,size,label,_=struct.unpack_from('<HBBII16sI',table,start)
        if magic!=0x50AA: break
        found.append((kind,subtype,offset,size,label.split(b'\0',1)[0].decode('ascii','replace')))
    return found


def check_layout(components,table):
    """Refuse any write that overlaps NVS, overlaps another write or overflows the app slot."""
    entries=partitions(table)
    nvs=[(offset,offset+size) for kind,subtype,offset,size,_ in entries if kind==1 and subtype==2]
    if len(nvs)!=1: raise SystemExit('The partition table must contain exactly one NVS partition.')
    spans=[]
    for offset,path in components:
        start=int(offset,16); end=start+path.stat().st_size
        if start<nvs[0][1] and nvs[0][0]<end:
            raise SystemExit(f'{path.name} would overwrite the NVS journal; upload refused.')
        spans.append((start,end,path.name))
    spans.sort()
    for (a_start,a_end,a_name),(b_start,_,b_name) in zip(spans,spans[1:]):
        if b_start<a_end: raise SystemExit(f'{a_name} overlaps {b_name}; upload refused.')
    app=[(offset,size) for kind,_,offset,size,_ in entries if kind==0 and offset==0x10000]
    image=components[-1][1].stat().st_size
    if not app or image>app[0][1]: raise SystemExit('The application does not fit the first app partition.')
    return nvs[0]


def esptool_names(tool):
    """esptool 5 (ESP32 core 3.x) renamed commands and options to hyphens; 4.x (core 2.x)
    only knows the underscore forms. Pick by the tool's version so both cores work."""
    version=tool.parent.name if tool.parent.name[:1].isdigit() else ''
    if not version:
        result=subprocess.run(([sys.executable,str(tool)] if tool.suffix=='.py' else [str(tool)])+['version'],
                              capture_output=True,text=True)
        version=(result.stdout.strip().splitlines() or ['4'])[-1]
    modern=int(version.split('.')[0] or 4)>=5
    names={'write_flash':'write-flash','merge_bin':'merge-bin','--flash_mode':'--flash-mode',
           '--flash_freq':'--flash-freq','--flash_size':'--flash-size','default_reset':'default-reset',
           'hard_reset':'hard-reset'}
    return (lambda name: names.get(name,name)) if modern else (lambda name: name)


def detect_port(cli):
    result=subprocess.run([cli,'board','list','--format','json'],capture_output=True,text=True,check=True)
    ports=[item['port']['address'] for item in json.loads(result.stdout or '{}').get('detected_ports',[])
           if item.get('port',{}).get('protocol')=='serial' and item['port'].get('properties',{}).get('vid')]
    if len(ports)==1: return ports[0]
    if not ports: raise SystemExit('No USB serial board found. Plug in the ESP32 (data-capable USB cable) or pass --port COMx.')
    raise SystemExit(f'Several USB serial ports found ({", ".join(ports)}). Pass --port or set STACK_ESP32_PORT.')


def main():
    parser=argparse.ArgumentParser(description=__doc__,formatter_class=argparse.RawDescriptionHelpFormatter)
    mode=parser.add_mutually_exclusive_group()
    mode.add_argument('--selftest',action='store_true')
    mode.add_argument('--bridge',action='store_true',help='Button bridge for the web game screen.')
    parser.add_argument('--port',default=os.getenv('STACK_ESP32_PORT'))
    parser.add_argument('--compile-only',action='store_true',help='Build and check the flash layout without uploading.')
    args=parser.parse_args()
    if not args.selftest and not args.bridge:
        config=SOURCE/'config.h'
        if not config.is_file(): raise SystemExit('Missing private config.h. Run npm run online:device to build it for the hotspot.')
        if '"Wokwi-GUEST"' in config.read_text(encoding='utf-8'):
            raise SystemExit('config.h targets the Wokwi network. Run npm run online:device with STACK_FIRMWARE_WIFI_SSID set.')
    cli=arduino_cli()
    flags=SELFTEST_FLAGS if args.selftest else []
    source=BRIDGE if args.bridge else SOURCE
    name=source.name+'.ino'
    build=source/'build'/('bridge' if args.bridge else 'selftest' if args.selftest else 'device')
    subprocess.run([cli,'compile','--fqbn',FQBN,*flags,'--output-dir',str(build),str(source)],cwd=ROOT,check=True)
    shown=subprocess.run([cli,'compile','--fqbn',FQBN,*flags,'--show-properties',str(source)],
                         cwd=ROOT,check=True,capture_output=True,text=True)
    properties=dict(line.split('=',1) for line in shown.stdout.splitlines() if '=' in line)
    platform=Path(properties['runtime.platform.path'])
    components=[('0x1000',build/f'{name}.bootloader.bin'),
                ('0x8000',build/f'{name}.partitions.bin'),
                ('0xe000',platform/'tools'/'partitions'/'boot_app0.bin'),
                ('0x10000',build/f'{name}.bin')]
    missing=[path.name for _,path in components if not path.is_file()]
    if missing: raise SystemExit('Build is missing: '+', '.join(missing))
    nvs=check_layout(components,components[1][1].read_bytes())
    print(f'Flash layout checked: NVS 0x{nvs[0]:x}-0x{nvs[1]:x} is not written; no erase is performed.')
    if args.compile_only: return
    port=args.port or detect_port(cli)
    tool_dir=Path(properties['tools.esptool_py.path'])
    tool=tool_dir/properties['tools.esptool_py.cmd']
    if not tool.is_file(): tool=tool_dir/'esptool.py'
    if not tool.is_file(): raise SystemExit('The installed ESP32 esptool is missing.')
    command=[sys.executable,str(tool)] if tool.suffix=='.py' else [str(tool)]
    n=esptool_names(tool)
    command+=['--chip','esp32','--port',port,'--baud',properties.get('upload.speed','921600'),
              '--before',n('default_reset'),'--after',n('hard_reset'),n('write_flash'),'-z',
              n('--flash_mode'),properties['build.flash_mode'],n('--flash_freq'),properties['build.flash_freq'],
              n('--flash_size'),properties['build.flash_size']]
    for offset,path in components: command+=[offset,str(path)]
    kind='button bridge' if args.bridge else 'self-test' if args.selftest else 'game'
    print(f'Uploading {kind} firmware to {port}…')
    subprocess.run(command,cwd=ROOT,check=True)
    print(f'Done. Open the serial monitor: {cli} monitor -p {port} -c baudrate=115200')
    if args.bridge: print('Button bridge ready: press the button and watch for PRESS lines, then close the monitor and connect it on /screen.')
    if args.selftest: print('Self-test only: reflash the game firmware (npm run online:device) before players use the cabinet.')


if __name__=='__main__': main()
