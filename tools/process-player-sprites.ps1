# 将人物原始图裁切为独立透明帧与 Phaser 图集；不修改原图。
# 使用 Windows 自带 System.Drawing，不需要安装额外图像依赖。
param(
    [string]$Source = "$PSScriptRoot/../public/assets/images/characters/player/raw/AIT20260911001738NOHK1F8W.png",
    # 新版五排均为 Q 版，独立输出，不覆盖旧版。
    [switch]$AllChibi
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
# 清除与主体断开的微小碎片，避免相邻行的鞋尖混入裁切结果。
Add-Type -ReferencedAssemblies System.Drawing.Common,System.Drawing.Primitives,System.Collections -TypeDefinition @'
using System.Collections.Generic;
using System.Drawing;
public static class SpriteCleanup {
    // 新版按连通主体分离，避免鞋尖与下一排头发在同一高度时被横线截断。
    public static Bitmap Extract(Bitmap source, int left, int columnWidth, int row) {
        int height=source.Height;
        bool[] seen=new bool[columnWidth*height];
        var components=new List<List<int>>();
        for(int start=0;start<seen.Length;start++) {
            if(seen[start] || source.GetPixel(left+start%columnWidth,start/columnWidth).A<=16) continue;
            var pixels=new List<int>(); var queue=new Queue<int>(); queue.Enqueue(start); seen[start]=true;
            while(queue.Count>0) {
                int p=queue.Dequeue(); pixels.Add(p); int x=p%columnWidth,y=p/columnWidth;
                for(int dy=-1;dy<=1;dy++) for(int dx=-1;dx<=1;dx++) {
                    int nx=x+dx,ny=y+dy;
                    if(nx<0||nx>=columnWidth||ny<0||ny>=height)continue;
                    int n=ny*columnWidth+nx;
                    if(seen[n]||source.GetPixel(left+nx,ny).A<=16)continue;
                    seen[n]=true;queue.Enqueue(n);
                }
            }
            if(pixels.Count>2000)components.Add(pixels);
        }
        // 原图少数角色彼此接触，这些列交回扫描线裁切，并在预览中复查。
        if(components.Count!=5)return null;
        components.Sort((a,b)=>a[0].CompareTo(b[0]));
        var output=new Bitmap(columnWidth,height);
        // 连通检测用阈值去噪，输出保留轮廓周边一像素的原始抗锯齿。
        foreach(int p in components[row]) {
            int x=p%columnWidth,y=p/columnWidth;
            for(int dy=-1;dy<=1;dy++)for(int dx=-1;dx<=1;dx++){
                int nx=x+dx,ny=y+dy;
                if(nx>=0&&nx<columnWidth&&ny>=0&&ny<height)output.SetPixel(nx,ny,source.GetPixel(left+nx,ny));
            }
        }
        return output;
    }
    public static void RemoveFragments(Bitmap image) {
        int width = image.Width, height = image.Height;
        bool[] visited = new bool[width * height];
        for (int start = 0; start < visited.Length; start++) {
            if (visited[start] || image.GetPixel(start % width, start / width).A == 0) continue;
            var pixels = new List<int>();
            var queue = new Queue<int>();
            queue.Enqueue(start); visited[start] = true;
            while (queue.Count > 0) {
                int current = queue.Dequeue(); pixels.Add(current);
                int x = current % width, y = current / width;
                for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) {
                    int nx = x + dx, ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                    int next = ny * width + nx;
                    if (visited[next] || image.GetPixel(nx, ny).A == 0) continue;
                    visited[next] = true; queue.Enqueue(next);
                }
            }
            if (pixels.Count < 100) foreach (int pixel in pixels)
                image.SetPixel(pixel % width, pixel / width, Color.Transparent);
        }
    }
}
'@
$outputDirectory = [System.IO.Path]::GetFullPath("$PSScriptRoot/../public/assets/images/characters/player/processed/walk_candidate")
if ($AllChibi) { $outputDirectory = [System.IO.Path]::GetFullPath("$PSScriptRoot/../public/assets/images/characters/player/processed/walk_v2") }
[System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
$sourceBitmap = [System.Drawing.Bitmap]::new([System.IO.Path]::GetFullPath($Source))

# 这些行边界仅对应当前原图；上方是正常比例人物，下方是四排 Q 版动作。
$rowBounds = @(@(60,509), @(509,764), @(764,1020), @(1020,1276), @(1276,1560))
$records = [System.Collections.Generic.List[object]]::new()

try {
    if ($sourceBitmap.Width -ne 2400 -or $sourceBitmap.Height -ne 1792) {
        throw '原图尺寸变化，请先重新检查行列边界。'
    }
    $groups = if ($AllChibi) { @('chibi') } else { @('portrait','chibi') }
    foreach ($group in $groups) {
        $cellWidth = 256
        $cellHeight = 256
        $rows = if ($group -eq 'portrait') { @(0) } else { @(1,2,3,4) }
        if ($AllChibi) { $rows = @(0,1,2,3,4) }
        $sheet = [System.Drawing.Bitmap]::new($cellWidth * 8, $cellHeight * $rows.Count)
        $sheetGraphics = [System.Drawing.Graphics]::FromImage($sheet)
        $atlasFrames = [ordered]@{}
        try {
            for ($sheetRow = 0; $sheetRow -lt $rows.Count; $sheetRow++) {
                $row = $rows[$sheetRow]
                for ($column = 0; $column -lt 8; $column++) {
                    $left = 180 + 258 * $column
                    $originalLeft = $left
                    $frameSource = $sourceBitmap
                    $useConnected = $false
                    if ($AllChibi) {
                        $isolated = [SpriteCleanup]::Extract($sourceBitmap,$left,258,$row)
                        if ($null -ne $isolated) { $frameSource=$isolated; $left=0; $useConnected=$true }
                    }
                    $top = $rowBounds[$row][0]
                    $bottom = $rowBounds[$row][1]
                    # 每列在预计分隔线附近寻找透明度总和最低的扫描行。
                    # AI 排版并不严格对齐，不能使用同一条横线硬切所有列。
                    foreach ($edge in @('top','bottom')) {
                        $estimate = if ($edge -eq 'top') { $top } else { $bottom }
                        $bestScore = [double]::PositiveInfinity
                        $bestY = $estimate
                        $searchRadius = if ($AllChibi) { 35 } else { 12 }
                        for ($scanY=$estimate-$searchRadius; $scanY -le $estimate+$searchRadius; $scanY++) {
                            $score=0
                            for ($scanX=$left; $scanX -lt $left+258; $scanX++) { $score += [int]$sourceBitmap.GetPixel($scanX,$scanY).A }
                            if ($score -lt $bestScore -or ($AllChibi -and $score -eq $bestScore)) { $bestScore=$score; $bestY=$scanY }
                        }
                        if ($edge -eq 'top') { $top=$bestY } else { $bottom=$bestY }
                    }
                    $minX = $sourceBitmap.Width
                    $minY = $sourceBitmap.Height
                    $maxX = -1
                    $maxY = -1
                    if ($useConnected) { $top=0; $bottom=$frameSource.Height }
                    # 用透明通道查找主体轮廓，忽略透明度不超过 16 的极淡杂点。
                    for ($y = $top; $y -lt $bottom; $y++) {
                        for ($x = $left; $x -lt ($left + 258); $x++) {
                            if ($frameSource.GetPixel($x,$y).A -gt 16) {
                                $minX = [Math]::Min($minX,$x)
                                $minY = [Math]::Min($minY,$y)
                                $maxX = [Math]::Max($maxX,$x)
                                $maxY = [Math]::Max($maxY,$y)
                            }
                        }
                    }
                    if ($maxX -lt 0) { throw "空白帧：$row / $column" }
                    $width = $maxX - $minX + 1
                    $height = $maxY - $minY + 1
                    if ($minX -eq $left -or $maxX -eq $left+257) { throw "人物接触横向裁切边界：$row / $column，请重新标注。" }
                    $name = '{0}_r{1:D2}_c{2:D2}' -f $group,($row+1),($column+1)
                    $frame = [System.Drawing.Bitmap]::new($cellWidth,$cellHeight)
                    $graphics = [System.Drawing.Graphics]::FromImage($frame)
                    try {
                        # 保持人物宽高比例，水平居中；轮廓底部统一留八像素。
                        # 此处是轮廓底部对齐，真正的动画支撑脚锚点仍需预览校准。
                        # 同组采用固定缩放比例，避免每帧独立缩放产生大小跳动。
                        $scale = if ($group -eq 'portrait') { 0.55 } else { 0.94 }
                        if ($AllChibi) { $scale = 0.85 }
                        $drawWidth = [int][Math]::Round($width*$scale)
                        $drawHeight = [int][Math]::Round($height*$scale)
                        if ($drawWidth -gt 240 -or $drawHeight -gt 248) { throw "缩放后超出画布：$name ($width x $height)，裁切区 $top 至 $bottom。" }
                        $offsetX = [int][Math]::Floor(($cellWidth-$drawWidth)/2)
                        $offsetY = $cellHeight-8-$drawHeight
                        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                        $destination = [System.Drawing.Rectangle]::new($offsetX,$offsetY,$drawWidth,$drawHeight)
                        $graphics.DrawImage($frameSource,$destination,$minX,$minY,$width,$height,[System.Drawing.GraphicsUnit]::Pixel)
                        [SpriteCleanup]::RemoveFragments($frame)
                        $frame.Save("$outputDirectory/$name.png",[System.Drawing.Imaging.ImageFormat]::Png)
                        $sheetGraphics.DrawImageUnscaled($frame,$column*$cellWidth,$sheetRow*$cellHeight)
                        $atlasFrames[$name] = @{
                            frame=@{x=$column*$cellWidth;y=$sheetRow*$cellHeight;w=$cellWidth;h=$cellHeight}
                            rotated=$false;trimmed=$false
                            spriteSourceSize=@{x=0;y=0;w=$cellWidth;h=$cellHeight}
                            sourceSize=@{w=$cellWidth;h=$cellHeight}
                        }
                        $sourceX = if ($useConnected) { $minX+$originalLeft } else { $minX }
                        $records.Add(@{id=$name;sourceRect=@{x=$sourceX;y=$minY;w=$width;h=$height};offset=@{x=$offsetX;y=$offsetY};origin=@{x=0.5;y=($cellHeight-8)/$cellHeight}})
                    } finally { $graphics.Dispose(); $frame.Dispose(); if ($useConnected) { $frameSource.Dispose() } }
                }
            }
            $sheet.Save("$outputDirectory/$group.png",[System.Drawing.Imaging.ImageFormat]::Png)
            @{frames=$atlasFrames;meta=@{image="$group.png";size=@{w=$sheet.Width;h=$sheet.Height};scale='1'}} | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath "$outputDirectory/$group.json" -Encoding utf8
            # 检查图仅用于看清透明边缘，不作为游戏素材。
            $preview = [System.Drawing.Bitmap]::new($sheet.Width,$sheet.Height)
            $previewGraphics = [System.Drawing.Graphics]::FromImage($preview)
            try {
                $previewGraphics.Clear([System.Drawing.Color]::FromArgb(224,232,235))
                $previewGraphics.DrawImageUnscaled($sheet,0,0)
                $preview.Save("$outputDirectory/$group-preview.png",[System.Drawing.Imaging.ImageFormat]::Png)
            } finally { $previewGraphics.Dispose(); $preview.Dispose() }
        } finally { $sheetGraphics.Dispose(); $sheet.Dispose() }
    }
    @{source=[System.IO.Path]::GetFileName($Source);frames=$records;note='候选帧，仅按源图行列编号，尚未确认八方向与动作顺序。'} | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath "$outputDirectory/source-map.json" -Encoding utf8
    Write-Output "已导出 $($records.Count) 帧至 $outputDirectory"
} finally { $sourceBitmap.Dispose() }
