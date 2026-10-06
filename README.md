# Trade Layout Calculator

A simple phone calculator for equal clear gaps and running tape marks. All measurements use millimetres. It starts blank, includes optional material width, and shows the marks on a continuous strip you can swipe left and right.

## Publish free with GitHub Pages

1. Open this repository's **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Choose branch **main** and folder **/docs**.
4. Click **Save** and wait for GitHub to publish the site.

The site address after deployment is:

https://thomas-beer-carpentry.github.io/Trad-calculator/

The `docs/` folder already contains the complete static website. No paid hosting or database is needed. GitHub controls the Pages setting; uploading these files does not automatically enable it.

## Install on Android

Open the published site in Chrome. Wait for **Ready to use offline**, then use the three-dot menu → **Add to Home screen** → **Install**. The icon opens the calculator full screen where supported. The website is an installable app, not a native Android home-screen widget.

## Marking conventions

- **Cross Away:** the material goes after the pencil mark in the direction you are measuring. Marks are to the near edge.
- **Cross Before:** the material goes before the pencil mark. Marks are to the far edge.
- **One more space:** equal gaps before, between, and after the boards.
- **Same number:** the final board finishes at the overall end; with no material, the final mark is at the end.

For 2000 mm, 3 boards, width 50 mm, and One more space, the gap is 462.5 mm. Cross Away gives 462.5, 975, 1487.5 mm. Cross Before gives 512.5, 1025, 1537.5 mm.

Each cumulative mark is calculated from exact fractions. The approximation sign identifies displayed rounding; rounded values are never added together to obtain the next mark.

## Edit and verify

Source files are in `dist/`. The build regenerates the browser script, a standalone HTML copy, and the website files in `docs/`.

```sh
npm run build
npm test
npm run check
```

No npm packages need to be installed. Use Node.js 20 or later. Commit the updated `dist/` and `docs/` files together after a change. Bump the service-worker cache version in `dist/sw.js` when changing cached assets. Cache names are isolated by website scope so other GitHub Pages apps retain their offline files.

Calculation and UI-event checks are provided in `tests/`. Real Android installation, swipe motion, and offline reload still need checking on a phone after publication.
