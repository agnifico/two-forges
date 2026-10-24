// Shapes of the site's content (src/content). Parsed at build time by #lib/server/content; the
// browser only ever sees these plain objects.

import type { StationId } from '../scene/config';
import type { SideId } from '../scene/sides';

export interface Link {
	label: string;
	url: string;
}

export interface GalleryImage {
	src: string;
	alt: string;
	caption?: string;
}

export interface Entry {
	title: string;
	date?: string;
	url?: string;
	summary?: string;
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
	/** A line under the hero asking visitors to explore (may be empty), as HTML. */
	invite: string;
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
	/** A short line naming what the station is about. */
	label: string;
}

/** A station's full content, loaded when its page opens. */
export interface StationContent extends StationSummary {
	/** The intro line, as inline HTML (it may hold bold or ==highlighted== words). */
	introHtml: string;
	description: string;
	html: string;
	gallery: GalleryImage[];
	entries: Entry[];
	/** Shows the skills panel, opened on this tab. */
	skills?: SkillsTab;
	links: Link[];
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
