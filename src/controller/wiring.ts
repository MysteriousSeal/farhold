import { SFX as SOUND, applyVolumes } from '../view/audio/sfx';
import { ports } from '../core/ports';
import { input } from './input';
import { $, H, W } from '../view/dom';
import { warmChunks } from '../view/render/chunks';
import { zoom } from '../view/render/render';
import { setHud } from '../view/ui/hud';
import { showBanner, showToast } from '../view/ui/messages';
import { showScreen } from '../view/ui/screens';
import { openJob, openTavern } from '../view/ui/tavern';
import { openShop, openSmith } from '../view/ui/village';
/* ================= Wiring ================= */
// Plugs the real views into the model's ports (core/ports.ts): sounds, messages, screens,
// input, the camera and the windows the model opens. Imported first by main.ts.
ports.sfx = (s) => SOUND[s]();
ports.toast = showToast;
ports.banner = showBanner;
ports.screen = showScreen;
ports.hud = setHud;
ports.moveInput = () => input.moveInput();
ports.zoom = zoom;
ports.warmChunks = warmChunks;
ports.viewSize = () => [W, H];
ports.pulse = (b) => $(b === 'bags' ? '#bagBtn' : '#skillsBtn').classList.add('pulse');
ports.hurtFlash = () => {
  $('#hurt').style.opacity = 0.7;
  setTimeout(() => ($('#hurt').style.opacity = 0), 120);
};
ports.deathText = (t) => ($('#deadt').textContent = t);
ports.volumes = applyVolumes;
ports.open.shop = openShop;
ports.open.smith = openSmith;
ports.open.tavern = openTavern;
ports.open.job = openJob;
