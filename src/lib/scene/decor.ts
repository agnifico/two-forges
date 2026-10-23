import { Group, InstancedMesh, MathUtils, Matrix4, Mesh, Quaternion, Vector3, type Object3D } from 'three';
import {
	decorKinds,
	packs,
	personHeight,
	type DecorKind,
	type DecorPlacement,
	type Layout,
	type PackId
} from './config';
import type { Rng } from './rng';
import type { Island } from './terrain';

const UP = new Vector3(0, 1, 0);

/** Pack units to world units for a decor kind, before any per-copy scale. */
export const kindScale = (kind: DecorKind) => (personHeight / packs[kind.pack].personHeight) * kind.scale;

/** Every model file a decor kind is drawn from, following composite parts into the kinds they use. */
export function kindFiles(id: string): { pack: PackId; file: string }[] {
	const kind = decorKinds.find((k) => k.id === id);
	if (!kind) return [];
	if ('file' in kind) return [{ pack: kind.pack, file: kind.file }];
	return kind.parts.flatMap((part) =>
		'file' in part ? [{ pack: part.pack ?? kind.pack, file: part.file }] : kindFiles(part.kind)
	);
}

export type DecorLayer = ReturnType<typeof createDecorLayer>;

/** Whether a mesh belongs to a turning part (drawn per copy, not instanced). */
function turns(o: Object3D): boolean {
	for (let p: Object3D | null = o; p; p = p.parent) if (p.userData.spin) return true;
	return false;
}

/**
 * Decor drawn from `layout.decor`, one InstancedMesh per kind and mesh. Copies without a turn get a
 * seeded-random one, written back into `layout` so later rebuilds (and saves) keep it.
 *
 * @param models  Toon-converted model per kind id, at pack scale.
 */
export function createDecorLayer(
	layout: Layout,
	models: Map<string, Object3D>,
	groundHeight: Island['groundHeight'],
	rng: Rng
) {
	const group = new Group();
	group.name = 'decor';
	const kinds = new Map(decorKinds.map((k) => [k.id, k]));
	/**
	 * Per kind: its meshes, which layout.decor index each instance shows, and its turning parts
	 * (windmill sails): one copy per instance, each in a holder placed like that instance.
	 */
	const built = new Map<
		string,
		{ meshes: InstancedMesh[]; indices: number[]; spinners: { holder: Object3D; part: Object3D; local: Matrix4 }[][] }
	>();

	for (const placement of layout.decor) {
		if (!kinds.has(placement.kind)) console.warn(`Unknown decor kind "${placement.kind}" in layout.ts; skipped.`);
		placement.rotationDeg ??= rng.range(0, 360);
	}

	const heightAt = (p: DecorPlacement) => {
		const kind = kinds.get(p.kind);
		if (!kind) return null;
		const ground = kind.height ?? groundHeight(p.at[0], p.at[1]);
		return ground === null ? null : ground - (kind.sink ?? 0) + (p.lift ?? 0);
	};

	const matrixFor = (p: DecorPlacement) => {
		const y = heightAt(p);
		const kind = kinds.get(p.kind);
		if (y === null || !kind) return null;
		return new Matrix4().compose(
			new Vector3(p.at[0], y, p.at[1]),
			new Quaternion().setFromAxisAngle(UP, MathUtils.degToRad(p.rotationDeg ?? 0)),
			new Vector3().setScalar(kindScale(kind) * (p.scale ?? 1))
		);
	};

	/** (Re)creates the instanced meshes for one kind from the current layout. */
	const build = (kindId: string) => {
		const old = built.get(kindId);
		for (const mesh of old?.meshes ?? []) {
			mesh.removeFromParent();
			mesh.dispose();
		}
		for (const { holder } of old?.spinners.flat() ?? []) holder.removeFromParent();
		built.delete(kindId);
		const model = models.get(kindId);
		if (!model) return;

		const indices: number[] = [];
		const matrices: Matrix4[] = [];
		layout.decor.forEach((p, i) => {
			if (p.kind !== kindId) return;
			const m = matrixFor(p);
			if (!m) {
				console.warn(`Decor ${kindId} at [${p.at}] is off the island or in the pond; skipped.`);
				return;
			}
			indices.push(i);
			matrices.push(m);
		});
		const meshes: InstancedMesh[] = [];
		/** Instances `source` at every copy; `offset` places it relative to the copy (a topper). */
		const instance = (source: Object3D, offset: Matrix4) =>
			source.traverse((o) => {
				if (!(o instanceof Mesh) || turns(o)) return;
				const instanced = new InstancedMesh(o.geometry, o.material, matrices.length);
				instanced.name = `decor-${kindId}`;
				instanced.userData.local = new Matrix4().multiplyMatrices(offset, o.matrixWorld);
				matrices.forEach((m, i) => instanced.setMatrixAt(i, new Matrix4().multiplyMatrices(m, instanced.userData.local)));
				instanced.castShadow = true;
				instanced.receiveShadow = true;
				group.add(instanced);
				meshes.push(instanced);
			});
		// Turning parts: a copy per instance, in a holder placed as the part's holder sits in the model.
		const turning: Object3D[] = [];
		model.traverse((o) => o.userData.spin && turning.push(o));
		const spinners = matrices.map((m) =>
			turning.map((part) => {
				const local = part.parent!.matrixWorld.clone();
				const holder = new Group();
				holder.matrixAutoUpdate = false;
				holder.matrix.multiplyMatrices(m, local);
				const copy = part.clone();
				holder.add(copy);
				group.add(holder);
				return { holder, part: copy, local };
			})
		);
		if (matrices.length > 0) {
			instance(model, new Matrix4());
			const kind = kinds.get(kindId)!;
			const topper = kind.topper && kinds.get(kind.topper.kind);
			const topperModel = kind.topper && models.get(kind.topper.kind);
			if (kind.topper && topper && topperModel) {
				// In the copy's own (scaled) frame: up by `lift`, at the topper's scale.
				const ks = kindScale(kind);
				instance(
					topperModel,
					new Matrix4().compose(
						new Vector3(0, kind.topper.lift / ks, 0),
						new Quaternion(),
						new Vector3().setScalar(kindScale(topper) / ks)
					)
				);
			}
		}
		built.set(kindId, { meshes, indices, spinners });
	};

	const buildAll = () => {
		for (const id of new Set([...built.keys(), ...layout.decor.map((p) => p.kind)])) build(id);
	};
	buildAll();

	return {
		group,
		kinds,
		heightAt,
		build,
		buildAll,
		/** The layout.decor index an instance shows, or null. */
		pick(mesh: Object3D, instanceId: number): number | null {
			for (const { meshes, indices } of built.values()) {
				if (meshes.includes(mesh as InstancedMesh)) return indices[instanceId] ?? null;
			}
			return null;
		},
		/** Moves one copy's instance to match its layout entry, without rebuilding. */
		update(index: number) {
			const p = layout.decor[index];
			const entry = built.get(p.kind);
			const slot = entry?.indices.indexOf(index) ?? -1;
			const m = matrixFor(p);
			if (!entry || slot < 0 || !m) return;
			for (const mesh of entry.meshes) {
				mesh.setMatrixAt(slot, new Matrix4().multiplyMatrices(m, mesh.userData.local));
				mesh.instanceMatrix.needsUpdate = true;
				mesh.boundingSphere = null;
			}
			for (const { holder, local } of entry.spinners[slot]) holder.matrix.multiplyMatrices(m, local);
		},
		/** Turns the turning parts. */
		tick(time: number) {
			for (const { spinners } of built.values()) {
				for (const { part } of spinners.flat()) {
					const { axis, rpm } = part.userData.spin as { axis: 'x' | 'y' | 'z'; rpm: number };
					part.rotation[axis] = (time / 60_000) * rpm * Math.PI * 2;
				}
			}
		},
		dispose() {
			for (const { meshes } of built.values()) for (const mesh of meshes) mesh.dispose();
		}
	};
}
