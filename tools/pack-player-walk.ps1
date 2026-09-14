# 将已裁切并修复的候选帧打包成八方向图集。
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$folder=[IO.Path]::GetFullPath("$PSScriptRoot/../public/assets/images/characters/player/processed/walk_v2")
$directions=@('s','sw','w','nw','n','ne','e','se')
$rows=@(1,2,3,4,5,4,3,2)
$sheet=[Drawing.Bitmap]::new(2048,2048)
$graphics=[Drawing.Graphics]::FromImage($sheet)
$atlas=[ordered]@{}
$animations=[ordered]@{}
try {
    for($r=0;$r -lt 8;$r++) {
        $count=8
        $names=@()
        for($c=0;$c -lt $count;$c++) {
            $sourceName='chibi_r{0:D2}_c{1:D2}' -f $rows[$r],($c+1)
            $frame=[Drawing.Bitmap]::new("$folder/$sourceName.png")
            try {
                if($frame.Width -ne 256 -or $frame.Height -ne 256){throw '候选帧尺寸错误。'}
                if($r -ge 5){$frame.RotateFlip([Drawing.RotateFlipType]::RotateNoneFlipX)}
                $name='walk_{0}_{1:D2}' -f $directions[$r],($c+1)
                $frame.Save("$folder/$name.png",[Drawing.Imaging.ImageFormat]::Png)
                $graphics.DrawImageUnscaled($frame,$c*256,$r*256)
                $atlas[$name]=@{frame=@{x=$c*256;y=$r*256;w=256;h=256};rotated=$false;trimmed=$false;spriteSourceSize=@{x=0;y=0;w=256;h=256};sourceSize=@{w=256;h=256}}
                $names+=$name
            }finally{$frame.Dispose()}
        }
        $animations[$directions[$r]]=@{frames=$names;frameRate=8;repeat=-1;mirrored=($r -ge 5);status='candidate'}
    }
    $sheet.Save("$folder/walk.png",[Drawing.Imaging.ImageFormat]::Png)
    @{frames=$atlas;meta=@{image='walk.png';size=@{w=2048;h=2048};scale='1'}} | ConvertTo-Json -Depth 10 | Set-Content "$folder/walk.json" -Encoding utf8
    @{origin=@{x=0.5;y=0.96875};animations=$animations} | ConvertTo-Json -Depth 10 | Set-Content "$folder/animations.json" -Encoding utf8
    $preview=[Drawing.Bitmap]::new(2048,2048)
    $previewGraphics=[Drawing.Graphics]::FromImage($preview)
    try{
        $previewGraphics.Clear([Drawing.Color]::FromArgb(224,232,235))
        $previewGraphics.DrawImageUnscaled($sheet,0,0)
        $preview.Save("$folder/walk-preview.png",[Drawing.Imaging.ImageFormat]::Png)
    }finally{$previewGraphics.Dispose();$preview.Dispose()}
    Write-Output "已生成 $($atlas.Count) 帧八方向候选图集。"
}finally{$graphics.Dispose();$sheet.Dispose()}
