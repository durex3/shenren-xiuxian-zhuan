import PF from 'pathfinding';
import {CELL,WORLD_SIZE} from '../config/world.js';
/** 成熟 A* 库负责寻路；格子额外留出角色脚底半径，避免贴墙穿模。 */
export function buildGrid(objects){
 const n=WORLD_SIZE/CELL,grid=new PF.Grid(n,n);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const px=x*CELL+CELL/2,py=y*CELL+CELL/2;
  if(x===0||y===0||x===n-1||y===n-1||objects.some(o=>o.foot&&Math.abs(px-o.x)<o.foot[0]/2+24&&py>o.y-o.foot[1]-24&&py<o.y+24))grid.setWalkableAt(x,y,false);
 }return grid;
}
/** 每次 clone：寻路库会在搜索中写节点状态，不可复用污染后的网格。 */
export function route(grid,from,to){
 const a=[Math.floor(from.x/CELL),Math.floor(from.y/CELL)],b=[Math.floor(to.x/CELL),Math.floor(to.y/CELL)];
 if(!grid.isInside(...b)||!grid.isWalkableAt(...b))return [];
 return new PF.AStarFinder({allowDiagonal:true,dontCrossCorners:true}).findPath(...a,...b,grid.clone()).slice(1).map(([x,y])=>({x:x*CELL+CELL/2,y:y*CELL+CELL/2}));
}
