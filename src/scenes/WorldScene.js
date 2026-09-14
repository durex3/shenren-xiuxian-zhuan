import Phaser from 'phaser';
import {assets,objects,points,WORLD_SIZE,SPEED,CELL} from '../config/world.js';
import {buildGrid,route} from '../systems/navigation.js';
import {load,save} from '../services/SaveService.js';
/** 探索场景：加载当前区域所需图片，负责物理、镜头和交互表现。 */
export class WorldScene extends Phaser.Scene{
 constructor(){super('World');this.direction='s';this.path=[];this.touch=null;this.paused=false;}
 preload(){
  const base='/assets/images/';
  this.load.image('ground',base+'maps/common/ground/grass_base_01.png');
  for(const [key,category] of Object.entries(assets))this.load.image(key,`${base}maps/common/${category}/${key}.png`);
  // 待机与行走资源按“探索动作”目录管理；旧 processed 目录仍保留作备份。
  for(const type of ['idle','walk']){
   const folder=type==='walk'?'exploration/walk':'processed/idle';
   this.load.atlas(type,`${base}characters/player/${folder}/${type}.png`,`${base}characters/player/${folder}/${type}.json`);
  }
  this.load.on('progress',v=>this.notice(`正在加载山脚资源 ${Math.round(v*100)}%`));
  this.load.on('loaderror',()=>this.notice('资源加载失败，请刷新页面重试。'));
 }
 create(){
  this.add.tileSprite(0,0,WORLD_SIZE,WORLD_SIZE,'ground').setOrigin(0);
  this.grid=buildGrid(objects);this.physics.world.setBounds(32,32,WORLD_SIZE-64,WORLD_SIZE-64);
  const blockers=this.physics.add.staticGroup();
  // 保存建筑图片引用，让名称使用图片尺寸定位，而不是使用门前交互坐标。
  const buildings=new Map();
  for(const o of objects){
   const image=this.add.image(o.x,o.y,o.key).setOrigin(.5,1);image.setScale(o.width/image.width).setDepth(o.y);
   if(assets[o.key]==='buildings')buildings.set(o.key,image);
   if(o.foot){const block=this.add.rectangle(o.x,o.y-o.foot[1]/2,...o.foot,0,0);blockers.add(block);}
  }
  const loaded=load();this.state=loaded.state;this.autosave=!loaded.warning;
  if(!this.grid.isWalkableAt(Math.floor(this.state.x/CELL),Math.floor(this.state.y/CELL))){this.state.x=970;this.state.y=1090;}
  this.player=this.physics.add.sprite(this.state.x,this.state.y,'idle','idle_s').setOrigin(.5,.96875).setScale(.42);
  // 接触阴影没有物理碰撞；分层半透明椭圆让边缘更轻，不随行走帧闪烁。
  this.playerShadow=this.add.container(this.player.x,this.player.y,[
   this.add.ellipse(0,0,36,14,0x26392b,.09),
   this.add.ellipse(0,0,28,10,0x26392b,.14),
   this.add.ellipse(0,0,18,6,0x26392b,.12),
  ]);
  // 在物理更新后同步位置，暂停或恢复时也不会残留上一帧的阴影。
  const syncShadow=()=>{
   this.playerShadow.setPosition(this.player.x,this.player.y-1).setDepth(this.player.y-.5);
   this.player.setDepth(this.player.y);
  };
  syncShadow();this.events.on('postupdate',syncShadow);
  this.events.once('shutdown',()=>this.events.off('postupdate',syncShadow));
  this.player.body.setSize(44,26).setOffset(106,220);this.player.setCollideWorldBounds(true);this.physics.add.collider(this.player,blockers);
  for(const d of ['s','sw','w','nw','n','ne','e','se'])this.anims.create({key:`walk-${d}`,frames:Array.from({length:8},(_,i)=>({key:'walk',frame:`walk_${d}_${String(i+1).padStart(2,'0')}`})),frameRate:8,repeat:-1});
  this.cameras.main.setBounds(0,0,WORLD_SIZE,WORLD_SIZE).startFollow(this.player,true,.1,.1);
  this.markers=new Map();
  for(const p of points){
   if(p.kind==='herb'){const herb=this.add.image(p.x,p.y,'grass').setOrigin(.5,1).setScale(.65).setDepth(p.y);this.markers.set(p.id,herb);}
   const building=buildings.get(p.buildingKey);
   const labelX=building?building.x:p.x;
   const labelY=building?building.y-building.displayHeight+12:p.y+15;
   // 建筑名位于屋顶上缘；统一置于世界标注层，避免被附近树冠遮住。
   const label=this.add.text(labelX,labelY,p.name,{fontFamily:'Microsoft YaHei',fontSize:'13px',color:'#244737',backgroundColor:'#f4f8e5',padding:{x:7,y:4}}).setOrigin(.5,building?1:0).setDepth(WORLD_SIZE+10);this.markers.set(p.id+'label',label);
  }
  this.keys=this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,ESC');
  this.input.on('pointerdown',pointer=>{if(!this.paused){this.path=route(this.grid,this.player,{x:pointer.worldX,y:pointer.worldY});if(!this.path.length)this.notice('此处无法抵达。');}});
  const abort=new AbortController(),opts={signal:abort.signal};
  document.querySelector('#interact').addEventListener('click',()=>this.interact(),opts);
  document.querySelector('#save').addEventListener('click',()=>this.persist(),opts);
  document.querySelector('#pause').addEventListener('click',()=>this.togglePause(),opts);
  document.querySelector('#close-dialog').addEventListener('click',()=>document.querySelector('#dialog').close(),opts);
  document.querySelector('#dialog').addEventListener('close',()=>{this.paused=false;},opts);
  for(const button of document.querySelectorAll('[data-dir]'))button.addEventListener('pointerdown',e=>{e.preventDefault();this.touch=button.dataset.dir;this.path=[];},opts);
  window.addEventListener('pointerup',()=>this.touch=null,opts);window.addEventListener('pointercancel',()=>this.touch=null,opts);
  window.addEventListener('blur',()=>{this.touch=null;this.path=[];this.paused=true;document.querySelector('#pause').textContent='▶';},opts);
  this.events.once('shutdown',()=>abort.abort());
  this.time.addEvent({delay:5000,loop:true,callback:()=>{if(this.autosave)this.persist(false);}});
  this.refresh();this.notice(loaded.warning||'山风渐起，你来到了青岚山脚。');
 }
 /** 更新仅计算输入、角色速度与近处目标；静态景物无需逐帧重建。 */
 update(){
  if(!this.player)return;
  if(Phaser.Input.Keyboard.JustDown(this.keys.ESC)&&!document.querySelector('#dialog').open)this.togglePause();
  this.player.setVelocity(0);
  if(this.paused){this.player.anims.stop();return;}
  let dx=Number(this.keys.D.isDown||this.keys.RIGHT.isDown||this.touch==='e')-Number(this.keys.A.isDown||this.keys.LEFT.isDown||this.touch==='w');
  let dy=Number(this.keys.S.isDown||this.keys.DOWN.isDown||this.touch==='s')-Number(this.keys.W.isDown||this.keys.UP.isDown||this.touch==='n');
  if(dx||dy)this.path=[];
  else if(this.path.length){const target=this.path[0];dx=target.x-this.player.x;dy=target.y-this.player.y;if(Math.hypot(dx,dy)<5){this.path.shift();dx=dy=0;}}
  if(dx||dy){const v=new Phaser.Math.Vector2(dx,dy).normalize().scale(SPEED);this.player.setVelocity(v.x,v.y);this.direction=['e','se','s','sw','w','nw','n','ne'][(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8];this.player.play('walk-'+this.direction,true);}
  else{this.player.anims.stop();this.player.setTexture('idle','idle_'+this.direction);}
  this.player.setDepth(this.player.y);
  this.near=points.filter(p=>!this.state.collected.includes(p.id)).find(p=>Math.hypot(p.x-this.player.x,p.y-this.player.y)<100);
  const button=document.querySelector('#interact');button.hidden=!this.near;if(this.near)button.textContent=(this.near.kind==='herb'?'采集 · ':'查看 · ')+this.near.name;
  if(Phaser.Input.Keyboard.JustDown(this.keys.E))this.interact();
 }
 /** 交互改变可序列化状态；已采集资源不会重复奖励。 */
 interact(){
  const p=this.near;if(!p||this.paused)return;
  if(p.kind==='herb'){if(this.state.collected.includes(p.id))return;this.state.collected.push(p.id);this.notice('获得青露草 × 1');}
  else{if(!this.state.visited.includes(p.id))this.state.visited.push(p.id);this.paused=true;this.path=[];document.querySelector('#dialog-title').textContent=p.name;document.querySelector('#dialog-text').textContent=p.id==='medicine'&&this.state.collected.length===3?'三株青露草已经备齐。药庐主人认可了你的耐心，入山前的准备完成了。':p.text;document.querySelector('#dialog').showModal();}
  this.refresh();if(this.autosave)this.persist(false);
 }
 refresh(){for(const id of this.state.collected){this.markers.get(id)?.setVisible(false);this.markers.get(id+'label')?.setVisible(false);}document.querySelector('#inventory').textContent=`灵草 ${this.state.collected.length} / 3`;document.querySelector('#discoveries').textContent=`地点 ${this.state.visited.length} / 3`;document.querySelector('#quest').textContent=this.state.collected.length===3?(this.state.visited.includes('medicine')?'山野初行 · 已完成':'前往药庐'): '寻找药庐，采集三株灵草';}
 persist(notify=true){this.state.x=this.player.x;this.state.y=this.player.y;const ok=save(this.state);if(notify)this.notice(ok?'进度已保存到此浏览器。':'保存失败：浏览器存储不可用。');}
 togglePause(){this.paused=!this.paused;this.path=[];this.touch=null;document.querySelector('#pause').textContent=this.paused?'▶':'Ⅱ';}
 notice(text){document.querySelector('#notice').textContent=text;}
}
