# Images

The two files here are **generated placeholders**. Replace them with the real
photography — keep the same filenames and the site picks them up with no code
change.

| File                   | Used by                                                  | Recommended size             | Notes                                                                                                               |
| ---------------------- | -------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `hero-therapist.jpg`   | Hero portrait (`src/components/sections/hero.tsx`)       | ≥ 1400 × 1750 (4:5 portrait) | Subject sits on the right of the frame. The left third is faded into the cream background, so leave headroom there. |
| `booking-calendar.jpg` | Booking band (`src/components/sections/booking-cta.tsx`) | ≥ 1000 × 780 (landscape)     | Cropped with `object-cover`; keep the subject centred.                                                              |

## Before shipping

- Compress both (e.g. [Squoosh](https://squoosh.app)) — aim for under ~250 KB each.
  Next.js re-encodes to AVIF/WebP on the fly, but a smaller source still helps.
- If the hero crop sits wrong, adjust the `object-position` utility on the
  `<Image>` in `hero.tsx` (currently `lg:object-[38%_35%]`).
