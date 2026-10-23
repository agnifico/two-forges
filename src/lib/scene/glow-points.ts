// Soft glowing dots drawn as points, all their motion on the GPU: twinkling stars in the sky and
// fireflies wandering over the island. Sizes are in CSS pixels, the same at any zoom.

import {
	AdditiveBlending,
	BufferAttribute,
	BufferGeometry,
	Color,
	NormalBlending,
	Points,
	ShaderMaterial
} from 'three';
import { pixelRatio } from './renderer';

export interface GlowDot {
	/** Where it rests (or wanders around). */
	at: readonly [number, number, number];
	/** CSS pixels. */
	size: number;
	/** 0 to 1: offsets its twinkle (and wander) so no two dots move together. */
	phase: number;
}

export interface GlowPoints {
	points: Points;
	/** Advances the twinkle and sets how visible the whole set is (0 hidden, 1 full). */
	tick(time: number, opacity: number): void;
	dispose(): void;
}

/**
 * `wander` (world units) lets each dot drift around its resting place on its own slow loop, as
 * fireflies do; 0 keeps them still (stars). `blink` makes them flash on and off rather than shimmer.
 */
export function createGlowPoints(
	dots: GlowDot[],
	{ color, wander = 0, blink = false, additive = false }: { color: string; wander?: number; blink?: boolean; additive?: boolean }
): GlowPoints {
	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new BufferAttribute(new Float32Array(dots.flatMap((d) => d.at)), 3));
	geometry.setAttribute('size', new BufferAttribute(new Float32Array(dots.map((d) => d.size)), 1));
	geometry.setAttribute('phase', new BufferAttribute(new Float32Array(dots.map((d) => d.phase)), 1));
	const material = new ShaderMaterial({
		uniforms: {
			time: { value: 0 },
			opacity: { value: 0 },
			pixelRatio: { value: pixelRatio() },
			wander: { value: wander },
			color: { value: new Color(color) }
		},
		defines: blink ? { BLINK: '' } : {},
		vertexShader: /* glsl */ `
			attribute float size;
			attribute float phase;
			uniform float time;
			uniform float opacity;
			uniform float pixelRatio;
			uniform float wander;
			varying float vAlpha;
			void main() {
				float p = phase * 6.2832;
				float t = time * 0.001;
				vec3 at = position + wander * vec3(
					sin(t * (0.31 + phase * 0.2) + p) + 0.5 * sin(t * 0.83 + p * 2.0),
					0.45 * sin(t * (0.57 + phase * 0.3) + p * 3.0),
					cos(t * (0.27 + phase * 0.25) + p) + 0.5 * cos(t * 0.71 + p * 1.7)
				);
				#ifdef BLINK
					// Mostly dim, with a slow bright pulse every few seconds.
					float glow = 0.35 + 0.65 * pow(max(0.0, sin(t * (0.9 + phase * 0.6) + p)), 3.0);
				#else
					float glow = 0.6 + 0.4 * sin(t * (1.1 + phase * 1.7) + p);
				#endif
				vAlpha = opacity * glow;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(at, 1.0);
				gl_PointSize = size * pixelRatio * (0.8 + 0.4 * glow);
			}
		`,
		fragmentShader: /* glsl */ `
			uniform vec3 color;
			varying float vAlpha;
			void main() {
				float d = length(gl_PointCoord - 0.5) * 2.0;
				// A bright core with a soft halo.
				float a = (smoothstep(1.0, 0.0, d) * 0.55 + smoothstep(0.45, 0.1, d) * 0.45) * vAlpha;
				if (a < 0.01) discard;
				gl_FragColor = vec4(color, a);
				#include <colorspace_fragment>
			}
		`,
		transparent: true,
		depthWrite: false,
		blending: additive ? AdditiveBlending : NormalBlending
	});
	const points = new Points(geometry, material);
	points.frustumCulled = false;
	points.raycast = () => {};
	return {
		points,
		tick(time, opacity) {
			material.uniforms.time.value = time;
			material.uniforms.opacity.value = opacity;
			material.uniforms.pixelRatio.value = pixelRatio();
			points.visible = opacity > 0.01;
		},
		dispose() {
			geometry.dispose();
			material.dispose();
		}
	};
}
