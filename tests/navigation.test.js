// 规则层测试不需要启动浏览器，验证建筑阻挡与路径可达性。
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildGrid,route} from '../src/systems/navigation.js';
import {objects,points,CELL} from '../src/config/world.js';
test('出生点可通行，房屋地基不可通行',()=>{const grid=buildGrid(objects);assert.ok(grid.isWalkableAt(30,34));assert.equal(grid.isWalkableAt(Math.floor(670/CELL),Math.floor(870/CELL)),false);});
test('所有探索点都能从出生点抵达',()=>{const grid=buildGrid(objects);for(const point of points)assert.ok(route(grid,{x:970,y:1090},point).length,point.id);});
test('拒绝越界或障碍物目标',()=>{const grid=buildGrid(objects);assert.deepEqual(route(grid,{x:970,y:1090},{x:-100,y:50}),[]);assert.deepEqual(route(grid,{x:970,y:1090},{x:670,y:870}),[]);});
