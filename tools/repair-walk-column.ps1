# 第八列局部检查与修复，读取原图，绝不改写原图。
param([switch]$Inspect)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$root=[IO.Path]::GetFullPath("$PSScriptRoot/../public/assets/images/characters/player")
$source=[Drawing.Bitmap]::new("$root/raw/AIT20260911013002IHEMQHUQ.png")
try {
    $crop=$source.Clone([Drawing.Rectangle]::new(2010,430,220,160),[Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
        $zoom=[Drawing.Bitmap]::new(880,640)
        $g=[Drawing.Graphics]::FromImage($zoom)
        try { $g.Clear([Drawing.Color]::LightGray); $g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::NearestNeighbor; $g.DrawImage($crop,0,0,880,640); $zoom.Save("$root/processed/walk_v2/column08-inspect.png",[Drawing.Imaging.ImageFormat]::Png) } finally { $g.Dispose(); $zoom.Dispose() }
    } finally { $crop.Dispose() }
    if ($Inspect) { return }
    $folder="$root/processed/walk_v2"
    $map=Get-Content "$folder/source-map.json" -Raw | ConvertFrom-Json
    for($row=1;$row -le 2;$row++) {
        $mask=[Drawing.Bitmap]::new(258,800)
        try {
            $minX=258;$minY=800;$maxX=-1;$maxY=-1
            for($y=200;$y -lt 770;$y++) {
                for($x=0;$x -lt 258;$x++) {
                    $sourceX=1986+$x
                    # 斜向边界沿鞋底与发饰之间的透明空隙走，不补画任何像素。
                    $boundary=[Math]::Max(490,512-0.5*[Math]::Max(0,$sourceX-2115))
                    $belongs=if($row -eq 1){$y -lt $boundary}else{$y -ge $boundary -and $y -lt 764}
                    if(!$belongs){continue}
                    $color=$source.GetPixel($sourceX,$y)
                    $mask.SetPixel($x,$y,$color)
                    if($color.A -gt 16){$minX=[Math]::Min($minX,$x);$maxX=[Math]::Max($maxX,$x);$minY=[Math]::Min($minY,$y);$maxY=[Math]::Max($maxY,$y)}
                }
            }
            $width=$maxX-$minX+1;$height=$maxY-$minY+1
            $w=[int][Math]::Round($width*0.85);$h=[int][Math]::Round($height*0.85)
            $offsetX=[int][Math]::Floor((256-$w)/2);$offsetY=248-$h
            $frame=[Drawing.Bitmap]::new(256,256);$g=[Drawing.Graphics]::FromImage($frame)
            $name='chibi_r{0:D2}_c08' -f $row
            try {
                $g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $g.DrawImage($mask,[Drawing.Rectangle]::new($offsetX,$offsetY,$w,$h),$minX,$minY,$width,$height,[Drawing.GraphicsUnit]::Pixel)
                $frame.Save("$folder/$name.png",[Drawing.Imaging.ImageFormat]::Png)
            } finally {$g.Dispose();$frame.Dispose()}
            $record=$map.frames | Where-Object {$_.id -eq $name}
            $record.sourceRect=@{x=1986+$minX;y=$minY;w=$width;h=$height}
            $record.offset=@{x=$offsetX;y=$offsetY}
            $record | Add-Member -NotePropertyName separation -NotePropertyValue 'manual diagonal alpha mask; see repair-walk-column.ps1' -Force
        } finally {$mask.Dispose()}
    }
    $map | ConvertTo-Json -Depth 10 | Set-Content "$folder/source-map.json" -Encoding utf8
    # 同步五方向原始图集及其浅底检查图，避免单帧与图集内容不同。
    $sheet=[Drawing.Bitmap]::new(2048,1280);$g=[Drawing.Graphics]::FromImage($sheet)
    try {
        for($r=1;$r -le 5;$r++){for($c=1;$c -le 8;$c++){
            $name='chibi_r{0:D2}_c{1:D2}.png' -f $r,$c
            $f=[Drawing.Bitmap]::new("$folder/$name")
            try{$g.DrawImageUnscaled($f,($c-1)*256,($r-1)*256)}finally{$f.Dispose()}
        }}
        $sheet.Save("$folder/chibi.png",[Drawing.Imaging.ImageFormat]::Png)
        $preview=[Drawing.Bitmap]::new(2048,1280);$pg=[Drawing.Graphics]::FromImage($preview)
        try{$pg.Clear([Drawing.Color]::FromArgb(224,232,235));$pg.DrawImageUnscaled($sheet,0,0);$preview.Save("$folder/chibi-preview.png",[Drawing.Imaging.ImageFormat]::Png)}finally{$pg.Dispose();$preview.Dispose()}
    }finally{$g.Dispose();$sheet.Dispose()}
    Write-Output '已重新裁切两帧，并同步五方向图集。'
} finally { $source.Dispose() }
