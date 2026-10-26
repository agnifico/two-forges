// Reads the site's content from src/content at build time (and in the dev server): Markdown with
// YAML frontmatter, parsed here so neither parser ever ships to the browser. Mistakes (an unknown
// station, a station on the wrong side, a missing title) fail the build with the file's name.

import { marked } from 'marked';
import { parse as parseYaml } from 'yaml';
import { slots, type StationId } from '../scene/config';
import { sides, type SideId } from '../scene/sides';
import { skillsTabs, type Carousel, type Entry, type GalleryImage, type Interest, type Link, type Reel, type Secret, type Site, type Skills, type SkillsTab, type StationContent, type StationSummary, type TagGroup } from '../content/types';
import { slugStation } from '../content/urls';
import { tag } from './tags';

const raw = (files: Record<string, unknown>) => files as Record<string, string>;
const siteFile = raw(import.meta.glob('/src/content/site.md', { query: '?raw', import: 'default', eager: true }));
const interestsFile = raw(
	import.meta.glob('/src/content/interests.yaml', { query: '?raw', import: 'default', eager: true })
);
const stationFiles = raw(
	import.meta.glob('/src/content/stations/*/*.md', { query: '?raw', import: 'default', eager: true })
);
const skillsFile = raw(import.meta.glob('/src/content/skills.yaml', { query: '?raw', import: 'default', eager: true }));
const secretFiles = raw(import.meta.glob('/src/content/secrets/*/*.md', { query: '?raw', import: 'default', eager: true }));

const stationIds = new Set<string>(slots.map((s) => s.id));

function fail(file: string, message: string): never {
	throw new Error(`${file}: ${message}`);
}

/** Splits `---` frontmatter from the Markdown body. */
function split(file: string, text: string): { data: Record<string, unknown>; body: string } {
	const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
	if (!match) return { data: {}, body: text };
	const data = parseYaml(match[1]) ?? {};
	if (typeof data !== 'object' || Array.isArray(data)) fail(file, 'frontmatter must be key: value pairs');
	return { data, body: match[2] };
}

// `==text==` highlights, like a marker pen (for a name, or a phrase that matters).
marked.use({
	extensions: [
		{
			name: 'highlight',
			level: 'inline',
			start: (src: string) => src.indexOf('=='),
			tokenizer(src: string) {
				const match = /^==(?=\S)([\s\S]*?\S)==/.exec(src);
				if (match) return { type: 'highlight', raw: match[0], tokens: this.lexer.inlineTokens(match[1]) };
			},
			renderer(token) {
				return `<mark>${this.parser.parseInline(token.tokens ?? [])}</mark>`;
			}
		}
	]
});

const outLinks = (html: string) => html.replace(/<a href="(https?:[^"]*)"/g, '<a href="$1" target="_blank" rel="noopener"');

/** Markdown to HTML: lazy images, external links in a new tab. Site paths stay root-relative (`/war/keep`). */
function render(markdown: string): string {
	return outLinks(marked.parse(markdown, { async: false, breaks: true }).replace(/<img /g, '<img loading="lazy" '));
}

/** One line of Markdown (bold, italics, ==highlights==, links) to HTML, without a paragraph around it. */
const renderInline = (markdown: string) => outLinks(marked.parseInline(markdown, { async: false, breaks: true }));

/** Inline Markdown as plain text, for meta descriptions. */
const plain = (markdown: string) =>
	renderInline(markdown)
		.replace(/<[^>]+>/g, '')
		.replace(/&#39;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&');

const text = (file: string, data: Record<string, unknown>, key: string, required = false): string => {
	const value = data[key];
	if (value === undefined || value === null || value === '') {
		if (required) fail(file, `"${key}" is required`);
		return '';
	}
	if (typeof value !== 'string' && typeof value !== 'number') fail(file, `"${key}" must be text`);
	return String(value);
};

const list = <T>(file: string, data: Record<string, unknown>, key: string, check: (item: Record<string, unknown>) => T): T[] => {
	const value = data[key];
	if (value === undefined || value === null) return [];
	if (!Array.isArray(value)) fail(file, `"${key}" must be a list`);
	return value.map((item, i) => {
		if (typeof item !== 'object' || item === null) fail(file, `"${key}" item ${i + 1} must be key: value pairs`);
		return check(item as Record<string, unknown>);
	});
};

const links = (file: string, data: Record<string, unknown>): Link[] =>
	list(file, data, 'links', (l) => ({ label: text(file, l, 'label', true), url: text(file, l, 'url', true) }));

const image = (file: string) => (g: Record<string, unknown>): GalleryImage => ({
	src: text(file, g, 'src', true),
	alt: text(file, g, 'alt'),
	caption: text(file, g, 'caption') || undefined,
	url: text(file, g, 'url') || undefined
});

/** `/src/content/stations/forge/drafting-desk.md` → side and slug. */
const parsePath = (path: string) => {
	const [, side, slug] = /\/([^/]+)\/([^/]+)\.md$/.exec(path)!;
	return { side, slug };
};

function checkSide(file: string, side: string): SideId {
	if (!(side in sides)) fail(file, `"${side}" is not a side (use ${Object.keys(sides).join(' or ')})`);
	return side as SideId;
}

function skillsTab(file: string, data: Record<string, unknown>): SkillsTab | undefined {
	const tab = text(file, data, 'skills');
	if (!tab) return undefined;
	if (!(skillsTabs as readonly string[]).includes(tab)) fail(file, `"skills" must name a tab (${skillsTabs.join(', ')})`);
	return tab as SkillsTab;
}

function readSkills(): Skills {
	const file = 'src/content/skills.yaml';
	const data = parseYaml(Object.values(skillsFile)[0] ?? fail(file, 'missing')) ?? {};
	if (typeof data !== 'object' || Array.isArray(data)) fail(file, 'must be key: value pairs');
	return {
		glance: list(file, data, 'glance', (g) => ({ title: text(file, g, 'title', true), scope: text(file, g, 'scope') })),
		stack: list(file, data, 'stack', (g): TagGroup => {
			if (!Array.isArray(g.tags)) fail(file, '"stack" groups need a "tags" list');
			return { title: text(file, g, 'group', true), tags: g.tags.map((t) => tag(String(t))) };
		}),
		misc: list(file, data, 'misc', (m) => ({ title: text(file, m, 'title', true), note: text(file, m, 'note') }))
	};
}

function readStation(path: string): StationContent {
	const file = path.slice(1);
	const { side: folder, slug } = parsePath(path);
	const side = checkSide(file, folder);
	const station = slugStation(slug);
	if (!stationIds.has(station)) fail(file, `no station is called "${station}" (see slots in config.ts)`);
	if (!sides[side].stations.includes(station as StationId)) fail(file, `${station} is not on the ${side} side`);
	const { data, body } = split(file, stationFiles[path]);
	const intro = text(file, data, 'intro');
	return {
		station: station as StationId,
		side,
		slug,
		title: text(file, data, 'title', true),
		introHtml: renderInline(intro),
		description: text(file, data, 'description') || plain(intro),
		html: render(body),
		carousels: list(file, data, 'carousels', (c): Carousel => ({
			title: text(file, c, 'title', true),
			summary: text(file, c, 'summary') || undefined,
			url: text(file, c, 'url') || undefined,
			images: list(file, c, 'images', image(file))
		})),
		reels: list(file, data, 'reels', (r): Reel => ({
			title: text(file, r, 'title', true),
			summary: text(file, r, 'summary') || undefined,
			page: text(file, r, 'page', true),
			preview: text(file, r, 'preview') || undefined,
			poster: text(file, r, 'poster', true),
			alt: text(file, r, 'alt')
		})),
		gallery: list(file, data, 'gallery', image(file)),
		entries: list(file, data, 'entries', (e): Entry => ({
			title: text(file, e, 'title', true),
			date: text(file, e, 'date') || undefined,
			url: text(file, e, 'url') || undefined,
			summary: text(file, e, 'summary') || undefined,
			image: text(file, e, 'image') || undefined
		})),
		skills: skillsTab(file, data),
		links: links(file, data)
	};
}

let cache: { site: Site; interests: Interest[]; stations: StationContent[]; secrets: Secret[]; skills: Skills } | undefined;

/** Everything in src/content, parsed and checked once per build. */
function load() {
	if (cache && !import.meta.env.DEV) return cache;

	const siteText = Object.values(siteFile)[0] ?? fail('src/content/site.md', 'missing');
	const { data: siteData, body: hero } = split('src/content/site.md', siteText);
	// The hero's first line is its lead; the lines after it are the second part.
	const [lead = '', ...rest] = hero.trim().split(/\r?\n/);
	const site: Site = {
		name: text('src/content/site.md', siteData, 'name', true),
		author: text('src/content/site.md', siteData, 'author'),
		description: text('src/content/site.md', siteData, 'description'),
		url: text('src/content/site.md', siteData, 'url').replace(/\/$/, ''),
		heroLead: renderInline(lead.trim()),
		// A space after each break, so the lines still read apart where a layout hides the breaks.
		heroRest: renderInline(rest.join('\n').trim()).replace(/<br>/g, '<br> '),
		invite: renderInline(text('src/content/site.md', siteData, 'invite')),
		inviteNote: renderInline(text('src/content/site.md', siteData, 'inviteNote'))
	};

	const stations = Object.keys(stationFiles).map(readStation);
	const seen = new Set<StationId>();
	for (const s of stations) {
		if (seen.has(s.station)) fail(`src/content/stations/${s.side}/${s.slug}.md`, 'this station has two files');
		seen.add(s.station);
	}

	const interestsText = Object.values(interestsFile)[0] ?? '[]';
	const interestsData = parseYaml(interestsText) ?? [];
	if (!Array.isArray(interestsData)) fail('src/content/interests.yaml', 'must be a list');
	const interests = interestsData.map((item: Record<string, unknown>, i: number): Interest => {
		const where = `src/content/interests.yaml (item ${i + 1})`;
		const ids = item.stations;
		if (!Array.isArray(ids) || ids.length === 0) fail(where, '"stations" must list at least one station');
		for (const id of ids) if (!seen.has(id)) fail(where, `"${id}" has no file in src/content/stations`);
		return {
			id: text(where, item, 'id', true),
			label: text(where, item, 'label', true),
			stations: ids as StationId[],
			blurb: text(where, item, 'blurb') || undefined
		};
	});

	const secrets = Object.keys(secretFiles).map((path): Secret => {
		const file = path.slice(1);
		const { side: folder, slug } = parsePath(path);
		const { data, body } = split(file, secretFiles[path]);
		const near = data.near;
		if (near !== undefined && !(Array.isArray(near) && near.length === 2 && near.every((n) => typeof n === 'number'))) {
			fail(file, '"near" must be [x, z]');
		}
		return {
			id: `${folder}-${slug}`,
			side: checkSide(file, folder),
			decor: text(file, data, 'decor', true),
			near: near as Secret['near'],
			title: text(file, data, 'title', true),
			html: render(body),
			links: links(file, data)
		};
	});

	cache = { site, interests, stations, secrets, skills: readSkills() };
	return cache;
}

const summary = ({ station, side, slug, title }: StationContent): StationSummary => ({ station, side, slug, title });

/** What every page needs: the site, the interests, a summary of each station, and the secrets. */
export function loadShared() {
	const { site, interests, stations, secrets } = load();
	return { site, interests, stations: stations.map(summary), secrets };
}

export function loadStation(side: string, slug: string): StationContent | undefined {
	return load().stations.find((s) => s.side === side && s.slug === slug);
}

/** The skills panel, for the stations that show it and /simplified. */
export function loadSkills(): Skills {
	return load().skills;
}

export function stationEntries() {
	return load().stations.map(({ side, slug }) => ({ side, slug }));
}
