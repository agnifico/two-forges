// The site's sound: three tunes that follow the visitor (see MusicPlayer.svelte for which plays
// when), crossfading from one to the next, and a few small effects (`play`) for what the visitor does.
// One on/off and one volume for both, remembered per browser. Browsers only let sound start after a
// click or key press, so it begins on the visitor's first one. Each tune streams from static/music
// only once it's played; the effects (static/sounds, Kenney CC0, a few KB each) load when sound starts.

import { asset } from '$app/paths';

/** In player order: 1, 2, 3 on its display. */
export const tunes = ['rain-in-the-solar-city', 'anklet-of-stars', 'crown-of-the-silent-fortress'] as const;

const STORE_KEY = 'agnifico-music';
const FADE_S = 1.6;
const tuneUrl = (name: string) => asset(`music/${name}.mp3` as Parameters<typeof asset>[0]);

/**
 * The effects: the files each picks from (at random, so repeats vary) and how loud, levelled by ear
 * against the music at its own volume.
 */
const effects = {
	/** A station opens: a page turning. */
	page: { files: ['page-1', 'page-2'], gain: 0.8 },
	/** The furnace opens: a ting on the anvil. */
	anvil: { files: ['anvil-1', 'anvil-2', 'anvil-3'], gain: 0.4 },
	/** What was open closes: a book shutting. */
	close: { files: ['close'], gain: 0.3 },
	/** The island turns over: a cloak's swish. */
	flip: { files: ['flip'], gain: 0.75 },
	/** Landing on the war side: a blade drawn. */
	blade: { files: ['blade'], gain: 1.4 },
	/** A secret found: a few coins. */
	secret: { files: ['secret'], gain: 1.1 },
	/** Day and night. */
	toggle: { files: ['toggle'], gain: 0.35 }
} as const;
export type Effect = keyof typeof effects;
const soundUrl = (name: string) => asset(`sounds/${name}.wav` as Parameters<typeof asset>[0]);
/** Effects sit a little under the music. */
const EFFECTS_LEVEL = 0.7;

interface Deck {
	audio: HTMLAudioElement;
	gain: GainNode;
	tune: number;
}

class Music {
	/** Off until the visitor turns it on (the front door asks); their choice is remembered. */
	on = $state(false);
	volume = $state(0.5);
	/** The tune playing (or to play once sound may start), 0-based. */
	index = $state(0);
	/** Sound has started (after the first click or key). */
	started = $state(false);
	/** False on pages that have no sound of their own (/simplified). */
	#allowed = true;

	#context: AudioContext | undefined;
	#master: GainNode | undefined;
	#decks: Deck[] = [];
	#live: Deck | undefined;
	#effects: GainNode | undefined;
	#buffers = new Map<string, AudioBuffer>();

	constructor() {
		if (typeof window === 'undefined') return;
		try {
			const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null');
			if (typeof saved?.on === 'boolean') this.on = saved.on;
			if (typeof saved?.volume === 'number') this.volume = Math.min(1, Math.max(0, saved.volume));
		} catch {
			// Storage blocked or unreadable: defaults.
		}
		const start = () => {
			window.removeEventListener('pointerdown', start, true);
			window.removeEventListener('keydown', start, true);
			this.#start();
		};
		window.addEventListener('pointerdown', start, true);
		window.addEventListener('keydown', start, true);
		document.addEventListener('visibilitychange', () => this.#apply());
	}

	/** Silences everything on pages without sound, and brings it back on the island. */
	allow(allowed: boolean) {
		if (allowed === this.#allowed) return;
		this.#allowed = allowed;
		this.#apply();
	}

	/** The scene asks for a tune (a flip, day or night). */
	cue(index: number) {
		if (index === this.index) return;
		this.index = index;
		this.#apply();
	}

	/** The visitor steps through the tunes (the player's arrows). */
	step(by: number) {
		this.index = (this.index + by + tunes.length) % tunes.length;
		if (!this.on) this.on = true;
		this.#save();
		this.#apply();
	}

	toggle() {
		this.on = !this.on;
		this.#save();
		if (!this.started) this.#start();
		else this.#apply();
	}

	/** Plays a small effect, if sound is on (and has started). */
	play(effect: Effect) {
		const context = this.#context;
		if (!context || !this.#effects || !this.on || !this.#allowed) return;
		const { files, gain } = effects[effect];
		const buffer = this.#buffers.get(files[Math.floor(Math.random() * files.length)]);
		if (!buffer) return;
		if (context.state === 'suspended') context.resume();
		const source = context.createBufferSource();
		source.buffer = buffer;
		const level = context.createGain();
		level.gain.value = gain;
		source.connect(level).connect(this.#effects);
		source.start();
	}

	setVolume(volume: number) {
		this.volume = volume;
		this.#save();
		this.#master?.gain.setTargetAtTime(volume * volume, this.#context!.currentTime, 0.05);
	}

	#start() {
		if (this.started) return;
		this.started = true;
		this.#context = new AudioContext();
		this.#master = this.#context.createGain();
		this.#master.gain.value = this.volume * this.volume;
		this.#master.connect(this.#context.destination);
		this.#effects = this.#context.createGain();
		this.#effects.gain.value = EFFECTS_LEVEL;
		this.#effects.connect(this.#master);
		this.#apply();
		this.#loadEffects();
	}

	async #loadEffects() {
		const names = new Set(Object.values(effects).flatMap((e) => e.files));
		await Promise.all(
			[...names].map(async (name) => {
				try {
					const data = await (await fetch(soundUrl(name))).arrayBuffer();
					this.#buffers.set(name, await this.#context!.decodeAudioData(data));
				} catch {
					// That one stays silent.
				}
			})
		);
	}

	/** Plays what should be playing: the chosen tune if music is on and the page is visible, else nothing. */
	#apply() {
		const context = this.#context;
		if (!context || !this.#master) return;
		const audible = this.on && this.#allowed && document.visibilityState === 'visible';
		if (audible && context.state === 'suspended') context.resume();
		const want = audible ? this.index : -1;
		if ((this.#live?.tune ?? -1) === want) return;
		const now = context.currentTime;
		// Fade out whatever plays, then pause it.
		if (this.#live) {
			const old = this.#live;
			old.gain.gain.cancelScheduledValues(now);
			old.gain.gain.setValueAtTime(old.gain.gain.value, now);
			old.gain.gain.linearRampToValueAtTime(0, now + FADE_S);
			setTimeout(() => this.#live !== old && old.audio.pause(), FADE_S * 1000 + 50);
			this.#live = undefined;
		}
		if (want < 0) return;
		const deck = this.#deck(want);
		deck.gain.gain.cancelScheduledValues(now);
		deck.gain.gain.setValueAtTime(deck.gain.gain.value, now);
		deck.gain.gain.linearRampToValueAtTime(1, now + FADE_S);
		deck.audio.play().catch(() => {});
		this.#live = deck;
	}

	/** One audio element per tune, made the first time it plays and kept (it resumes where it was). */
	#deck(tune: number): Deck {
		let deck = this.#decks.find((d) => d.tune === tune);
		if (deck) return deck;
		const audio = new Audio(tuneUrl(tunes[tune]));
		audio.loop = true;
		audio.preload = 'none';
		const gain = this.#context!.createGain();
		gain.gain.value = 0;
		this.#context!.createMediaElementSource(audio).connect(gain).connect(this.#master!);
		deck = { audio, gain, tune };
		this.#decks.push(deck);
		return deck;
	}

	#save() {
		try {
			localStorage.setItem(STORE_KEY, JSON.stringify({ on: this.on, volume: this.volume }));
		} catch {
			// Not remembered this time.
		}
	}
}

export const music = new Music();
