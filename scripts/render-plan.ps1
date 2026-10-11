param([string]$OutputDirectory = 'tmp/review/plan-render')
$ErrorActionPreference = 'Stop'
$planRoot = Split-Path $PSScriptRoot -Parent
$planDocx = Join-Path $planRoot 'docs/PokemonPedia Improvement Plan.docx'
$planPdf = Join-Path $planRoot 'docs/PokemonPedia Improvement Plan.pdf'
$wordApp = New-Object -ComObject Word.Application
$wordApp.Visible = $false
$wordApp.DisplayAlerts = 0
$wordDocument = $null
try {
  $wordDocument = $wordApp.Documents.Open($planDocx, $false, $true)
  [void]$wordDocument.Fields.Update()
  foreach ($planSection in $wordDocument.Sections) { foreach ($planFooter in $planSection.Footers) { [void]$planFooter.Range.Fields.Update() } }
  $wordDocument.ExportAsFixedFormat($planPdf, 17)
} finally {
  if ($null -ne $wordDocument) { $wordDocument.Close(0); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($wordDocument) }
  $wordApp.Quit()
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($wordApp)
}
$renderDirectory = Join-Path $planRoot $OutputDirectory
New-Item -ItemType Directory -Force -Path $renderDirectory | Out-Null
$poppler = 'C:/Users/Ritesh Gupta/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe'
& $poppler -scale-to 1500 -png $planPdf (Join-Path $renderDirectory 'page')
if ($LASTEXITCODE -ne 0) { throw 'Plan PDF rendering failed.' }
Write-Output "Updated and rendered both plan files in $renderDirectory"
