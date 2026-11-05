// Day or night, without three.js, so the page shell can ask before the scene has loaded. The visitor's
// day/night toggle (chooseTime) overrides ?time= (night, day or an hour), which overrides their clock.

import { lighting } from './config';

/** The visitor's pick from the day/night toggle; null follows ?time= or the clock. */
let chosen: 'day' | 'night' | null = null;

export function chooseTime(time: 'day' | 'night' | null) {
	chosen = time;
}

/** The visitor's pick, if any. */
export const chosenTime = () => chosen;

/** Whether it's night: the visitor's pick, else ?time=, else their clock. */
export function isNight() {
	if (chosen) return chosen === 'night';
	const param = new URLSearchParams(globalThis.location?.search ?? '').get('time');
	if (param === 'night') return true;
	if (param === 'day') return false;
	const h = param !== null && Number.isFinite(Number(param)) ? Number(param) : new Date().getHours();
	return h >= lighting.nightFrom || h < lighting.nightUntil;
}
