# YouCam hackathon entry: context for Claude

## The hackathon
YouCam API Skin AI & eCommerce VTO Hackathon (Devpost, by Perfect Corp): https://youcam-api-skin-ai-ecommerce.devpost.com/
- **Deadline: Nov 2, 2026, 9:45 PM PKT.** The user has exams Oct 30 to Nov 6, so aim to submit by **Oct 24** at the latest.
- The user is registered on Devpost (miawab) and has 1,000 free API units (valid until mid-January 2027).
- Prizes: $2,500 / $1,000 / $500, **Rising Star $1,000 (students only, needs a school-issued email: opt in when submitting)**, Women in Tech $1,000.
- Two tracks: **Skin AI** (help people understand their skin and know what to do next, "right before a purchase, right after a bad breakout, or in front of a mirror deciding whether a product is working") and **eCommerce VTO** (try-on that combines beauty and fashion "as one").
- Must: integrate 1+ YouCam API into a working web or mobile prototype with clear consumer value. "Not surface-level wrappers." A first-time user must instantly get it.
- Judging: technical use of the YouCam API, design (a complete product, not a proof of concept), potential impact (a real problem for a real audience), quality of idea.
- Submit: repo URL (public with a license, OR private and shared with the sponsor's address shown on the Devpost page), a text description, screenshots, a 1-3 min video on YouTube that names the YouCam API used and shows it working, with no copyrighted music. Winners do an exit interview and a blog feature.

## The API
- Key in `.env` as `YOUCAM_API_KEY` (plus `YOUCAM_SECRET_KEY`, not needed for v2). Never print, log or commit it. `.env` is git-ignored. The key must stay server-side: call the API from a backend route, never from browser code.
- Base `https://yce-api-01.makeupar.com`, header `Authorization: Bearer $YOUCAM_API_KEY`.
- Free balance check: `GET /s2s/v1.0/client/credit`. Cost lookup: `GET /s2s/v2.0/credit/feature-cost`.
- Flow: `POST /s2s/v2.0/file/{ai-task}` (returns `file_id` + an upload URL; PUT the image there, or pass a public image URL instead) -> `POST /s2s/v2.0/task/{ai-task}` -> poll `GET /s2s/v2.0/task/{ai-task}/{task_id}` until `success`/`error`. Results are kept 24 h. Template-based features (clothes, looks) need the `template` endpoint first.
- Skin analysis costs 9-12 units, so budget roughly 80-100 real calls. Cache results and use saved responses for development and tests.
- Docs: https://docs.perfectcorp.com/develop/introduction (quick start, API reference, rate limits, error codes).
- Ready-made Claude skills: `npx skills add YouCam-API/skills` (skin analysis, facial consultant, beauty advisor, hair, clothes try-on). They need Python with `requests` and `PyYAML`.

## Ideas on the table (the user picks; check "can we get the data today?")
1. **Shade check before COD:** selfie -> skin tone -> try the exact shades from a Daraz/Instagram listing -> "this one, not that one", before ordering cash-on-delivery.
2. **Is it working?:** weekly skin scans -> a chart over time -> keep, change or stop the product.
3. **Outfit + look:** a clothing product photo -> clothes try-on plus a matching makeup look (fits the VTO track's "both as one").

## How the user works
- Ibrahim (miawab), a university student in Pakistan (PKT). Builds web apps by vibe-coding. Explain what each piece is for before building it. Short answers in chat.
- Everything must be free. Ask before anything that costs money.
- Real problems from real friends with data that exists today. No invented personas, keep people's quotes word for word.
- Videos: a storyboard, voiceover, big text, big zoomed focus, empty space, no clutter, no interpuncts or em dashes on screen. Never a plain screen recording.
- Devpost winners average ~13 gallery images, ~1,200 words, a live link and tests.
- Git: commits use `179867549+miawab@users.noreply.github.com` (already set in this repo). Repo `github.com/miawab/youcam` is **public with an MIT license**, so never commit secrets.
- Research notes for this entry go in `../hackathon/devpost/me/projects/youcam/`. Log the entry in `../hackathon/devpost/me/record.json`.
