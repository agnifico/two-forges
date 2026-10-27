// Shapes of the site's content (src/content). Parsed at build time by #lib/server/content; the
// browser only ever sees these plain objects.

import type { StationId } from '../scene/config';
import type { SideId } from '../scene/sides';

export interface Link {
	label: string;
	url: string;
	/** An SVG path on a 24×24 grid (named in the content, see server/link-icons.ts). */
	icon?: string;
}

export interface GalleryImage {
	src: string;
	alt: string;
	caption?: string;
	/** Where the image leads (the piece on Dribbble, say). */
	url?: string;
}

export interface Entry {
	title: string;
	date?: string;
	url?: string;
	summary?: string;
	/** A small thumbnail beside the title. */
	image?: string;
}

/** One project's images, one at a time, with its name (and a link) above. */
export interface Carousel {
	title: string;
	summary?: string;
	url?: string;
	images: GalleryImage[];
}

/** A skill or tool, as a coloured tag with the brand's logo where there is one. */
export interface Tag {
	label: string;
	/** Background and text colours. */
	color: string;
	text: string;
	/** The logo as an SVG path on a 24×24 grid. */
	icon?: string;
}

/** A group of tags under a heading (Languages, Design tools…). */
export interface TagGroup {
	title: string;
	tags: Tag[];
}

/** The skills panel's tabs, in order. */
export const skillsTabs = ['glance', 'stack', 'misc'] as const;
export type SkillsTab = (typeof skillsTabs)[number];

/** The skills panel (src/content/skills.yaml): what I do, my tech stack, and the rest of the toolbelt. */
export interface Skills {
	glance: { title: string; scope: string }[];
	stack: TagGroup[];
	misc: { title: string; note: string }[];
}

export interface Site {
	name: string;
	author: string;
	description: string;
	url: string;
	/** The hero's first line, as HTML. */
	heroLead: string;
	/** The hero's remaining lines (may be empty), as HTML with line breaks. */
	heroRest: string;
	/** The cottage's speech bubble asking visitors to explore (may be empty), as HTML. */
	invite: string;
	/** A smaller second line in that bubble (may be empty), as HTML. */
	inviteNote: string;
}

export interface Interest {
	id: string;
	label: string;
	stations: StationId[];
	blurb?: string;
}

/** What every page knows about a station: enough for bubbles, links and titles. */
export interface StationSummary {
	station: StationId;
	side: SideId;
	/** The station's URL segment (`drafting-desk`). */
	slug: string;
	title: string;
}

/** A piece that plays (an HTML reel): a short looping preview here, the whole page over the island on a tap. */
export interface Reel {
	title: string;
	summary?: string;
	/** The reel itself, a page under static/ (`/reels/theory-of-games.html`). Loaded only when opened. */
	page: string;
	/** A short, silent, looping clip (MP4), shown over the poster. */
	preview?: string;
	poster: string;
	alt: string;
}

/** A station's full content, loaded when its page opens. */
export interface StationContent extends StationSummary {
	/** The intro line, as inline HTML (it may hold bold or ==highlighted== words). */
	introHtml: string;
	description: string;
	html: string;
	carousels: Carousel[];
	reels: Reel[];
	gallery: GalleryImage[];
	entries: Entry[];
	/** Shows the skills panel, opened on this tab. */
	skills?: SkillsTab;
	links: Link[];
	/** Shown as icons only, after the links; the label is the tooltip. */
	socials: Link[];
}

/** A short note tied to one decor piece. Small enough to ship with every page. */
export interface Secret {
	id: string;
	side: SideId;
	/** The DecorKind id of the piece it hides in. */
	decor: string;
	/** For kinds with several copies: the copy nearest this point. */
	near?: [x: number, z: number];
	title: string;
	html: string;
	links: Link[];
}
