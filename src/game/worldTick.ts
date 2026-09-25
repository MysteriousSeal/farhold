import {lerp,rand} from '../core/math';
import {game,weather} from './state';
import {terr} from '../world/terrain';
/* ================= WORLD TICK ================= */
export function updateDay(dt){if(game.mode==='dungeon'){game.dark=.86;game.dusk=0;return}game.P.tod=(game.P.tod+dt/480)%1;const t=game.P.tod;let d=0,u=0;
 if(t<.5)d=0;else if(t<.6){d=(t-.5)/.1*.6;u=Math.sin((t-.5)/.1*Math.PI)}else if(t<.9)d=.6;else{d=(1-(t-.9)/.1)*.6;u=Math.sin((t-.9)/.1*Math.PI)*.6}
 game.dark=d;game.dusk=u}
export function updateWeather(dt){if(game.mode==='dungeon'){weather.k=lerp(weather.k,0,dt*2);return}const T=terr(game.P.x,game.P.y);weather.t-=dt;
 if(T.b===4){weather.type='snow';weather.target=.7}else if(T.b===6){weather.type='ash';weather.target=.6}
 else if(T.b===3){if(weather.type!=='rain'){weather.type='none';weather.target=0}}
 else if(weather.t<=0){weather.t=rand(60,140);if(Math.random()<.35){weather.type='rain';weather.target=rand(.5,1)}else{weather.target=0}}
 if((weather.type==='snow'&&T.b!==4)||(weather.type==='ash'&&T.b!==6)){weather.target=0}
 weather.k=lerp(weather.k,weather.target,dt*.5);if(weather.k<.02&&weather.target===0)weather.type='none'}
