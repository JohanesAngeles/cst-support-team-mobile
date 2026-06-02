# CST Driver App — Icon Generator
# Uses .NET System.Drawing (built into Windows — no installs needed)
# Run from repo root: .\scripts\generate-icon.ps1

Add-Type -AssemblyName System.Drawing

function New-CSTIcon {
    param(
        [int]$Size,
        [string]$OutputPath,
        [bool]$Square = $false
    )

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode    = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $navy = [System.Drawing.Color]::FromArgb(26, 58, 92)     # #1A3A5C
    $gold = [System.Drawing.Color]::FromArgb(245, 166, 35)   # #F5A623
    $light = [System.Drawing.Color]::FromArgb(176, 196, 222) # #B0C4DE

    # Background
    $bgBrush = New-Object System.Drawing.SolidBrush($navy)
    if ($Square) {
        $g.FillRectangle($bgBrush, 0, 0, $Size, $Size)
    } else {
        # Rounded rect for icon
        $radius = [int]($Size * 0.22)
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.AddArc(0, 0, $radius*2, $radius*2, 180, 90)
        $path.AddArc($Size - $radius*2, 0, $radius*2, $radius*2, 270, 90)
        $path.AddArc($Size - $radius*2, $Size - $radius*2, $radius*2, $radius*2, 0, 90)
        $path.AddArc(0, $Size - $radius*2, $radius*2, $radius*2, 90, 90)
        $path.CloseFigure()
        $g.FillPath($bgBrush, $path)
    }

    # Gold accent bar (top)
    $barH = [int]($Size * 0.045)
    $barY = [int]($Size * 0.12)
    $barPad = [int]($Size * 0.12)
    $goldBrush = New-Object System.Drawing.SolidBrush($gold)
    $g.FillRectangle($goldBrush, $barPad, $barY, $Size - $barPad*2, $barH)

    # "CST" text
    $fontSize = [int]($Size * 0.38)
    try {
        $font = New-Object System.Drawing.Font("Arial Black", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    } catch {
        $font = New-Object System.Drawing.Font("Arial", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    }
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment     = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $textRect = New-Object System.Drawing.RectangleF(0, ($Size * 0.08), $Size, ($Size * 0.65))
    $g.DrawString("CST", $font, $goldBrush, $textRect, $sf)

    # Separator line
    $sepY = [int]($Size * 0.70)
    $lightPen = New-Object System.Drawing.Pen($light, [int]([Math]::Max(1, $Size * 0.004)))
    $g.DrawLine($lightPen, $barPad, $sepY, $Size - $barPad, $sepY)

    # "DRIVER" subtitle
    $subSize = [int]($Size * 0.10)
    try {
        $subFont = New-Object System.Drawing.Font("Arial Black", $subSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    } catch {
        $subFont = New-Object System.Drawing.Font("Arial", $subSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    }
    $lightBrush = New-Object System.Drawing.SolidBrush($light)
    $subRect = New-Object System.Drawing.RectangleF(0, ($Size * 0.72), $Size, ($Size * 0.20))
    $g.DrawString("DRIVER", $subFont, $lightBrush, $subRect, $sf)

    $g.Dispose()
    $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "  Generated: $OutputPath ($Size x $Size)"
}

Write-Host "`nCST Icon Generator" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan

$assets = ".\cst-mobile\assets"

New-CSTIcon -Size 1024 -OutputPath "$assets\icon.png"
New-CSTIcon -Size 1024 -OutputPath "$assets\adaptive-icon.png" -Square $true
New-CSTIcon -Size 512  -OutputPath "$assets\splash-icon.png"
New-CSTIcon -Size 48   -OutputPath "$assets\favicon.png"

Write-Host "`nDone! All icons generated." -ForegroundColor Green
Write-Host "Review them in cst-mobile/assets/ before building." -ForegroundColor Yellow
