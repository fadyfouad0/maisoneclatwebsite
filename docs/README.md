# Maison Eclat - website

A static site. No build step, no dependencies, nothing to install. Drop this folder into
a repository and GitHub serves it as it is.

## Putting it on GitHub Pages

1. Drag this whole `docs` folder onto the repository (Add file -> Upload files).
   It is under 100 files, so it goes in one drag.
2. Settings -> Pages -> Build and deployment -> Deploy from a branch,
   branch `main`, folder `/docs`. Save.
3. A minute later: https://<user>.github.io/<repo>/

Every link is relative, so this works from a sub-path as well as from a custom domain.
For a domain of your own, add a file called `CNAME` next to this one holding just the
domain, then point the domain's DNS at GitHub.

## What is here

| | |
|---|---|
| `index.html` | Home |
| `collection.html` | All pieces: search, filters, sorting |
| `chandeliers.html` ... `accessories.html` | One page per category |
| `piece.html` | **One product page, used by all 37 pieces** (`piece.html?p=desert-rose`) |
| `showroom.html` | Visit and contact |
| `catalog.json` | **Every piece, in one file** |
| `site.css` | The whole design |
| `site.js` | Menu, saved list, search, filters, sliders |
| `assets/` | Photographs |

## The catalogue, and connecting Sanity

There is one product-page design. `piece.html` reads the piece from the address and
fills itself from `catalog.json`, so a new piece is a new entry in that file and nothing
else. Each entry:

```json
{
  "slug": "desert-rose",
  "name": "Desert Rose",
  "cat": "Chandelier",
  "mat": "Glass, gilded metal",
  "price": "From EGP 148,000",
  "label": "new",
  "maker": "",
  "collection": "Glass",
  "blurb": "Glass petals, blown one by one...",
  "img": "assets/161d....webp",
  "imgs": ["assets/161d....webp", "assets/0867....jpg"],
  "href": "piece.html?p=desert-rose",
  "sizes": [{ "label": "90 cm", "detail": "90 x 70 cm drop - 9 lights", "price": "EGP 148,000" }],
  "finishes": [{ "name": "Gilded brass", "hex": "#B9975B" }],
  "specs": [{ "k": "Drop", "v": "70 cm - 2 m, set on site" }]
}
```

`label` is one of `new`, `show`, `order`, `last`, or `""` for no availability pill.
`sizes`, `finishes` and `specs` may be empty - the page then leaves those blocks out
rather than showing empty ones. Nothing is invented.

For Sanity, have your build write `catalog.json` from a GROQ query in this shape.
Nothing else changes. To fetch at runtime instead, point `loadCatalogue()` in `site.js`
at the Sanity API.

## Two layouts, not one squeezed

The phone design and the desktop design are different layouts. Both are in the page and
the stylesheet shows whichever the width was drawn for, switching at 820px. The showroom
page has no separate phone design, so it uses the desktop one, which reflows.

## Trade-offs made to fit one upload

GitHub's web uploader takes fewer than 100 files at a time, so this folder is 96:

- One `piece.html` rather than 37 separate pages. Same design; the address carries the
  piece. Moving to git later, the build can emit `pieces/<name>.html` again for tidier
  addresses - set `ONE_DRAG = False` in the generator.
- Each piece shows at most two photographs. Ten pieces had a third or fourth that are
  not in this folder.

## Known gaps

- Only Desert Rose and Spiral have real sizes, finishes, lead times and specifications.
  The others show photographs, material and an enquiry button.
- The 19 pieces from the supplier PDF read "On request" with no availability pill,
  because the PDF gives neither price nor stock.
- The street address, email and Instagram handle are still placeholders. Search for `[`.
- Fonts load from Google Fonts.
- Product grids are drawn by `site.js` from `catalog.json`, so a visitor with JavaScript
  off sees the pages but not the grids.
