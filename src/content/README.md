# Content

Everything the site says lives here. It's read at build time (`src/lib/server/content.ts`); a mistake
(an unknown station, a missing title) stops the build with the file's name.

- `site.md`: the name, author, home-page description, the live URL once there is one, and the hero
  text (the body).
- `interests.yaml`: the "Interests and hobbies" bubbles, in order, each linked to its stations. A blurb is only
  needed when a bubble has several stations (it heads the card listing them).
- `stations/<side>/<station>.md`: one file per station. The file name is the URL:
  `stations/forge/drafting-desk.md` is `/forge/drafting-desk` (station `draftingDesk`).
- `skills.yaml`: the skills panel's three tabs (at a glance, tech stack, miscellaneous skills), shown on
  the cottage and on /simplified.
- `secrets/<side>/<name>.md`: short notes hidden in decor pieces. They have no page of their own.

Images go in `static/content/...` and are referenced from the site root (`/content/furnace/01.jpg`).

## Station frontmatter

Only `title` is required; everything else shows only when it's there. On the page, top to bottom: title,
intro, the Markdown body, then reels, carousels, gallery, entries, skills and links.

```yaml
title: The Furnace              # required
intro: One or two lines.        # larger text under the title
description: …                  # search engines and link previews; defaults to intro
carousels:                      # one per project: images one at a time, with arrows and dots
  - title: Dawn's Journey
    summary: One line             # optional
    url: https://…                # optional: the title links here
    images:                       # same fields as gallery images; shown at 3:2, cropped to fill
      - { src: /content/map-table/nuvatra.webp, alt: What it shows, caption: Optional }
reels:                          # an HTML reel: its preview loops beside the title; a tap opens the
                                # whole page full screen over the island (loaded only then)
  - title: The Theory of Games
    summary: One or two lines     # optional
    page: /reels/theory-of-games.html          # the reel itself, in static/reels/
    preview: /content/drafting-desk/theory-of-games.mp4   # optional: short, silent, 9:16
    poster: /content/drafting-desk/theory-of-games.webp
    alt: What the poster shows
gallery:                        # the first image is wide, the rest in pairs (an odd one out runs wide)
  - { src: /content/furnace/01.jpg, alt: What it shows, caption: Optional, url: Optional link }
entries:                        # a list of works or write-ups
  - { title: Propsize, date: '2025', url: https://…, summary: One line, image: /content/furnace/propsize.webp }
                                # image: an optional thumbnail beside the title
skills: stack                   # shows the skills panel (skills.yaml), open on this tab:
                                # glance, stack or misc
links:                          # buttons at the end; off-site links open in a new tab
  - { label: GitHub, url: https://github.com/… }
```

The body is Markdown.

## Secret frontmatter

```yaml
title: An old chest     # required
decor: chest            # required: the decor kind it hides in (decorKinds in config.ts)
near: [-17.4, -8.3]     # only if the kind has several copies: the one nearest this point
links:
  - { label: The other side of the island, url: /war/keep }
```
