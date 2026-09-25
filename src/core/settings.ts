import {applyVolumes} from '../audio/sfx';
/* ================= SETTINGS ================= */
const SETK='farhold_settings_v1';
export const settings={music:.55,sfx:.8,density:'normal'};
try{Object.assign(settings,JSON.parse(localStorage.getItem(SETK)||'{}'))}catch(e){}
export function saveSettings(){try{localStorage.setItem(SETK,JSON.stringify(settings))}catch(e){}applyVolumes()}
