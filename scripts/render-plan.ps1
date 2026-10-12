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
$pdfinfo = Join-Path (Split-Path $poppler -Parent) 'pdfinfo.exe'
$pageMatch = (& $pdfinfo $planPdf | Select-String '^Pages:\s+(\d+)').Matches
if ($LASTEXITCODE -ne 0 -or $pageMatch.Count -ne 1) { throw 'Could not read plan PDF page count.' }
$pageCount = [int]$pageMatch[0].Groups[1].Value
# Fresh processes avoid Poppler glyph-cache artifacts across pages.
for ($pageNumber = 1; $pageNumber -le $pageCount; $pageNumber++) {
  & $poppler -f $pageNumber -l $pageNumber -r 144 -png $planPdf (Join-Path $renderDirectory 'page')
  if ($LASTEXITCODE -ne 0) { throw "Plan PDF rendering failed on page $pageNumber." }
}
Write-Output "Updated and rendered both plan files in $renderDirectory"
