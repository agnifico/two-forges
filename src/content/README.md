# Content

Everything the site says lives here. It's read at build time (`src/lib/server/content.ts`); a mistake
(an unknown station, a missing title) stops the build with the file's name.

- `site.md`: the name, author, home-page description, the live URL once there is one, and the hero
  text (the body).
- `interests.yaml`: the "Interests and hobbies" bubbles, in order, each linked to its stations.
- `stations/<side>/<station>.md`: one file per station. The file name is the URL:
  `stations/forge/drafting-desk.md` is `/forge/drafting-desk` (station `draftingDesk`).
- `secrets/<side>/<name>.md`: short notes hidden in decor pieces. They have no page of their own.

Images go in `static/content/...` and are referenced from the site root (`/content/furnace/01.jpg`).

## Station frontmatter

```yaml
title: The Furnace              # required
label: Making things            # short line under the side name
intro: One or two lines.        # larger text under the title
description: …                  # search engines and link previews; defaults to intro
gallery:                        # the first image is wide, the rest in pairs
  - { src: /content/furnace/01.jpg, alt: What it shows, caption: Optional }
entries:                        # a list of works or write-ups
  - { title: Propsize, date: '2025', url: https://…, summary: One line }
stack:                          # skills and tools as coloured tags, in groups; known names
  - group: Design Tools         # get their brand colour and logo (src/lib/server/tags.ts)
    tags: [Figma, Framer]
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
