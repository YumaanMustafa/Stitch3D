Add-Type -AssemblyName System.Drawing

$colors = @("black", "brown", "tan")
$dir = "c:\Users\farru\OneDrive\Desktop\stitch3d\stitch3d\public\assets\leather"

function Remove-Background($imagePath) {
    if (-not (Test-Path $imagePath)) { return }
    Write-Host "Processing $imagePath"
    try {
        $img = [System.Drawing.Bitmap]::FromFile($imagePath)
        $bmp = New-Object System.Drawing.Bitmap($img.Width, $img.Height)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.DrawImage($img, 0, 0, $img.Width, $img.Height)
        $g.Dispose()
        $img.Dispose()

        for ($x = 0; $x -lt $bmp.Width; $x++) {
            for ($y = 0; $y -lt $bmp.Height; $y++) {
                $p = $bmp.GetPixel($x, $y)
                if ($p.R -gt 240 -and $p.G -gt 240 -and $p.B -gt 240) {
                    $bmp.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
                }
            }
        }
        $bmp.Save($imagePath, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
    }
    catch {
        Write-Error "Failed to process $imagePath`: $_"
    }
}

foreach ($c in $colors) {
    # 1. Ensure Left/Right exist from Side
    $side = "$dir\$c`_side.png"
    $left = "$dir\$c`_left.png"
    $right = "$dir\$c`_right.png"

    if (Test-Path $side) {
        # Create Left (Same as Side)
        Copy-Item $side $left -Force
        
        # Create Right (Mirrored Side)
        $img = [System.Drawing.Image]::FromFile($side)
        $img.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX)
        $img.Save($right, [System.Drawing.Imaging.ImageFormat]::Png)
        $img.Dispose()
    }

    # 2. Process Backgrounds for all 4 views
    Remove-Background "$dir\$c`_front.png"
    Remove-Background "$dir\$c`_back.png"
    Remove-Background "$dir\$c`_left.png"
    Remove-Background "$dir\$c`_right.png"
}
