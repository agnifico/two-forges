import {
	DataTexture,
	MeshToonMaterial,
	NearestFilter,
	RedFormat,
	type ColorRepresentation,
	type Material,
	type MeshStandardMaterial
} from 'three';
import { palette, toonSteps } from './config';

export type Materials = ReturnType<typeof createMaterials>;

/** Shared toon materials. Rock materials use vertex colours for per-face brightness jitter. */
export function createMaterials() {
	const gradientMap = new DataTexture(new Uint8Array(toonSteps), toonSteps.length, 1, RedFormat);
	gradientMap.minFilter = NearestFilter;
	gradientMap.magFilter = NearestFilter;
	gradientMap.generateMipmaps = false;
	gradientMap.needsUpdate = true;

	const toon = (color: ColorRepresentation, vertexColors = false) =>
		new MeshToonMaterial({ color, gradientMap, vertexColors });

	// One material per colour, for anything a side colours itself (tier tops, rock, stairs).
	const solids = new Map<string, MeshToonMaterial>();

	const materials = {
		water: toon(palette.water),
		pondBed: toon(palette.pondBed),
		slot: toon(palette.slot),
		caveRim: toon(palette.caveRim),
		caveMouth: palette.caveMouth.map((c) => toon(c)),
		lilyPad: toon(palette.lilyPad),
		shapes: {
			wood: toon(palette.shapes.wood),
			canvas: toon(palette.shapes.canvas),
			paper: toon(palette.shapes.paper),
			globe: toon(palette.shapes.globe),
			brass: toon(palette.shapes.brass)
		}
	};

	return {
		...materials,
		/** A shared toon material in one flat colour; `vertexColors` for rock with per-face jitter. */
		solid(color: string, vertexColors = false): MeshToonMaterial {
			const key = `${color}|${vertexColors}`;
			let m = solids.get(key);
			if (!m) {
				m = toon(color, vertexColors);
				solids.set(key, m);
			}
			return m;
		},
		/**
		 * Toon copy of an imported model's material, sharing the terrain's gradient ramp.
		 * The caller owns (and disposes) the result and its map. `crisp` is for Kenney colour maps
		 * (palette swatches); painted textures pass false.
		 */
		toonFrom(source: Material, crisp = true): MeshToonMaterial {
			const s = source as MeshStandardMaterial;
			// Some exports keep all their colour in the emissive map (base colour black): use it as the colour.
			const fromEmissive = !s.map && !!s.emissiveMap;
			const map = fromEmissive ? s.emissiveMap : s.map;
			// Swatches sample crisply, without mip blending.
			if (map && crisp) {
				map.minFilter = NearestFilter;
				map.magFilter = NearestFilter;
				map.generateMipmaps = false;
				map.needsUpdate = true;
			}
			return new MeshToonMaterial({
				name: s.name,
				color: fromEmissive ? s.emissive : s.color,
				map,
				gradientMap,
				vertexColors: s.vertexColors,
				transparent: s.transparent,
				opacity: s.opacity,
				alphaTest: s.alphaTest,
				side: s.side
			});
		},
		dispose() {
			const { shapes, caveMouth, ...rest } = materials;
			const all = [
				...solids.values(),
				...Object.values(shapes),
				...caveMouth,
				...Object.values(rest)
			];
			for (const m of all) m.dispose();
			gradientMap.dispose();
		}
	};
}
