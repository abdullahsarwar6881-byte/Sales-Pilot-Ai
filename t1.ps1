$ErrorActionPreference = "Stop"
function T($msg) {
  $body = @{ message = $msg; profileId = "3c321d7c-23e8-4101-9d30-1a2a8a0a37f9"; customerName = "Runtime Tester" } | ConvertTo-Json -Compress
  try {
    $r = Invoke-RestMethod -Uri "http://http://127.0.0.1:3000/api/chat" -Method Post -ContentType "application/json" -Body $body -TimeoutSec 120
    Write-Output ("=== " + $msg + " ===")
    Write-Output ("ACTION: " + $r.action + " | HASPRODUCTS: " + $r.hasProducts + " | COUNT: " + $r.productCount)
    Write-Output ("RESPONSE: " + $r.response)
    if ($r.products) { Write-Output ("PRODUCTS(" + $r.products.Count + "):"); foreach ($p in $r.products) { Write-Output ("  - " + $p.displayName + " | " + $p.displayPrice + " | url=" + $p.url + " | img=" + $p.image) } }
    Write-Output ("SID: " + $r.visitorSessionId)
    return $r
  } catch {
    Write-Output ("ERR(" + $msg + "): " + $_.Exception.Message)
    Write-Output ($_.ErrorDetails.Message)
    return $null
  }
}
T "Do you have black dresses?"
