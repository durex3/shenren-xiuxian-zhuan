# 将用户已抠图的素材裁切成独立 PNG；坐标基于原图 2048 方形布局。
# 不改下载目录原文件。只裁切、等比缩小，保留原有半透明像素。
Add-Type -AssemblyName System.Drawing
$ErrorActionPreference='Stop'
$root=Join-Path $PSScriptRoot '..\public\assets\images\maps\common'
$sources=@{
 vegetation='AIT20260912084928G9IOJDZS.png'
 buildings='AIT202609120850201FHTWVI1.png'
 rocks='AIT20260912085111GSLBLSN0.png'
}
# 每条记录：文件名、归属、裁切矩形（以1600预览尺寸描述）、输出最大边长。
$items=@(
 @('pine','vegetation',580,35,420,445,440),
 @('pine-large','vegetation',1070,20,485,470,500),
 @('bamboo','vegetation',610,500,380,430,380),
 @('bush','vegetation',650,970,320,300,180),
 @('grass','vegetation',590,1320,450,240,110),
 @('house','buildings',70,35,660,650,520),
 @('pavilion','buildings',820,45,690,775,500),
 @('pharmacy','buildings',65,705,740,755,500),
 @('sign','buildings',850,900,330,580,140),
 @('lantern','buildings',1230,990,285,525,150),
 @('mountain','rocks',65,40,750,490,550),
 @('boulder','rocks',75,570,505,260,230),
 @('pebble','rocks',715,600,185,140,80),
 @('rock-cluster','rocks',1100,945,440,275,300)
)
foreach($item in $items){
 $name,$category,$x,$y,$w,$h,$limit=$item
 $dir=Join-Path $root $category
 New-Item -ItemType Directory -Force -Path $dir | Out-Null
 $image=[System.Drawing.Bitmap]::new((Join-Path 'C:\Users\liuge\Downloads' $sources[$category]))
 try {
  $factor=$image.Width/1600.0
  $rect=[System.Drawing.Rectangle]::new([int]($x*$factor),[int]($y*$factor),[int]($w*$factor),[int]($h*$factor))
  $crop=$image.Clone($rect,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $scale=$limit/[double][Math]::Max($crop.Width,$crop.Height)
  $out=[System.Drawing.Bitmap]::new([int]($crop.Width*$scale),[int]($crop.Height*$scale))
  $g=[System.Drawing.Graphics]::FromImage($out)
  $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($crop,0,0,$out.Width,$out.Height)
  $out.Save((Join-Path $dir "$name.png"),[System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $crop.Dispose(); $out.Dispose()
  Write-Output "Processed $category/$name"
 } finally { $image.Dispose() }
}
