
$ErrorActionPreference = "Stop"

# .env 파일 경로
$envFile = Join-Path $PSScriptRoot ".env"

if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: backend/.env 파일이 없습니다."
    exit 1
}

# .env 환경변수 로드
Get-Content $envFile -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim()

    if ($line -and -not $line.StartsWith("#")) {
        $parts = $line -split "=", 2

        if ($parts.Count -eq 2) {
            $name = $parts[0].Trim()
            $value = $parts[1].Trim().Trim('"').Trim("'")

            if ($name -match '^[A-Za-z_][A-Za-z0-9_]*$') {
                [Environment]::SetEnvironmentVariable(
                    $name,
                    $value,
                    "Process"
                )
            }
        }
    }
}

# 웹 지도용 상가정보 API 키가 아직 backend/.env로 이전되지 않았다면
# 기존 Expo 앱이 사용하던 루트 .env 값을 현재 백엔드 프로세스에만 승계합니다.
$publicStoreKey = [Environment]::GetEnvironmentVariable("PUBLIC_STORE_API_KEY", "Process")

if ([string]::IsNullOrWhiteSpace($publicStoreKey)) {
    $legacyEnvFile = Join-Path (Split-Path -Parent $PSScriptRoot) ".env"

    if (Test-Path $legacyEnvFile) {
        Get-Content $legacyEnvFile -Encoding UTF8 | ForEach-Object {
            $line = $_.Trim()

            if ($line -and -not $line.StartsWith("#")) {
                $parts = $line -split "=", 2

                if ($parts.Count -eq 2 -and $parts[0].Trim() -eq "EXPO_PUBLIC_PUBLIC_DATA_KEY") {
                    $legacyKey = $parts[1].Trim().Trim('"').Trim("'")

                    if (-not [string]::IsNullOrWhiteSpace($legacyKey)) {
                        [Environment]::SetEnvironmentVariable(
                            "PUBLIC_STORE_API_KEY",
                            $legacyKey,
                            "Process"
                        )
                    }
                }
            }
        }
    }
}

# 필수 환경변수 확인
$required = @(
    "KAKAO_REST_API_KEY",
    "KAKAO_REDIRECT_URI",
    "YOGIROAD_JWT_SECRET",
    "GOOGLE_APPLICATION_CREDENTIALS",
    "RESTAURANT_LICENSE_API_KEY",
    "PUBLIC_STORE_API_KEY"
)

foreach ($name in $required) {
    $value = [Environment]::GetEnvironmentVariable($name, "Process")

    if ([string]::IsNullOrWhiteSpace($value)) {
        Write-Host "ERROR: $name 환경변수가 비어 있습니다."
        exit 1
    }
}

# Firebase 인증 파일 확인
if (-not (Test-Path $env:GOOGLE_APPLICATION_CREDENTIALS)) {
    Write-Host "ERROR: Firebase 인증 JSON 파일을 찾을 수 없습니다."
    exit 1
}

Write-Host "환경변수 로드 완료!"
Write-Host "Spring Boot 실행 중..."

# backend 폴더에서 실행
Push-Location $PSScriptRoot

try {
    & .\gradlew.bat bootRun
}
finally {
    Pop-Location
}
