# Screenshots

Full-size originals from each project, kept here to reuse anywhere: the site, case studies, social posts.
This folder is not part of the website. Nothing here is published.

When an image goes on the site, make a smaller copy in `static/content/<station>/` and use that
(about 1600px wide, JPEG at 80% quality):

    sips -Z 1600 -s format jpeg -s formatOptions 80 screenshots/propsize/scene-tree.png --out static/content/furnace/propsize-tree.jpg

- `arboreum/`: the notes app, desktop and mobile.
- `propsize/`: the 3D editor: scene, library, inspector, modeling mode, shapes menu.
- `firefighter-girl/`: the loading-screen shots from the overworld project (`overworld/static/loading`).
