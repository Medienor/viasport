# Run all football standings batches in parallel
param(
    [int]$TotalLeagues = 1000,  # Estimate total leagues (adjust based on your data)
    [int]$BatchSize = 100,      # Process 100 leagues per batch
    [int]$MaxParallelJobs = 10  # Maximum parallel jobs to avoid overwhelming
)

$functionUrl = "https://cdynfbwdwdfsiwkgixua.supabase.co/functions/v1/fetch-football-standings"
$authToken = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkeW5mYndkd2Rmc2l3a2dpeHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1Nzg0MDEsImV4cCI6MjA1ODE1NDQwMX0.kfDN39vw2ulre8ndNcytD-ISo9YXjptsBIfuH1p1HCg"

# Calculate number of batches needed
$totalBatches = [Math]::Ceiling($TotalLeagues / $BatchSize)
Write-Host "Running $totalBatches batches ($BatchSize leagues each) with max $MaxParallelJobs parallel jobs..." -ForegroundColor Green

# Script block for each batch job
$scriptBlock = {
    param($batchStart, $batchSize, $functionUrl, $authToken, $batchNumber, $totalBatches)
    
    try {
        $body = @{
            batchStart = $batchStart
            batchSize = $batchSize
        } | ConvertTo-Json
        
        $headers = @{
            "Authorization" = $authToken
            "Content-Type" = "application/json"
        }
        
        Write-Host "Starting batch $batchNumber/$totalBatches (leagues $batchStart-$($batchStart + $batchSize - 1))" -ForegroundColor Yellow
        
        $response = Invoke-WebRequest -Uri $functionUrl -Method POST -Headers $headers -Body $body -TimeoutSec 120
        $result = $response.Content | ConvertFrom-Json
        
        Write-Host "Batch $batchNumber/$totalBatches completed: $($result.message)" -ForegroundColor Green
        return @{
            BatchNumber = $batchNumber
            Success = $true
            Message = $result.message
            SuccessCount = $result.successCount
            FailCount = $result.failCount
        }
    }
    catch {
        Write-Host "Batch $batchNumber/$totalBatches failed: $($_.Exception.Message)" -ForegroundColor Red
        return @{
            BatchNumber = $batchNumber
            Success = $false
            Message = $_.Exception.Message
            SuccessCount = 0
            FailCount = 0
        }
    }
}

# Create and start jobs
$jobs = @()
$totalSuccess = 0
$totalFail = 0

for ($i = 0; $i -lt $totalBatches; $i++) {
    $batchStart = $i * $BatchSize
    $batchNumber = $i + 1
    
    # Wait if we have too many running jobs
    while ((Get-Job -State Running).Count -ge $MaxParallelJobs) {
        Start-Sleep -Seconds 2
        
        # Check completed jobs
        $completedJobs = Get-Job -State Completed
        foreach ($job in $completedJobs) {
            $result = Receive-Job -Job $job
            if ($result.Success) {
                $totalSuccess += $result.SuccessCount
                $totalFail += $result.FailCount
            }
            Remove-Job -Job $job
        }
    }
    
    # Start new job
    $job = Start-Job -ScriptBlock $scriptBlock -ArgumentList $batchStart, $BatchSize, $functionUrl, $authToken, $batchNumber, $totalBatches
    $jobs += $job
    
    Write-Host "Started job for batch $batchNumber (leagues $batchStart-$($batchStart + $BatchSize - 1))" -ForegroundColor Cyan
    Start-Sleep -Milliseconds 500  # Small delay between job starts
}

# Wait for all jobs to complete
Write-Host "`nWaiting for all jobs to complete..." -ForegroundColor Yellow
Wait-Job -Job $jobs | Out-Null

# Collect results
Write-Host "`nProcessing results..." -ForegroundColor Yellow
foreach ($job in $jobs) {
    $result = Receive-Job -Job $job
    if ($result.Success) {
        $totalSuccess += $result.SuccessCount
        $totalFail += $result.FailCount
    }
    Remove-Job -Job $job
}

# Summary
Write-Host "`n================================" -ForegroundColor Magenta
Write-Host "FINAL RESULTS:" -ForegroundColor Magenta
Write-Host "Total batches: $totalBatches" -ForegroundColor White
Write-Host "Total successful upserts: $totalSuccess" -ForegroundColor Green
Write-Host "Total failures: $totalFail" -ForegroundColor Red
Write-Host "================================" -ForegroundColor Magenta

# Check if any jobs failed
$failedJobs = Get-Job -State Failed
if ($failedJobs.Count -gt 0) {
    Write-Host "`nSome jobs failed. Check the output above for details." -ForegroundColor Red
}

Write-Host "`nAll batches completed!" -ForegroundColor Green 