/** 组装入口：Phaser 管地图，HTML 管可访问的界面按钮。 */
import Phaser from 'phaser';
import './style.css';
import {WorldScene} from './scenes/WorldScene.js';

// 开场视频结束后才显示 Phaser 游戏界面；使用一次性事件避免重复启动。
const intro=document.querySelector('#intro');
const introVideo=document.querySelector('#intro-video');
const startGame=document.querySelector('#start-game');
let introClosed=false;
function closeIntro(){
  if(introClosed)return;
  introClosed=true;
  intro.classList.add('is-hidden');
  introVideo.pause();
  window.setTimeout(()=>intro.remove(),500);
}
// 视频作为封面背景循环播放；玩家主动点击“开始游戏”才进入探索。
startGame.addEventListener('click',closeIntro);
const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',backgroundColor:'#bed3a5',scale:{mode:Phaser.Scale.RESIZE,width:window.innerWidth,height:window.innerHeight},physics:{default:'arcade',arcade:{debug:false}},scene:[WorldScene]});
// 仅开发环境暴露实例，方便自动化验证物理状态，发布版不提供调试入口。
if(import.meta.env.DEV)window.__game=game;
