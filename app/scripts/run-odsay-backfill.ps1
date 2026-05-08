# ============================================================
# ODSay backfill 자동 실행 (Windows Task Scheduler 용)
# ============================================================
# 매일 07:20 1회 실행. 일일 한도 1000회 중 안전 margin 900.
# transit_path_cache 테이블에 (apartment_id, commute_area) 6 CBD 페어 누적.
#
# 등록:
#   schtasks /create /tn "ChillaeMallae ODSay Backfill" `
#     /tr 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "...\run-odsay-backfill.ps1"' `
#     /sc daily /st 07:20 /sd 2026-05-10 /f
#
# 수동 즉시 실행:
#   schtasks /run /tn "ChillaeMallae ODSay Backfill"
# 등록 확인:
#   schtasks /query /tn "ChillaeMallae ODSay Backfill" /v /fo list

$ErrorActionPreference = "Continue"

$ROOT = "C:\Users\LSH\Desktop\LSH\comma\ChillaeMallae\app"
$LOG_DIR = Join-Path $ROOT "logs"
if (-not (Test-Path $LOG_DIR)) {
    New-Item -ItemType Directory -Path $LOG_DIR | Out-Null
}

$ts = Get-Date -Format "yyyyMMdd-HHmm"
$logFile = Join-Path $LOG_DIR "odsay-backfill-$ts.log"

Set-Location $ROOT

"=== ODSay backfill 시작: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" |
    Out-File -Encoding utf8 -FilePath $logFile

# node가 PATH에 있어야 함. 일반 Windows Node.js 설치 시 자동 등록됨.
& node "scripts\backfill-transit-cache.mjs" --all --limit 900 2>&1 |
    Out-File -Encoding utf8 -Append -FilePath $logFile

"=== ODSay backfill 종료: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') (exit=$LASTEXITCODE) ===" |
    Out-File -Encoding utf8 -Append -FilePath $logFile
