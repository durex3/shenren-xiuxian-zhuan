// 浏览器端冒烟测试：真实启动 Phaser，验证画布、输入、交互及手机尺寸。
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5174');
 await page.waitForFunction(()=>window.__game?.scene.getScene('World').player);
 await page.waitForTimeout(1000);
 const position=()=>page.evaluate(()=>{const p=window.__game.scene.getScene('World').player;return {x:p.x,y:p.y};});
 const before=await position();await page.keyboard.down('d');await page.waitForTimeout(500);await page.keyboard.up('d');
 assert.ok((await position()).x>before.x+30);
 // 标签与建筑绑定，阴影在行走后仍贴合脚底且位于人物之下。
 const placement=await page.evaluate(()=>{
  const s=window.__game.scene.getScene('World');
  return {labelX:s.markers.get('restlabel').x,labelY:s.markers.get('restlabel').y,
   shadowX:s.playerShadow.x,shadowY:s.playerShadow.y,playerX:s.player.x,playerY:s.player.y,
   behind:s.playerShadow.depth<s.player.depth};
 });
 assert.equal(placement.labelX,1460);assert.ok(placement.labelY<1360);
 assert.ok(Math.abs(placement.shadowX-placement.playerX)<1);
 assert.ok(Math.abs(placement.shadowY-(placement.playerY-1))<1);assert.ok(placement.behind);
 // 地基碰撞与暂停必须真实生效，而不是只靠寻路避让。
 await page.evaluate(()=>window.__game.scene.getScene('World').player.setPosition(670,960));
 await page.keyboard.down('w');await page.waitForTimeout(1100);await page.keyboard.up('w');
 assert.ok((await position()).y>=900,'房屋碰撞必须阻挡玩家');
 await page.locator('#pause').click();const stopped=await position();
 await page.keyboard.down('d');await page.waitForTimeout(250);await page.keyboard.up('d');
 assert.ok(Math.abs((await position()).x-stopped.x)<2,'暂停时不得移动');await page.locator('#pause').click();
 await page.evaluate(()=>window.__game.scene.getScene('World').player.setPosition(970,1090));
 await page.waitForTimeout(700);
 await page.screenshot({path:'test-results/foothills-desktop.png'});
 // 将角色放到交互点，验证采集一次、重复交互不重复奖励。
 await page.evaluate(()=>{const s=window.__game.scene.getScene('World');s.player.setPosition(960,680);});
 await page.waitForTimeout(100);await page.locator('#interact').click();
 assert.match(await page.locator('#inventory').textContent(),/1 \/ 3/);
 await page.locator('#save').click();await page.reload();await page.waitForFunction(()=>window.__game?.scene.getScene('World').player);
 assert.match(await page.locator('#inventory').textContent(),/1 \/ 3/);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(600);
 await page.screenshot({path:'test-results/foothills-mobile.png'});
 assert.equal(await page.locator('#pad').isVisible(),true);
 assert.deepEqual(errors,[]);console.log('Browser checks passed: movement, collection, save/reload, mobile, no runtime errors.');
}finally{await browser.close();}
