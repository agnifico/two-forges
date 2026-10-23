// Shapes shared by the dev catalog endpoint (vite-plugin.ts) and its panel (Catalog.svelte).

/** One model in the catalog. `key` is `<pack folder>/<model name>`. */
export interface CatalogModel {
	key: string;
	folder: string;
	name: string;
	/** Preview image path inside the pack folder, if one exists. */
	preview: string | null;
	category?: string;
	description?: string;
	tags?: string[];
	/** Width, height, depth in world units at the pack's scale, where the index knows it. */
	worldSize?: [number, number, number];
	triangles?: number;
}

export interface CatalogPack {
	folder: string;
	name: string;
	count: number;
}

/** Picked models, keyed by CatalogModel.key, with an optional note each. */
export type Picks = Record<string, { note?: string }>;
