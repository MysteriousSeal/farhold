import { lerp, rand } from '../core/math';
import { game, weather } from './state';
import { terr } from '../world/terrain';
/* ================= WORLD TICK ================= */
export function updateDay(dt) {
  if (game.mode === 'dungeon') {
    // caves are fully lit (no fog of war); the day/night cycle only applies outside
    game.dark = 0;
    game.dusk = 0;
    return;
  }
  game.P.tod = (game.P.tod + dt / 480) % 1;
  const t = game.P.tod;
  let d = 0,
    u = 0;
  if (t < 0.5) d = 0;
  else if (t < 0.6) {
    d = ((t - 0.5) / 0.1) * 0.6;
    u = Math.sin(((t - 0.5) / 0.1) * Math.PI);
  } else if (t < 0.9) d = 0.6;
  else {
    d = (1 - (t - 0.9) / 0.1) * 0.6;
    u = Math.sin(((t - 0.9) / 0.1) * Math.PI) * 0.6;
  }
  game.dark = d;
  game.dusk = u;
}
export function updateWeather(dt) {
  if (game.mode === 'dungeon') {
    weather.k = lerp(weather.k, 0, dt * 2);
    return;
  }
  const T = terr(game.P.x, game.P.y);
  weather.t -= dt;
  if (T.b === 4) {
    weather.type = 'snow';
    weather.target = 0.7;
  } else if (T.b === 6) {
    weather.type = 'ash';
    weather.target = 0.6;
  } else if (T.b === 3) {
    if (weather.type !== 'rain') {
      weather.type = 'none';
      weather.target = 0;
    }
  } else if (weather.t <= 0) {
    weather.t = rand(60, 140);
    if (Math.random() < 0.35) {
      weather.type = 'rain';
      weather.target = rand(0.5, 1);
    } else {
      weather.target = 0;
    }
  }
  if ((weather.type === 'snow' && T.b !== 4) || (weather.type === 'ash' && T.b !== 6)) {
    weather.target = 0;
  }
  weather.k = lerp(weather.k, weather.target, dt * 0.5);
  if (weather.k < 0.02 && weather.target === 0) weather.type = 'none';
}
