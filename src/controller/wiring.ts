import { SFX as SOUND } from '../audio/sfx';
import { ports } from '../core/ports';
import { moveInput } from '../input/input';
import { warmChunks } from '../render/chunks';
import { zoom } from '../render/render';
import { setHud } from '../ui/hud';
import { showBanner, showToast } from '../ui/messages';
import { showScreen } from '../ui/screens';
import { openJob, openTavern } from '../ui/tavern';
import { openShop, openSmith } from '../ui/village';
/* ================= Wiring ================= */
// Plugs the real views into the model's ports (core/ports.ts): sounds, messages, screens,
// input, the camera and the windows the model opens. Imported first by main.ts.
ports.sfx = (s) => SOUND[s]();
ports.toast = showToast;
ports.banner = showBanner;
ports.screen = showScreen;
ports.hud = setHud;
ports.moveInput = moveInput;
ports.zoom = zoom;
ports.warmChunks = warmChunks;
ports.open.shop = openShop;
ports.open.smith = openSmith;
ports.open.tavern = openTavern;
ports.open.job = openJob;
