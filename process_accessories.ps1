Add-Type -AssemblyName System.Drawing

$dir = "c:\Users\farru\OneDrive\Desktop\stitch3d\stitch3d\public\assets\accessories"
$files = Get-ChildItem "$dir\*.png"

foreach ($file in $files) {
    Write-Host "Processing $($file.Name)"
    try {
        $img = [System.Drawing.Bitmap]::FromFile($file.FullName)
        $bmp = New-Object System.Drawing.Bitmap($img.Width, $img.Height)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.DrawImage($img, 0, 0, $img.Width, $img.Height)
        $g.Dispose()
        $img.Dispose()

        for ($x = 0; $x -lt $bmp.Width; $x++) {
            for ($y = 0; $y -lt $bmp.Height; $y++) {
                $p = $bmp.GetPixel($x, $y)
                # Stricter threshold for accessories to avoid jagged edges, or looser?
                # Using 240 threshold as before
                if ($p.R -gt 240 -and $p.G -gt 240 -and $p.B -gt 240) {
                    $bmp.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
                }
            }
        }
        $bmp.Save($file.FullName, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
    }
    catch {
        Write-Error "Failed to process $($file.Name): $_"
    }
}
