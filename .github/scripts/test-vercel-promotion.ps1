$ErrorActionPreference = 'Stop'

$taskWorkflow = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot '../workflows/ci.yml')
$taskMatch = [regex]::Match($taskWorkflow, '(?ms)^      - name: Promote only the current verified main commit\r?\n.*?^        run: \|\r?\n(?<body>(?:          [^\r\n]*\r?\n|\r?\n)+)')
if (-not $taskMatch.Success) { throw 'Could not find the production promotion run block.' }
$taskPromotionBlock = [scriptblock]::Create(($taskMatch.Groups['body'].Value -replace '(?m)^          ', ''))

# Execute the real workflow block, allowing only commands stubbed here or local data operations.
$taskAllowedCommands = @('gh', 'vercel', 'Out-String', 'ConvertFrom-Json', 'Start-Sleep')
foreach ($taskCommand in $taskPromotionBlock.Ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.CommandAst] }, $true)) {
    if ($taskCommand.GetCommandName() -notin $taskAllowedCommands) {
        throw "Unexpected command in promotion block: $($taskCommand.GetCommandName())"
    }
}

function Assert-Equal($Actual, $Expected, [string]$Label) {
    if ($Actual -cne $Expected) { throw "$Label`: expected '$Expected', received '$Actual'." }
}

function New-ProjectStatus([string]$Deployment = 'dpl_expected', [string]$Status = 'succeeded', [string]$Production = 'dpl_expected', [string]$Project = 'prj_expected') {
    @{
        id = $Project
        lastAliasRequest = @{ toDeploymentId = $Deployment; jobStatus = $Status }
        targets = @{ production = @{ id = $Production } }
    } | ConvertTo-Json -Depth 4 -Compress
}

function gh {
    Assert-Equal ($args -join ' ') 'api repos/test/openprep/git/ref/heads/main --jq .object.sha' 'GitHub request'
    $taskState.MainReads++
    $global:LASTEXITCODE = 0
    if ($taskCase.MovedMain) { 'newer-commit' } else { 'verified-commit' }
}

function vercel {
    $taskBody = (@($input) -join '').Trim()
    $global:LASTEXITCODE = 0
    if ($args -contains 'POST') {
        Assert-Equal ($args -join ' ') 'api /v10/projects/prj_expected/promote/dpl_expected?teamId=team_expected -X POST --input - --silent' 'Promotion request'
        Assert-Equal $taskBody '{}' 'Promotion request body'
        $taskState.Posts++
        if ($taskState.Posts -gt 1) { throw 'Promotion was requested more than once.' }
        if ($taskCase.PostFailure) { $global:LASTEXITCODE = 1 }
        return
    }

    Assert-Equal ($args -join ' ') 'api /v9/projects/prj_expected?teamId=team_expected&rollbackInfo=true --raw' 'Promotion status request'
    Assert-Equal $taskBody '' 'Promotion status request body'
    $taskState.Polls++
    if ($taskState.Polls -gt 5) { throw 'Mock promotion poll limit exceeded.' }
    $taskCase.States[[Math]::Min($taskState.Polls - 1, $taskCase.States.Count - 1)]
}

function Start-Sleep {
    param([int]$Seconds)
    Assert-Equal $Seconds 5 'Promotion poll interval'
    $taskState.Sleeps++
    if ($taskCase.Timeout) {
        # Advance the real block's deadline instead of waiting for three minutes.
        Set-Variable -Name taskPromotionDeadline -Value ([DateTime]::UtcNow.AddSeconds(-1)) -Scope 1
    }
}

$taskCases = @(
    @{
        Name = 'waits for the requested deployment and production target'
        States = @(
            New-ProjectStatus -Deployment 'dpl_previous' -Status 'failed' -Production 'dpl_previous'
            New-ProjectStatus -Status 'pending' -Production 'dpl_previous'
            New-ProjectStatus -Production 'dpl_previous'
            New-ProjectStatus
        )
        Posts = 1; Polls = 4; Sleeps = 3
    }
    @{ Name = 'rejects moved main before mutation'; MovedMain = $true; Posts = 0; Polls = 0; Sleeps = 0; Error = 'Main changed while staging; this deployment will not be promoted.' }
    @{ Name = 'rejects failed POST'; PostFailure = $true; Posts = 1; Polls = 0; Sleeps = 0; Error = 'Vercel promotion request failed.' }
    @{ Name = 'rejects another project'; States = @(New-ProjectStatus -Project 'prj_other'); Posts = 1; Polls = 1; Sleeps = 0; Error = 'Promotion status belongs to a different project.' }
    @{ Name = 'rejects failed promotion'; States = @(New-ProjectStatus -Status 'failed'); Posts = 1; Polls = 1; Sleeps = 0; Error = 'Vercel did not complete the requested promotion.' }
    @{ Name = 'rejects skipped promotion'; States = @(New-ProjectStatus -Status 'skipped'); Posts = 1; Polls = 1; Sleeps = 0; Error = 'Vercel did not complete the requested promotion.' }
    @{ Name = 'times out for another deployment'; States = @(New-ProjectStatus -Deployment 'dpl_other'); Timeout = $true; Posts = 1; Polls = 2; Sleeps = 1; Error = 'Timed out waiting for the verified deployment to become production.' }
)

$taskEnvironment = @{
    GITHUB_REPOSITORY = 'test/openprep'
    GITHUB_SHA = 'verified-commit'
    VERCEL_PROJECT_ID = 'prj_expected'
    VERCEL_ORG_ID = 'team_expected'
    DEPLOYMENT_ID = 'dpl_expected'
}
$taskPreviousEnvironment = @{}
foreach ($taskName in $taskEnvironment.Keys) {
    $taskPreviousEnvironment[$taskName] = [Environment]::GetEnvironmentVariable($taskName)
    [Environment]::SetEnvironmentVariable($taskName, $taskEnvironment[$taskName])
}

try {
    foreach ($taskCase in $taskCases) {
        $taskState = @{ MainReads = 0; Posts = 0; Polls = 0; Sleeps = 0 }
        $taskError = $null
        try { & { . $taskPromotionBlock } } catch { $taskError = $_.Exception.Message }
        Assert-Equal $taskError $taskCase.Error $taskCase.Name
        Assert-Equal $taskState.MainReads 1 "$($taskCase.Name): current-main checks"
        Assert-Equal $taskState.Posts $taskCase.Posts "$($taskCase.Name): POST count"
        Assert-Equal $taskState.Polls $taskCase.Polls "$($taskCase.Name): status polls"
        Assert-Equal $taskState.Sleeps $taskCase.Sleeps "$($taskCase.Name): mocked waits"
        Write-Host "PASS $($taskCase.Name)"
    }
} finally {
    foreach ($taskName in $taskPreviousEnvironment.Keys) {
        [Environment]::SetEnvironmentVariable($taskName, $taskPreviousEnvironment[$taskName])
    }
}

Write-Host "Passed $($taskCases.Count) workflow promotion checks."
