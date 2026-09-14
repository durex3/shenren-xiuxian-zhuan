# 使用 PowerShell 7 运行。提取透明原图中纵向排列的五个角色，镜像补齐八方向。
# 原图只读，输出统一为 256×256；同组固定缩放，轮廓底部位于 y=248。
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = [IO.Path]::GetFullPath("$PSScriptRoot/../public/assets/images/characters/player")
$source = [Drawing.Bitmap]::new("$root/raw/AIT20260911005325YZEAOEWO.png")
$output = "$root/processed/idle"
[IO.Directory]::CreateDirectory($output) | Out-Null
$frames = @{}
try {
    if ($source.GetPixel(0,0).A -ne 0) { throw '背景不是透明的，需要单独处理。' }
    # 按非透明扫描行分组；忽略极淡杂点，组间必须有完全空白的扫描行。
    $bands = [Collections.Generic.List[object]]::new()
    $start = -1
    for ($y=0; $y -le $source.Height; $y++) {
        $hasContent = $false
        if ($y -lt $source.Height) {
            for ($x=0; $x -lt $source.Width; $x++) {
                if ($source.GetPixel($x,$y).A -gt 16) { $hasContent=$true; break }
            }
        }
        if ($hasContent -and $start -lt 0) { $start=$y }
        if (!$hasContent -and $start -ge 0) {
            if ($y-$start -gt 30) { $bands.Add(@{top=$start;bottom=$y}) }
            $start=-1
        }
    }
    if ($bands.Count -ne 5) { throw "预期五个角色，实际扫描得到 $($bands.Count)，停止处理。" }
    $directions = @('s','sw','w','nw','n')
    $rectangles = @{}
    $maximumHeight = 0
    $maximumWidth = 0
    for ($index=0; $index -lt 5; $index++) {
        $band=$bands[$index]; $left=$source.Width; $right=-1
        for ($y=$band.top; $y -lt $band.bottom; $y++) {
            for ($x=0; $x -lt $source.Width; $x++) {
                if ($source.GetPixel($x,$y).A -gt 16) { $left=[Math]::Min($left,$x); $right=[Math]::Max($right,$x) }
            }
        }
        $rect=[Drawing.Rectangle]::new($left,$band.top,$right-$left+1,$band.bottom-$band.top)
        $rectangles[$directions[$index]]=$rect
        $maximumHeight=[Math]::Max($maximumHeight,$rect.Height)
        $maximumWidth=[Math]::Max($maximumWidth,$rect.Width)
    }
    # 目标主体高度约 240 像素，与已有行走帧接近；宽高比例不变。
    $scale=[Math]::Min(240.0/$maximumHeight,240.0/$maximumWidth)
    foreach ($direction in $directions) {
        $frame=[Drawing.Bitmap]::new(256,256)
        $frames[$direction]=$frame
        $graphics=[Drawing.Graphics]::FromImage($frame)
        try {
            $rect=$rectangles[$direction]
            $width=[int][Math]::Round($rect.Width*$scale)
            $height=[int][Math]::Round($rect.Height*$scale)
            $destination=[Drawing.Rectangle]::new([int][Math]::Floor((256-$width)/2),248-$height,$width,$height)
            $graphics.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.DrawImage($source,$destination,$rect,[Drawing.GraphicsUnit]::Pixel)
        } finally { $graphics.Dispose() }
    }
    $mirrors=@{se='sw';e='w';ne='nw'}
    foreach ($direction in $mirrors.Keys) {
        $frame=[Drawing.Bitmap]$frames[$mirrors[$direction]].Clone()
        $frame.RotateFlip([Drawing.RotateFlipType]::RotateNoneFlipX)
        $frames[$direction]=$frame
    }
    $order=@('s','sw','w','nw','n','ne','e','se')
    $sheet=[Drawing.Bitmap]::new(2048,256)
    $sheetGraphics=[Drawing.Graphics]::FromImage($sheet)
    $atlas=[ordered]@{}
    $mapping=[ordered]@{}
    try {
        for ($index=0; $index -lt $order.Count; $index++) {
            $direction=$order[$index]; $name="idle_$direction"
            $frames[$direction].Save("$output/$name.png",[Drawing.Imaging.ImageFormat]::Png)
            $sheetGraphics.DrawImageUnscaled($frames[$direction],$index*256,0)
            $atlas[$name]=@{frame=@{x=$index*256;y=0;w=256;h=256};rotated=$false;trimmed=$false;spriteSourceSize=@{x=0;y=0;w=256;h=256};sourceSize=@{w=256;h=256}}
            $sourceDirection=if($mirrors.ContainsKey($direction)){$mirrors[$direction]}else{$direction}
            $rect=$rectangles[$sourceDirection]
            $mapping[$direction]=@{frame=$name;mirrored=$mirrors.ContainsKey($direction);sourceDirection=$sourceDirection;sourceRect=@{x=$rect.X;y=$rect.Y;w=$rect.Width;h=$rect.Height}}
        }
        $sheet.Save("$output/idle.png",[Drawing.Imaging.ImageFormat]::Png)
        @{frames=$atlas;meta=@{image='idle.png';size=@{w=2048;h=256};scale='1'}} | ConvertTo-Json -Depth 10 | Set-Content "$output/idle.json" -Encoding utf8
        @{source='AIT20260911005325YZEAOEWO.png';scale=$scale;origin=@{x=0.5;y=0.96875};directions=$mapping} | ConvertTo-Json -Depth 10 | Set-Content "$output/source-map.json" -Encoding utf8
        $preview=[Drawing.Bitmap]::new(1024,560)
        $previewGraphics=[Drawing.Graphics]::FromImage($preview)
        $font=[Drawing.Font]::new('Arial',12)
        try {
            $previewGraphics.Clear([Drawing.Color]::FromArgb(224,232,235))
            for ($index=0; $index -lt 8; $index++) {
                $x=($index%4)*256; $y=[int][Math]::Floor($index/4)*280
                $previewGraphics.DrawImageUnscaled($frames[$order[$index]],$x,$y)
                $previewGraphics.DrawString($order[$index].ToUpper(),$font,[Drawing.Brushes]::Black,$x+118,$y+256)
            }
            $preview.Save("$output/idle-preview.png",[Drawing.Imaging.ImageFormat]::Png)
        } finally { $font.Dispose(); $previewGraphics.Dispose(); $preview.Dispose() }
    } finally { $sheetGraphics.Dispose(); $sheet.Dispose() }
    Write-Output "已生成八方向待机图：$output"
} finally {
    foreach ($frame in $frames.Values) { $frame.Dispose() }
    $source.Dispose()
}
