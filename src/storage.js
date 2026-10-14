import {deserialize,serialize} from './engine.js';
export const AUTO_KEY='four-seasons-autosave-v2';
export const MANUAL_KEY='four-seasons-manual-save-v2';
export function saveState(storage,state,manual=false){storage.setItem(manual?MANUAL_KEY:AUTO_KEY,serialize(state));}
export function loadState(storage,manual=false){const raw=storage.getItem(manual?MANUAL_KEY:AUTO_KEY);return raw===null?null:deserialize(raw);}
export function clearSaves(storage){storage.removeItem(AUTO_KEY);storage.removeItem(MANUAL_KEY);}
