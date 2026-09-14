# 新版行走素材

原图 AIT20260911013002IHEMQHUQ.png 保持不变。chibi_* 为五排共 40 张裁切候选，每张 256×256。同组固定等比缩放 0.85，轮廓底部对齐 y=248。

walk.png / walk.json 为八方向 Phaser 图集，方向依次为下、左下、左、左上、上、右上、右、右下。右侧三个方向由左侧镜像。walk_*.png 为对应独立透明帧，walk-preview.png 为静态检查图。

原图第一排第八帧脚部与第二排发饰在高度上交错。已使用 repair-walk-column.ps1 沿透明空隙进行斜向分离，恢复完整脚部并去掉下一帧顶部混入的鞋子。两帧已重新加入图集，八方向各 8 帧，共 64 帧。其他帧未调整。

animations.json 记录候选播放顺序与 8 FPS 建议值，不是已验证的最终动作。原图存在相似姿势重复、衣纹变化和不同帧身高变化；静态裁切不能修复这些问题。尚未完成动画连贯性和待机切换的游戏内验证。

运行顺序（PowerShell 7，项目根目录）：

```powershell
pwsh -NoProfile -File tools/process-player-sprites.ps1 -Source public/assets/images/characters/player/raw/AIT20260911013002IHEMQHUQ.png -AllChibi
pwsh -NoProfile -File tools/repair-walk-column.ps1
pwsh -NoProfile -File tools/pack-player-walk.ps1
```
