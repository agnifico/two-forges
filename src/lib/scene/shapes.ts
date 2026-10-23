import {
	BoxGeometry,
	CylinderGeometry,
	Group,
	Mesh,
	SphereGeometry,
	TorusGeometry,
	type BufferGeometry,
	type Material
} from 'three';
import type { ShapeId } from './config';
import type { Materials } from './materials';

/**
 * Chunky stand-ins for props no Kenney pack has. Sizes are world units (a person is 2.8 tall);
 * each stands on y = 0 with its front facing +z.
 */
export function buildShape(id: ShapeId, materials: Materials): Group {
	const m = materials.shapes;
	const group = new Group();
	group.name = `shape-${id}`;
	const add = (
		geometry: BufferGeometry,
		material: Material,
		[x, y, z]: [number, number, number],
		[rx, rz]: [number, number] = [0, 0]
	) => {
		const mesh = new Mesh(geometry, material);
		mesh.position.set(x, y, z);
		mesh.rotation.set(rx, 0, rz);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		group.add(mesh);
	};

	switch (id) {
		case 'easel':
			// A-frame: two front legs leaning in and back, one back leg, a ledge and a blank canvas.
			add(new BoxGeometry(0.12, 2.8, 0.12), m.wood, [-0.45, 1.35, 0.1], [-0.12, -0.16]);
			add(new BoxGeometry(0.12, 2.8, 0.12), m.wood, [0.45, 1.35, 0.1], [-0.12, 0.16]);
			add(new BoxGeometry(0.12, 2.6, 0.12), m.wood, [0, 1.25, -0.45], [0.35, 0]);
			add(new BoxGeometry(1.3, 0.1, 0.25), m.wood, [0, 0.95, 0.22], [-0.12, 0]);
			add(new BoxGeometry(1.4, 1.05, 0.06), m.canvas, [0, 1.55, 0.18], [-0.12, 0]);
			break;
		case 'draftingBoard':
			// Board tilted down towards the front on a back block, with a sheet pinned to it.
			add(new BoxGeometry(1.8, 0.7, 0.1), m.wood, [0, 0.35, -0.55]);
			add(new BoxGeometry(2, 0.06, 1.4), m.wood, [0, 0.45, 0], [0.5, 0]);
			add(new BoxGeometry(1.5, 0.02, 1), m.paper, [0, 0.485, 0.019], [0.5, 0]);
			break;
		case 'globe':
			add(new CylinderGeometry(0.3, 0.34, 0.1, 10), m.brass, [0, 0.05, 0]);
			add(new CylinderGeometry(0.05, 0.05, 0.5, 6), m.brass, [0, 0.35, 0]);
			add(new SphereGeometry(0.45, 12, 8), m.globe, [0, 0.95, 0]);
			add(new TorusGeometry(0.52, 0.03, 4, 20), m.brass, [0, 0.95, 0], [0, 0.4]);
			break;
		case 'mapSheet':
			add(new BoxGeometry(1.5, 0.03, 1), m.paper, [0, 0.015, 0]);
			break;
	}
	return group;
}
