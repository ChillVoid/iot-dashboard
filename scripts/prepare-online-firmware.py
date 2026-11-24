"""Prepare private Wokwi firmware using a verified HTTPS certificate chain."""
import argparse
from pathlib import Path
import shutil
import socket
import ssl
import subprocess
import sys
import time
import json
import re
import urllib.request
from urllib.parse import urlencode
import certifi
from urllib.parse import urlsplit


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


def merge_firmware(cli, source, root):
    """Create a fresh full-flash image, including on cores without a merge hook."""
    result=subprocess.run([cli,'compile','--fqbn','esp32:esp32:esp32','--show-properties',str(source)],
                          cwd=root,check=True,capture_output=True,text=True)
    properties=dict(line.split('=',1) for line in result.stdout.splitlines() if '=' in line)
    platform=Path(properties['runtime.platform.path'])
    tool_dir=Path(properties['tools.esptool_py.path'])
    tool=tool_dir/properties['tools.esptool_py.cmd']
    if not tool.is_file():
        tool=tool_dir/'esptool.py'
    if not tool.is_file(): raise RuntimeError('The installed ESP32 esptool is missing.')
    command=([sys.executable,str(tool)] if tool.suffix=='.py' else [str(tool)])
    build=source/'build'
    image=build/'stack_moko_baby.ino.merged.bin'
    components=[('0x1000',build/'stack_moko_baby.ino.bootloader.bin'),
                ('0x8000',build/'stack_moko_baby.ino.partitions.bin'),
                ('0xe000',platform/'tools'/'partitions'/'boot_app0.bin'),
                ('0x10000',build/'stack_moko_baby.ino.bin')]
    if not all(path.is_file() for _,path in components):
        raise RuntimeError('The ESP32 build is missing a required flash component.')
    n=esptool_names(tool)
    command+=['--chip','esp32',n('merge_bin'),'-o',str(image),
              n('--flash_mode'),properties['build.flash_mode'],
              n('--flash_freq'),properties['build.flash_freq'],
              n('--flash_size'),properties['build.flash_size']]
    for offset,path in components: command.extend([offset,str(path)])
    subprocess.run(command,cwd=root,check=True)
    # Check actual constituent bytes, not just the presence of an older image.
    merged=image.read_bytes()
    for offset,path in components[1:]:
        data=path.read_bytes(); start=int(offset,16)
        if merged[start:start+len(data)]!=data:
            raise RuntimeError('Merged firmware does not match the current build.')


# Public roots behind Cloudflare edge certificates (Google Trust Services, Let's Encrypt,
# SSL.com). Each Quick Tunnel hostname can get a certificate from any of them, so the
# cabinet trusts this small bundle and a new hostname needs no new firmware.
TUNNEL_ROOTS = ('GTS Root R1','GTS Root R3','GTS Root R4','ISRG Root X1','ISRG Root X2',
                'SSL.com TLS RSA Root CA 2022','SSL.com TLS ECC Root CA 2022')


def trust_bundle(live_root_der):
    """The live chain's root plus the named public roots, read only from certifi's store."""
    from cryptography import x509
    from cryptography.x509.oid import NameOID
    live = ssl.DER_cert_to_PEM_cert(live_root_der)
    found = {}
    for block in re.findall(r'-----BEGIN CERTIFICATE-----.+?-----END CERTIFICATE-----',
                            Path(certifi.where()).read_text(encoding='ascii'), re.S):
        names = x509.load_pem_x509_certificate(block.encode()).subject.get_attributes_for_oid(NameOID.COMMON_NAME)
        if names and names[0].value in TUNNEL_ROOTS: found.setdefault(names[0].value, block)
    missing = set(TUNNEL_ROOTS) - set(found)
    if missing: raise RuntimeError('certifi lacks expected tunnel roots: ' + ', '.join(sorted(missing)))
    blocks = [live.strip()] + [found[name] for name in TUNNEL_ROOTS]
    unique = list(dict.fromkeys(''.join(b.split()) for b in blocks))  # drop the live root if already listed
    return '\n'.join(next(b for b in blocks if ''.join(b.split()) == key) for key in unique) + '\n'


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url',required=True)
    parser.add_argument('--device',action='store_true',
                        help='Build for the physical ESP32 on the hotspot and upload it over USB (NVS preserved).')
    args=parser.parse_args()
    import os
    if args.device and not os.getenv('STACK_FIRMWARE_WIFI_SSID'):
        parser.error('Set STACK_FIRMWARE_WIFI_SSID (and STACK_FIRMWARE_WIFI_PASSWORD) to the phone hotspot first.')
    origin=urlsplit(args.url)
    if origin.scheme!='https' or not origin.hostname or origin.path not in ('','/') or origin.username or origin.password or origin.query or origin.fragment:
        parser.error('Use the public HTTPS origin only.')
    root=Path(__file__).resolve().parents[1]
    # Trust certifi's public CA store; never fetch a trust anchor through
    # an unverified TLS session. Python 3.13 returns the verified chain.
    context=ssl.create_default_context(cafile=certifi.where())
    chain=None
    for attempt in range(15):
        try:
            address=origin.hostname
            try: socket.getaddrinfo(address,origin.port or 443)
            except socket.gaierror:
                # Per-request resolver fallback for a newly created tunnel;
                # leave the computer's DNS settings unchanged and retain SNI.
                query='https://cloudflare-dns.com/dns-query?'+urlencode({'name':address,'type':'A'})
                request=urllib.request.Request(query,headers={'accept':'application/dns-json'})
                with urllib.request.urlopen(request,context=context,timeout=10) as response: record=json.load(response)
                addresses=[r['data'] for r in record.get('Answer',[]) if r['type']==1]
                if not addresses: raise OSError('The public hostname is not in DNS yet.')
                address=addresses[0]
            with socket.create_connection((address,origin.port or 443),timeout=5) as connection:
                with context.wrap_socket(connection,server_hostname=origin.hostname) as secured:
                    chain=secured.get_verified_chain()
            break
        except (OSError,ssl.SSLError):
            if attempt==14: raise RuntimeError('The public HTTPS hostname is not reachable with a trusted certificate yet.') from None
            time.sleep(2)
    if not chain: raise RuntimeError('No verified HTTPS certificate chain was available.')
    ca=root/'.tools'/'free-online'/'root-ca.pem'
    ca.parent.mkdir(parents=True,exist_ok=True)
    ca.write_text(trust_bundle(chain[-1]),encoding='ascii')  # live root + public tunnel roots
    configure=[sys.executable,str(root/'scripts'/'configure-firmware.py'),'--url',args.url,'--ca',str(ca)]
    if args.device: configure+=['--ssid',os.environ['STACK_FIRMWARE_WIFI_SSID']]
    subprocess.run(configure,cwd=root,check=True)
    if args.device:
        # App-only USB upload; never the Wokwi merged image on real hardware.
        subprocess.run([sys.executable,str(root/'scripts'/'flash-device.py')],cwd=root,check=True)
        return
    cli=shutil.which('arduino-cli') or str(root/'.tools'/'esp32-integration-20261122'/'arduino'/'arduino-cli.exe')
    if not Path(cli).is_file(): raise RuntimeError('Arduino CLI is missing; use the installed compiler path.')
    source=root/'firmware'/'stack_moko_baby'
    (source/'build'/'stack_moko_baby.ino.merged.bin').unlink(missing_ok=True)
    # Wokwi's led-matrix part is row-serpentine only; the physical 8x32 HUD defaults to
    # column-major (display_layout.h), so the simulator build overrides that one flag.
    wokwi=['--build-property','compiler.cpp.extra_flags=-DSTACK_HUD_COLUMN_MAJOR=0']
    subprocess.run([cli,'compile','--fqbn','esp32:esp32:esp32',*wokwi,'--output-dir',str(source/'build'),str(source)],cwd=root,check=True)
    merge_firmware(cli,source,root)
    print('Private firmware ready in firmware/stack_moko_baby/build/stack_moko_baby.ino.merged.bin.')
    print('Use this merged image only for a fresh unsaved/private Wokwi session. Never publish it or config.h.')
    print('For real cabinet updates, preserve NVS and upload the application without erase-all or merged-image padding.')


if __name__=='__main__': main()
