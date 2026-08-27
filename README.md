# Twenty-Five Sites

Twenty-five self-contained website designs, each exploring one idea about what the
web could look like in 2030.

**[Browse them →](https://twenty-five-sites.vercel.app)**

Every site is hand-built: no framework, no build step, no bundler. Open any folder
and the whole thing is there in a few files. Open the page and view source, and
what you see is all of it.

## Why this exists

Most design inspiration is a screenshot. You can admire it, but you cannot read
it, run it, or take it apart to find out how the thing was done.

These are readable. If a layout is interesting, the CSS that produces it is one
click away and short enough to finish. If an interaction is interesting, the
JavaScript is in the same folder and has no dependencies to chase.

## The twenty-five

Each folder under `public/` is one complete site.

| | | |
|---|---|---|
| 01 Aurelia | 10 Verdant | 19 Hearth |
| 02 Grotesk | 11 Kowloon | 20 Gatsby |
| 03 Strata | 12 Fold | 21 Vapor |
| 04 Deepfield | 13 Oscillate | 22 Riot |
| 05 Ma | 14 Noir | 23 Stillness |
| 06 Descent | 15 Almanac | 24 Relic |
| 07 Chromatic | 16 Bauhaus | 25 Machina |
| 08 Meridian | 17 Reverie | |
| 09 Corpus | 18 Verse | |

## Running it

There is nothing to install to read the sites. Serve `public/` with anything:

```bash
npx serve public
```

The `tools/` directory holds the Playwright scripts used to capture screenshots
and check each site at several widths. They are optional and only needed if you
want to regenerate the shots.

```bash
npm install
node tools/snap.mjs
```

## Using any of it

MIT. Take a layout, a transition, a type scale, or a whole site. No attribution
is required, though it is always welcome.

If something here is broken or a design does not hold up at some width, an issue
is genuinely useful — several of these were fixed that way already.
