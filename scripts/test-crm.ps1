<# 
.SYNOPSIS
  Tests Dataverse access using a Service Principal by calling the WhoAmI endpoint.

.PARAMETER TenantId
  Azure AD tenant ID (GUID).

.PARAMETER ClientId
  Application (client) ID of your app registration.

.PARAMETER ClientSecret
  Client secret for the app registration. You can pass as plain text or via $env:DATAVERSE_CLIENT_SECRET.

.PARAMETER DataverseUrl
  Your Dataverse environment URL, e.g. https://orgname.crm.dynamics.com
  (Use the regional domain for your environment, e.g. crm4, crm6, etc.)
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $false)] [string] $TenantId = "90a976b0-6a3e-43d5-8389-31753457d824",
  [Parameter(Mandatory = $false)] [string] $ClientId = "c75c04fb-addf-4c62-8835-7860fed1d915",
  [Parameter(Mandatory = $false)] [string] $ClientSecret = $env:DATAVERSE_CLIENT_SECRET,
  [Parameter(Mandatory = $false)] [string] $DataverseUrl = "https://org879df631.crm17.dynamics.com/"
)

function Fail($msg) {
  Write-Error $msg
  exit 1
}

# Basic input checks
if (-not $ClientSecret) {
  Fail "No ClientSecret provided. Pass -ClientSecret '...' or set env var DATAVERSE_CLIENT_SECRET."
}

# Acquire token (client credentials against Dataverse resource's .default scope)
$tokenEndpoint = "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/token"
try {
  $body = @{
    client_id     = $ClientId
    client_secret = $ClientSecret
    scope         = "$DataverseUrl/.default"
    grant_type    = "client_credentials"
  }
  $tokenResponse = Invoke-RestMethod -Method Post -Uri $tokenEndpoint -Body $body -ContentType "application/x-www-form-urlencoded"
}
catch {
  Fail "Failed to get access token. $_"
}

if (-not $tokenResponse.access_token) {
  Fail "No access_token in token response."
}

# Call WhoAmI to validate access
$headers = @{ Authorization = "Bearer $($tokenResponse.access_token)" }
$whoAmIUrl = "$DataverseUrl/api/data/v9.2/WhoAmI"

try {
  $whoAmI = Invoke-RestMethod -Method Get -Uri $whoAmIUrl -Headers $headers
}
catch {
  Fail "WhoAmI call failed. Verify the app is added as an Application User in Dataverse and has a security role. $_"
}

# Optional: fetch system user details for a friendly name
$systemUserId = $whoAmI.UserId
$sysUserUrl = "$DataverseUrl/api/data/v9.2/systemusers($systemUserId)?`$select=fullname,domainname,azureactivedirectoryobjectid"
try {
  $sysUser = Invoke-RestMethod -Method Get -Uri $sysUserUrl -Headers $headers
}
catch {
  # Non-fatal; continue with minimal info
  $sysUser = $null
}

Write-Host ""
Write-Host "✅ Dataverse access OK"
Write-Host "   Environment : $DataverseUrl"
Write-Host "   TenantId    : $TenantId"
Write-Host "   App (Client): $ClientId"
Write-Host "   UserId      : $systemUserId"
if ($sysUser) {
  Write-Host "   Full Name   : $($sysUser.fullname)"
  Write-Host "   UPN/Domain  : $($sysUser.domainname)"
  Write-Host "   AAD Object  : $($sysUser.azureactivedirectoryobjectid)"
}
exit 0
