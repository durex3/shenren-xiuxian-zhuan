import Phaser from 'phaser';

// 素材路径集中管理：增加动作时，只需补充对应的文件列表。
const root = '/assets/images/characters/';
const player = `${root}player/battle/`;
const spider = `${root}pets/red_jade_spider/battle/`;
const sequence = (base, prefix, count) => Array.from({length: count}, (_, i) => `${base}${prefix}${String(i + 1).padStart(2, '0')}.png`);
const playerIdle = `${player}player_battle_idle_base.png`;
const spiderIdle = `${spider}idle/red_jade_spider_battle_idle.png`;
const spiderAttackFrames = [`${spider}attack/frames/attack_03.png`, `${spider}attack/frames/attack_02.png`];
const spiderDeathFrames = sequence(`${spider}death/frames/`, 'red_jade_spider_death_', 4);
const spiderDeathEffectFrames = sequence(`${spider}death/effects/`, 'red_jade_spider_death_fx_', 4);
const spiderDeathEffectStart = 1 + spiderDeathFrames.length;
// 特效播放期间保持最终倒地姿势，身体和灵光分别控制，避免用特效图替换角色。
const spiderDeathTimeline = [spiderIdle, ...spiderDeathFrames, ...spiderDeathEffectFrames.map(() => spiderDeathFrames.at(-1))];
// 所有一次性战斗动作都自动添加“待机→动作→待机”，避免切换时跳帧。
const battleAction = (idle, frames, returnToIdle = true) => [idle, ...frames, ...(returnToIdle ? [idle] : [])];
const actors = {
  player: {
    idle: [playerIdle],
    attack: battleAction(playerIdle, sequence(`${player}attack/frames/`, 'player_attack_normal_', 6)),
    defense: battleAction(playerIdle, sequence(`${player}defense/frames/`, 'player_defense_', 3), false),
    hit: battleAction(playerIdle, sequence(`${player}hit/frames/`, 'player_hit_', 6)),
    cast: battleAction(playerIdle, sequence(`${player}cast/frames/`, 'player_cast_', 8)),
    death: battleAction(playerIdle, sequence(`${player}death/frames/`, 'player_death_', 6), false),
    escape: battleAction(playerIdle, sequence(`${player}escape/frames/`, 'player_escape_', 4), false),
  },
  spider: {
    idle: [spiderIdle],
    // 普攻和施法共用身体动作；正式技能通过独立特效、命中表现和音效区分。
    attack: battleAction(spiderIdle, spiderAttackFrames),
    defense: battleAction(spiderIdle, [`${spider}defense/frames/defense_01.png`, `${spider}defense/frames/defense_02.png`], false),
    hit: battleAction(spiderIdle, sequence(`${spider}hit/frames/`, 'red_jade_spider_hit_', 3)),
    cast: battleAction(spiderIdle, spiderAttackFrames),
    death: spiderDeathTimeline,
    escape: battleAction(spiderIdle, sequence(`${spider}escape/frames/`, 'red_jade_spider_escape_', 4), false),
  },
};
const labels = {idle:'待机', attack:'普通攻击', defense:'防御', hit:'受击', cast:'基础功法', death:'死亡', escape:'逃跑'};
const effectFiles = {
  web: `${spider}effects/web_projectile.png`, impact: `${spider}effects/web_impact.png`,
  wind: `${player}attack/effects/player_attack_wind.png`, hit: `${player}attack/effects/player_attack_hit.png`,
  idleShield: `${player}defense/effects/shield_idle.png`,
  hitShield: `${player}defense/effects/shield_hit.png`, breakShield: `${player}defense/effects/shield_break.png`,
};
const ui = Object.fromEntries(['actor','action','fps','fpsText','loop','flip','effects','ghost','shield','size','status','file','errors'].map(id => [id, document.getElementById(id)]));
let scene;
let frame = 0;
let elapsed = 0;
let playing = false;
const currentFrames = () => actors[ui.actor.value][ui.action.value];

// 更换角色时只列出真实存在的动作，避免把缺图显示成正常动画。
function refreshActions() {
  const previous = ui.action.value;
  ui.action.replaceChildren(...Object.keys(actors[ui.actor.value]).map(key => new Option(labels[key], key)));
  if (actors[ui.actor.value][previous]) ui.action.value = previous;
}
function reset() { frame = 0; elapsed = 0; playing = false; }
refreshActions();
ui.actor.addEventListener('change', () => { refreshActions(); reset(); });
ui.action.addEventListener('change', reset);
ui.fps.addEventListener('input', () => { ui.fpsText.textContent = `${ui.fps.value} 帧/秒`; elapsed = 0; });
document.getElementById('play').onclick = () => { if(frame === currentFrames().length - 1) frame = 0; playing = true; elapsed = 0; };
document.getElementById('pause').onclick = () => { playing = false; };
document.getElementById('reset').onclick = reset;
for (const [id, direction] of [['prev', -1], ['next', 1]]) {
  document.getElementById(id).onclick = () => { playing = false; elapsed = 0; frame = (frame + direction + currentFrames().length) % currentFrames().length; };
}

class PreviewScene extends Phaser.Scene {
  preload() {
    // URL 同时作为纹理键，待机等重复引用的文件只加载一次。
    const files = new Set([...Object.values(actors).flatMap(actions => Object.values(actions).flat()), ...Object.values(effectFiles), ...spiderDeathEffectFrames]);
    this.load.on('loaderror', file => { ui.errors.textContent += `加载失败：${file.key}\n`; });
    for (const url of files) this.load.image(url, url);
  }
  create() {
    scene = this;
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x76939a, 0.2);
    for(let x = 0; x <= 1000; x += 40) grid.lineBetween(x, 0, x, 560);
    for(let y = 0; y <= 560; y += 40) grid.lineBetween(0, y, 1000, y);
    grid.lineStyle(2, 0xc6b978, 0.6).lineBetween(560, 440, 940, 440);
    this.add.text(100, 150, '敌方目标', {fontSize:'22px', color:'#d4dedf'});
    this.add.circle(180, 300, 58, 0x738d87, 0.35).setStrokeStyle(2, 0xa8c7b9);
    this.reference = this.add.image(750, 275, playerIdle).setAlpha(0.22);
    this.body = this.add.image(750, 275, playerIdle);
    this.fx = this.add.image(500, 300, effectFiles.web).setVisible(false);
    this.shield = this.add.image(750, 275, effectFiles.idleShield).setVisible(false);
    this.game.events.on('blur', () => { playing = false; });
  }
  update(_time, delta) {
    const frames = currentFrames();
    // 手动时钟用于逐帧暂停；不按单帧内容裁切缩放，保留真实对齐问题。
    if (playing) {
      elapsed += Math.min(delta, 100);
      const duration = 1000 / Number(ui.fps.value);
      while(elapsed >= duration) {
        elapsed -= duration;
        if(frame < frames.length - 1) frame++;
        else if(ui.loop.checked) frame = 0;
        else { playing = false; elapsed = 0; break; }
      }
    }
    const size = Number(ui.size.value);
    const fit = (image, key, boxSize) => {
      image.setTexture(key);
      const source = image.texture.getSourceImage();
      image.setScale(boxSize / Math.max(source.width, source.height)).setFlipX(ui.flip.checked);
    };
    fit(this.body, frames[frame], size);
    this.body.setAlpha(1);
    fit(this.reference, actors[ui.actor.value].idle[0], size);
    this.reference.setVisible(ui.ghost.checked);
    const shieldType = ui.shield.value === 'auto' ? (ui.action.value === 'defense' && frame > 0 ? 'idle' : 'off') : ui.shield.value;
    this.shield.setVisible(shieldType !== 'off');
    if(shieldType !== 'off') fit(this.shield, effectFiles[`${shieldType}Shield`], size * 1.25);
    // 特效与角色分层。攻击后半段演示飞行和命中，不将特效烘焙进动作帧。
    const attacking = ui.effects.checked && ui.action.value === 'attack' && frame >= 2;
    const deathEffectIndex = frame - spiderDeathEffectStart;
    const dying = ui.effects.checked && ui.actor.value === 'spider' && ui.action.value === 'death' && deathEffectIndex >= 0;
    this.fx.setVisible(attacking || dying);
    if(attacking) {
      this.fx.setBlendMode(Phaser.BlendModes.NORMAL);
      const impact = frame === frames.length - 1;
      const isSpider = ui.actor.value === 'spider';
      fit(this.fx, effectFiles[isSpider ? (impact ? 'impact' : 'web') : (impact ? 'hit' : 'wind')], impact ? 170 : 240);
      const progress = Math.min(1, (frame - 2 + elapsed / (1000 / Number(ui.fps.value))) / Math.max(1, frames.length - 3));
      this.fx.setPosition(impact ? 180 : Phaser.Math.Linear(610, 180, progress), 300);
    } else if(dying) {
      this.fx.setBlendMode(Phaser.BlendModes.ADD);
      fit(this.fx, spiderDeathEffectFrames[deathEffectIndex], size * 1.3);
      this.fx.setPosition(750, 275);
      this.body.setAlpha(1 - (deathEffectIndex + 1) / spiderDeathEffectFrames.length);
    }
    ui.status.textContent = `${ui.actor.options[ui.actor.selectedIndex].text} · ${labels[ui.action.value]} · 第 ${frame + 1} / ${frames.length} 帧 · ${playing ? '播放中' : '已暂停'}`;
    ui.file.textContent = `当前素材：${frames[frame]}${dying ? `；叠加特效：${spiderDeathEffectFrames[deathEffectIndex]}` : ''}`;
  }
}

// 独立 Phaser 实例，无需启动正式世界场景或读取玩家存档。
new Phaser.Game({type:Phaser.AUTO, parent:'stage', width:1000, height:560, backgroundColor:'#20323a', scale:{mode:Phaser.Scale.FIT, autoCenter:Phaser.Scale.CENTER_BOTH}, scene:PreviewScene});
