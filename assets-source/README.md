# Photo masters

Full-resolution originals. **Nothing here is served or shipped** — `public/` is
the served folder, and `assets-source` is listed in `.dockerignore`, so these
never enter the container image.

Keep them so a photo can be re-cropped or re-compressed later without asking the
client for the files again.

| Master                 | Serves as                            | Notes                                                  |
| ---------------------- | ------------------------------------ | ------------------------------------------------------ |
| `hero-therapist.png`   | `public/images/hero-therapist.jpg`   | 1023×1537 PNG, 2 MB → converted to 220 KB JPEG at q88. |
| `booking-calendar.jpg` | `public/images/booking-calendar.jpg` | 1000×645, already web-sized; copied across unchanged.  |

## Re-installing a master

```bash
npm run photo -- hero    assets-source/hero-therapist.png
npm run photo -- booking assets-source/booking-calendar.jpg
docker compose restart web
```

`npm run photo` copies the file to the filename the site expects and validates
it is a real image. Note it does **not** re-compress — the hero master is a 2 MB
PNG, so pushing it through unchanged would ship 2 MB to every visitor. Convert
to JPEG first (Squoosh, or ImageMagick: `magick in.png -quality 88 out.jpg`).
