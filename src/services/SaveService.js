/** 首个探索切片的本地存档；独立键名，不覆盖未来正式角色存档。 */
const KEY='shenren.foothills.v1';
export const fresh=()=>({version:1,x:970,y:1090,collected:[],visited:[]});
/** 损坏数据不写回；调用方展示警告，玩家仍可进入场景。 */
export function load(){
 try{const raw=localStorage.getItem(KEY);if(!raw)return {state:fresh()};const s=JSON.parse(raw);
 if(s.version!==1||!Number.isFinite(s.x)||!Number.isFinite(s.y)||s.x<32||s.y<32||s.x>2016||s.y>2016||!Array.isArray(s.collected)||!Array.isArray(s.visited))throw Error('invalid');
 return {state:{...s,collected:[...new Set(s.collected.filter(v=>['herb1','herb2','herb3'].includes(v)))],visited:[...new Set(s.visited.filter(v=>['home','medicine','rest'].includes(v)))]}};
 }catch{return {state:fresh(),warning:'存档无法读取，原数据已保留；本次未自动覆盖。'};}
}
export function save(state){try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch{return false;}}
