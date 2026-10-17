# Chairside

**The consultation before the chair.** A widget salons add to their booking page. Customers take four guided photos, YouCam AI reads their hair and skin, they try any of 40 looks on their own face, and Chairside lays out every service it takes to get there from their hair today: perm, rebonding, colour, months of growth, or "not possible". Recommendations come one at a time with the reason, invisible treatments show their benefits instead of a fake picture, and the customer sees themselves after everything before booking it all.

Built for the YouCam API Skin AI & eCommerce VTO Hackathon (Devpost, 2026).

## YouCam APIs used

| API | What it drives |
|---|---|
| AI Hair Type Detection (3 angles) | Curl pattern 1 to 4C: decides perm vs rebonding vs keratin |
| AI Hair Frizziness Detection (3 angles) | Anti-frizz or curl hydration recommendation |
| AI Hair Length Detection | Cut, extensions, or months of growth |
| AI Hair Density Detection (chin-down photo) | A soft hairline note, with a dermatologist referral instead of a sales push |
| AI Skin Analysis (SD: acne, texture, dark circles, radiance) | Which facial, if any (only below a score of 85) |
| AI Face Attributes Analyzer (face shape, gender) | "Picked for you" looks that suit the face; gender only picks which looks open first |
| AI Hairstyle Virtual Try-On v2.1 | The look on the customer's own face |
| AI Skin Simulation | The "after everything" picture: the new look plus treated skin |

Every reading in the UI is labelled **Measured by YouCam** or **Salon rule** (our rules of thumb, in `src/lib/route.ts`).

## Demo limits

Live calls are capped so a public demo can't drain the account: 2 live readings per visitor per day (IP plus a signed cookie), 6 per hour across all visitors, and 6 try-ons and 2 skin previews per session. Try-ons and skin previews need a signed session token issued by a real analysis. `CREDIT_FLOOR` is the hard stop.

## Run it

```bash
npm install
cp .env.example .env   # add your YouCam API key
npm run dev
```

- `LIVE_MODE=1` turns on real API calls. Without it, the app runs the sample customer from saved YouCam results (0 units).
- `CREDIT_FLOOR` (default 600): live calls stop when the account balance drops to this, so a public demo can't drain it.
- The API key is only used server-side (`src/lib/youcam.ts`).

## Embed on a salon site

```html
<script src="https://<your-chairside-host>/embed.js" data-salon="studio-nine" defer></script>
```

See `/salon` for a demo salon page using it.

## Credits

Sample customer photos: Pexels (7245674, 7245673), free to use. Hairstyle reference thumbnails come from the YouCam template catalogue.

## License

MIT
