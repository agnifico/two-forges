// Day and night: two hand-tuned looks, picked by the visitor's clock (night is set in
// `lighting.nightFrom` / `nightUntil`). Night brings purple-blue moonlight, a night background, and
// switches on lamps, windows and screens (`night` = 1, see life.ts). The change eases over a few
// seconds if the hour turns while someone is watching.
// Preview with ?time=night or ?time=day (or an hour, ?time=21) in the URL. The visitor's day/night
// toggle (chooseTime) overrides both.

import { Color, MathUtils, Vector3, type DirectionalLight, type HemisphereLight } from 'three';
import { lighting, palette } from './config';

const EASE_MS = 3000;

/** The visitor's pick from the day/night toggle; null follows ?time= or the clock. */
let chosen: 'day' | 'night' | null = null;

export function chooseTime(time: 'day' | 'night' | null) {
	chosen = time;
}

/** Whether it's night: the visitor's pick, else ?time=, else their clock. */
export function isNight() {
	if (chosen) return chosen === 'night';
	const param = new URLSearchParams(globalThis.location?.search ?? '').get('time');
	if (param === 'night') return true;
	if (param === 'day') return false;
	const h = param !== null && Number.isFinite(Number(param)) ? Number(param) : new Date().getHours();
	return h >= lighting.nightFrom || h < lighting.nightUntil;
}

export type Daylight = ReturnType<typeof createDaylight>;

export function createDaylight(sun: DirectionalLight, hemi: HemisphereLight, target: Vector3) {
	const n = lighting.night;
	const day = {
		sun: new Color(palette.sun),
		sunPosition: new Vector3(...lighting.sunPosition),
		hemiSky: new Color(palette.hemiSky),
		hemiGround: new Color(palette.hemiGround)
	};
	const night = {
		sun: new Color(n.moon),
		sunPosition: new Vector3(...n.moonPosition),
		hemiSky: new Color(n.hemiSky),
		hemiGround: new Color(n.hemiGround)
	};
	const state = { night: isNight() ? 1 : 0 };
	let last = performance.now();
	let lastCheck = 0;
	let lastChosen = chosen;
	let goal = state.night;

	return {
		state,
		/** Eases towards the current hour's look and applies it to the sun (or moon) and sky light. */
		update(now = performance.now()) {
			if (now - lastCheck > 30_000 || chosen !== lastChosen) {
				lastCheck = now;
				lastChosen = chosen;
				goal = isNight() ? 1 : 0;
			}
			const step = (now - last) / EASE_MS;
			last = now;
			state.night = MathUtils.clamp(state.night + Math.sign(goal - state.night) * step, 0, 1);
			const t = MathUtils.smootherstep(state.night, 0, 1);

			sun.position.copy(target).add(day.sunPosition.clone().lerp(night.sunPosition, t));
			sun.color.copy(day.sun).lerp(night.sun, t);
			sun.intensity = MathUtils.lerp(lighting.sunIntensity, n.moonIntensity, t);
			sun.shadow.intensity = MathUtils.lerp(lighting.shadowIntensity, n.shadowIntensity, t);
			hemi.color.copy(day.hemiSky).lerp(night.hemiSky, t);
			hemi.groundColor.copy(day.hemiGround).lerp(night.hemiGround, t);
			hemi.intensity = MathUtils.lerp(lighting.hemiIntensity, n.hemiIntensity, t);
			return { night: t };
		},
		/** The page background: a side's day colour or its night colour. */
		sky(dayColor: Color, nightColor: Color, out: Color) {
			return out.copy(dayColor).lerp(nightColor, MathUtils.smootherstep(state.night, 0, 1));
		}
	};
}
