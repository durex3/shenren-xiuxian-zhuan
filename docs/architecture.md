# 项目架构

## 一、工程目录

以下为目标结构，按阶段创建实际需要的文件，不提前制造空实现。使用 JavaScript ES Modules 与 JSDoc，开发构建默认选用 Vite，Phaser 版本在初始化时核实并固定。

```text
game/
├─ index.html                  # 网页入口与画布挂载点
├─ package.json                # 依赖、启动、构建、测试命令
├─ src/
│  ├─ main.js                  # 创建 Phaser 游戏并组装依赖
│  ├─ gameConfig.js            # 分辨率、缩放、渲染与物理配置
│  ├─ scenes/                 # 流程与显示场景
│  │  ├─ base/BaseScene.js     # 公共清理约定，不承载通用业务大全
│  │  ├─ BootScene.js         # 初始化存档、配置和基础服务
│  │  ├─ PreloadScene.js      # 最小启动资源、加载进度、重试
│  │  ├─ MainMenuScene.js     # 开始、继续与设置
│  │  ├─ CharacterCreateScene.js # 姓名、性别、形象与灵根选择
│  │  ├─ WorldScene.js        # 实时地图探索，承担原 GameScene 职责
│  │  ├─ BattleScene.js       # 回合战斗演出及指令交互
│  │  ├─ UIScene.js           # 探索 HUD、任务追踪与面板入口
│  │  ├─ PauseScene.js        # 暂停与恢复
│  │  └─ SettlementScene.js   # 战斗或章节结算
│  ├─ entities/               # 场景内实体与表现
│  │  ├─ base/                # 仅抽离实际共用的实体生命周期
│  │  ├─ player/              # 玩家与移动控制
│  │  ├─ enemies/             # 地图敌群与战斗敌人表现
│  │  ├─ companions/          # 伙伴、灵兽表现
│  │  ├─ items/               # 采集物、宝箱、掉落物
│  │  └─ effects/             # 命中、法术等短生命周期特效
│  ├─ systems/                # 玩法规则，尽量不依赖 Phaser
│  │  ├─ battle/              # 回合状态机、排序、技能目标与伤害计算
│  │  ├─ cultivation/         # 灵根、修为、闭关、顿悟与突破
│  │  ├─ inventory/           # 背包、物品使用与装备
│  │  ├─ quest/               # 任务条件、进度和一次性奖励
│  │  ├─ world/               # 地图解锁、交互、遭遇和资源刷新
│  │  ├─ calendar/            # 历法、时间消耗与暂停原因
│  │  ├─ party/               # 队伍和前后排阵位
│  │  ├─ crafting/            # 炼丹炼器，后续扩展
│  │  └─ sect/                # 宗门与贡献，后续扩展
│  ├─ ui/                     # HUD、按钮、面板、提示框等可复用显示组件
│  │  ├─ base/                # 面板打开、关闭与资源释放
│  │  ├─ components/          # 进度条、物品格等小组件
│  │  └─ panels/              # 背包、任务、功法、闭关、设置面板
│  ├─ state/                  # 可序列化数据与受控修改入口
│  │  ├─ GameState.js         # 世界进度、历法、任务和队伍
│  │  ├─ PlayerState.js       # 玩家创建信息和成长数据
│  │  └─ SettingsState.js     # 音量、输入与显示设置
│  ├─ events/                 # EventBus.js 与事件名称 GameEvents.js
│  ├─ config/                 # 场景键、资源键、层级和规则常量
│  ├─ services/               # 持久化、资源、输入和音频边界
│  │  ├─ SaveService.js       # 存档校验、版本迁移、导入导出
│  │  ├─ StorageService.js    # IndexedDB 读写
│  │  ├─ ResourceService.js   # 资源清单与按区域加载
│  │  ├─ InputService.js      # 键鼠与触屏统一操作意图
│  │  └─ AudioService.js      # 音量、音乐和浏览器音频解锁
│  └─ utils/                  # 随机数、数学、校验与日志等纯工具
├─ public/assets/             # 原样发布的运行资源
│  ├─ images/                 # characters/maps/items/ui/effects 子目录
│  ├─ audio/                  # bgm/sfx/voice 子目录
│  ├─ fonts/                  # 字体与授权信息
│  ├─ tilemaps/               # 地图分层、碰撞与交互对象数据
│  └─ data/                   # config/levels/dialogues/localization 子目录
├─ styles/                    # 页面布局、画布容器与字体
├─ tests/                     # unit 单元测试、integration 集成、e2e 浏览器流程
├─ tools/                     # 配置引用检查、资源清单验证
├─ docs/                      # 需求、计划、架构和美术规范
└─ dist/                      # 构建生成的发布目录，不手工编辑
```

相比初始目录方案，资源收敛至 public/assets 以适配构建工具；不额外封装 Phaser 自带的场景管理器。需要对象池时先使用 Phaser Group 等已有能力，避免维护重复的管理层。

## 二、模块如何协作

玩家点击技能，UI 提交“释放技能”指令；战斗系统校验灵力与目标并计算结果；BattleScene 根据结果播放动画。数值结算不依赖动画时长，因此倍速不会影响结果。

状态层保存普通对象、数组和数值，不放 Phaser 场景、图片或音频实例。存档只保存状态数据。系统拥有对应状态的修改权，UI 不直接修改金币、血量或任务进度。

同模块直接调用方法；跨模块的结果通知才使用事件，例如战斗结束、背包变化。事件总线不作为所有操作的隐式调用入口，避免难以追踪。

探索切入战斗时暂停探索输入与更新，保存返回位置，隐藏探索 UI；战斗结算后恢复或送回安全点。对话、背包、暂停等用带原因的暂停令牌管理，关闭一个面板不会误恢复其他面板仍要求暂停的世界。

## 三、性能与可靠性

- 只加载启动和当前区域需要的资源；共享人物与 UI 图集复用，区域资源按引用释放。
- 不每帧刷新全部 UI，只响应数据变化。离屏对象减少更新，静态背景按块组织。
- 场景关闭时统一取消事件监听、计时器和输入订阅，重复进出不积累对象。
- 先测量再池化高频特效；普通回合单位不必预先建设复杂对象池。
- 点击寻路使用成熟寻路库与地图碰撞数据，不能仅让角色直线穿过建筑。
- 规则计算使用可注入随机源，便于复现战斗与顿悟问题。正式游戏不在每帧创建随机源。
- 奖励结算、任务完成与状态更新作为一次逻辑操作，完成后再写存档；禁止连点重复领奖。
- 存档含 schemaVersion；加载时校验结构与数据引用。损坏存档不静默覆盖，保留导出和恢复入口。

## 四、代码与解释规范

所有代码文件使用中文说明职责；类、公开方法与重要数据用中文 JSDoc 描述参数、返回值、单位和限制。复杂算法解释原因，简单赋值不重复注释。纯规则与 Phaser 表现分开，使 Java 开发者可以先理解输入、输出和状态变化。

配置 JSON 不支持注释，字段说明写入配套 Markdown 或 schema，不能添加非法 JSON 注释。每个交付阶段说明启动方法、主要调用链和可修改参数。
