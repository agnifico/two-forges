import { loadSkills, loadStation } from '#lib/server/content.ts';
import type { Carousel, GalleryImage } from '#lib/content/types.ts';
import type { PageServerLoad } from './$types';

const station = (slug: string) => {
	const s = loadStation('forge', slug);
	if (!s) throw new Error(`/simplified: no forge station "${slug}"`);
	return s;
};
const carousel = (slug: string, title: string): Carousel => {
	const c = station(slug).carousels.find((c) => c.title === title);
	if (!c) throw new Error(`/simplified: no "${title}" carousel in stations/forge/${slug}.md`);
	return c;
};
const gallery = (slug: string): GalleryImage[] => station(slug).gallery;

/**
 * The project cards a gallery tile opens: the island's own cards, so both read from the same
 * station files. Pieces that are galleries on the island (logos, blueprints, isometric) get a card
 * built from that gallery, with the tile's title and line.
 */
function cards(): Record<string, Carousel> {
	const chess = station('arcade').entries.find((e) => e.title === 'Chessboard Battlefield');
	return {
		arboreum: carousel('furnace', 'Arboreum'),
		propsize: carousel('furnace', 'Propsize'),
		cube: carousel('rubiks-cube', 'Solve the Cube'),
		ffg: carousel('map-table', 'Fire Fighter Girl'),
		dawns: carousel('map-table', "Dawn's Journey"),
		chessboard: {
			title: 'Chessboard Battlefield',
			summary: chess?.summary,
			url: chess?.url,
			images: chess?.image ? [{ src: chess.image, alt: 'Chessboard Battlefield' }] : []
		},
		logos: {
			title: 'Logos & Type',
			summary: 'Logo commissions, stickers, typographic studies.',
			url: 'https://dribbble.com/jxnesforge',
			images: gallery('drafting-desk')
		},
		blueprints: {
			title: 'Forge Blueprints',
			summary: 'Art-deco blade, shield, and spear technical drawings.',
			url: 'https://dribbble.com/shots/25752613-Forge-Blueprints',
			images: gallery('paint-vats')
		},
		isometric: {
			title: 'Isometric Series',
			summary: 'Four isometric cityscapes. On Dribbble.',
			url: 'https://dribbble.com/jxnesforge',
			images: gallery('easels')
		}
	};
}

// The skills panel's content, shared with the cottage on the island; and the project cards.
export const load: PageServerLoad = () => ({ skills: loadSkills(), cards: cards() });
