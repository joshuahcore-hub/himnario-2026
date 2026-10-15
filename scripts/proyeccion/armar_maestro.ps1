# Proyección (1.12.0): arma el PowerPoint MAESTRO = portada + TODAS las alabanzas del himnario (cada una con SU
# diseño, "mantener formato de origen") + las imágenes fijas del final, y un índice himno -> diapositivas.
# Usa el método verificado de "PowerPoint culto\programa\armar_ppt.ps1" (PowerPoint instalado, por COM).
# Uso:
#   python -I scripts/proyeccion/emparejar.py "G:\Mi unidad\Alabanzas himnario 2026" ..\proyeccion\canciones.json
#   powershell -ExecutionPolicy Bypass -File scripts\proyeccion\armar_maestro.ps1 `
#     -Plantilla "D:\Work\Claude Code\PowerPoint culto\originales\PPT_CULTOS.pptx" `
#     -Canciones ..\proyeccion\canciones.json -Salida ..\proyeccion\maestro.pptx
# Deja maestro.pptx y maestro.json (índice). Luego: node scripts/proyeccion/subir-maestro.mjs (lo sube a Cloudflare).
param([string]$Plantilla, [string]$Canciones, [string]$Salida)
$ErrorActionPreference = "Stop"
$Salida = [IO.Path]::GetFullPath($Salida)
if (Test-Path $Salida) { Remove-Item $Salida }
$lista = Get-Content -Raw -Encoding UTF8 $Canciones | ConvertFrom-Json

Copy-Item $Plantilla $Salida
$app = New-Object -ComObject PowerPoint.Application
$indice = [ordered]@{}
try {
    $pres = $app.Presentations.Open($Salida, $false, $false, $false)
    # Canciones de la plantilla: desde la 2 hasta antes de la primera diapositiva sin texto (imágenes fijas del final).
    $fin = $pres.Slides.Count + 1
    for ($i = 2; $i -le $pres.Slides.Count; $i++) {
        $texto = ""
        foreach ($sh in $pres.Slides.Item($i).Shapes) { if ($sh.HasTextFrame) { $texto += $sh.TextFrame.TextRange.Text.Trim() } }
        if ($texto -eq "") { $fin = $i; break }
    }
    $pos = 1
    foreach ($c in $lista) {
        $p = $c.archivo
        $src = $app.Presentations.Open($p, $true, $false, $false)
        $indices = @(); foreach ($s in $src.Slides) { $indices += $s.CustomLayout.Index }
        $geo = @(); foreach ($s in $src.Slides) { $g = @{}; foreach ($sh in $s.Shapes) { $g[$sh.Name] = @($sh.Left, $sh.Top, $sh.Width, $sh.Height) }; $geo += ,$g }
        $src.Close()
        $d = $pres.Designs.Load($p)
        $n = $pres.Slides.InsertFromFile($p, $pos)
        for ($k = 0; $k -lt $n; $k++) {
            $sl = $pres.Slides.Item($pos + 1 + $k)
            $sl.Design = $d
            $sl.CustomLayout = $d.SlideMaster.CustomLayouts.Item($indices[$k])
            $g = $geo[$k]
            for ($j = $sl.Shapes.Count; $j -ge 1; $j--) {
                $sh = $sl.Shapes.Item($j)
                if ($g.ContainsKey($sh.Name)) { $v = $g[$sh.Name]; $sh.Left = $v[0]; $sh.Top = $v[1]; $sh.Width = $v[2]; $sh.Height = $v[3] }
                elseif ($sh.HasTextFrame -and $sh.TextFrame.TextRange.Text.Trim() -eq "") { $sh.Delete() }
            }
        }
        $indice["$($c.clave)"] = @(($pos + 1), ($pos + $n))
        $pos += $n
        Write-Output ("{0}: {1} diapositivas  {2}" -f $c.clave, $n, [IO.Path]::GetFileNameWithoutExtension($p))
    }
    # Recién ahora se quitan las canciones de la plantilla (si se quitan antes, PowerPoint borra su diseño).
    $viejas = $fin - 2
    for ($k = 0; $k -lt $viejas; $k++) { $pres.Slides.Item($pos + 1).Delete() }
    $total = $pres.Slides.Count
    $pres.Save()
    $pres.Close()
    $datos = [ordered]@{
        version = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
        total = $total
        portada = 1
        fijas = @(($pos + 1), $total)
        himnos = $indice
    }
    $json = $datos | ConvertTo-Json -Depth 5 -Compress
    [IO.File]::WriteAllText([IO.Path]::ChangeExtension($Salida, ".json"), $json, (New-Object Text.UTF8Encoding($false)))
    Write-Output ("Total: {0} diapositivas; fijas {1}-{2} -> {3}" -f $total, ($pos + 1), $total, $Salida)
} finally {
    $app.Quit()
    [Runtime.InteropServices.Marshal]::ReleaseComObject($app) | Out-Null
}
