/** 山脚区域的配置：位置以世界像素计量，不受窗口尺寸影响。 */
export const WORLD_SIZE = 2048;
export const CELL = 32;
export const SPEED = 180;
export const assets = {
 pine:'vegetation', 'pine-large':'vegetation', bamboo:'vegetation', bush:'vegetation', grass:'vegetation',
 house:'buildings', pavilion:'buildings', pharmacy:'buildings', sign:'buildings', lantern:'buildings',
 mountain:'rocks', boulder:'rocks', pebble:'rocks', 'rock-cluster':'rocks',
};
/** 实体位置是图片底部中心；碰撞只覆盖地面占位，不覆盖整个树冠。 */
export const objects = [
 {key:'house',x:670,y:900,width:310,foot:[235,100]},
 {key:'pharmacy',x:1250,y:730,width:340,foot:[260,110]},
 {key:'pavilion',x:1460,y:1360,width:330,foot:[260,120]},
 {key:'mountain',x:390,y:520,width:400,foot:[330,95]},
 {key:'rock-cluster',x:1610,y:590,width:240,foot:[180,65]},
 {key:'boulder',x:530,y:1470,width:160,foot:[125,55]},
 {key:'sign',x:870,y:1160,width:60,foot:[25,25]},
 {key:'lantern',x:1070,y:810,width:65,foot:[35,25]},
];
// 使用固定种子布局，让刷新后的景物与碰撞保持一致。
let seed=137;
function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
for(let i=0;i<95;i++){
 const x=100+random()*1848,y=180+random()*1760;
 if(x>450&&x<1650&&y>450&&y<1500)continue;
 objects.push({key:i%3===0?'bamboo':'pine',x,y,width:130+random()*70,foot:[48,32]});
}
/** 交互点独立于建筑碰撞，保证角色可从正面接近。 */
export const points=[
 // buildingKey 关联建筑贴图；x/y 仍是玩家可以接近的门前位置。
 {id:'home',buildingKey:'house',name:'山脚小屋',x:670,y:960,kind:'place',text:'屋檐下留着一封书信：入山之人，可先往东北药庐寻求指引。'},
 {id:'medicine',buildingKey:'pharmacy',name:'青岚药庐',x:1250,y:805,kind:'place',text:'药庐主人留下委托：采齐三株青露草，便可获得入山所需的药包。'},
 {id:'rest',buildingKey:'pavilion',name:'听风亭',x:1450,y:1450,kind:'place',text:'山风穿过竹林。你记下了这处可供歇脚的凉亭。'},
 {id:'herb1',name:'青露草',x:960,y:680,kind:'herb'},
 {id:'herb2',name:'青露草',x:1550,y:1000,kind:'herb'},
 {id:'herb3',name:'青露草',x:720,y:1380,kind:'herb'},
];
