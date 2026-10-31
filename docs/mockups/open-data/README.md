# Open data mock-ups

Static mock-ups for the student body open data section, following `docs/tusc-open-data-plan.md`. Content comes from the real transcriptions in `data/open-data/tusc/`. Open any page directly in a browser; nothing is built or served.

## Shared files

| File | Purpose |
|---|---|
| `od.css` | Tokens (copied from `styles/tokens.css`), base type, layout and every component class |
| `od.js` | The only script: language and theme switch, and it carries the choice onto links between mock-ups |
| `data/budget-fy2569-by-organisation.csv` | The CSV behind Figure 1 (UTF-8 with byte order mark) |

## Pages

| File | URL it represents | Notes |
|---|---|---|
| `index.html` | `/about/open-data` | Landing: TUSC and TUSU cards (TUSU: nothing published yet), licence, cite, report, contact |
| `tusc.html` | `/about/open-data/tusc` | Metadata, 3 key figures, main points, what is new, section navigation with a line each |
| `components.html` | not a real URL | Reference: every component class with a short example and one complete figure |

Links to pages that other builders write use these file names, one per section of the TUSC navigation: `people.html`, `committees.html`, `meetings.html`, `decisions.html`, `rules.html`, `budget.html`, `reports.html`, `funds.html`, `documents.html`, `data.html`. Links to the rest of the site (Home, About) are placeholders.

## How to view

- Thai is the default. Add `?lang=en` for English. Every visible string is a pair of `<span class="th" lang="th">` and `<span class="en" lang="en">`; `html[lang]` hides one of them.
- Add `?theme=dark` (or `?theme=light`) to force a theme. Without it the page follows the system setting.
- Combine them: `tusc.html?lang=en&theme=dark`. The toggles in the header do the same, and links between mock-ups keep the choice.
- Without JavaScript the page shows Thai in the system colour scheme; nothing else depends on the script.

## Building a new page

1. Copy the head of `tusc.html` (fonts, `od.css`) and end the body with `<script src="od.js"></script>`.
2. Keep the skip link, `header.site-header`, breadcrumbs, `main id="main"` and `footer.site-footer`. For TUSC pages wrap the nav and main in `.wrap.layout` with `.layout__nav` first (the same section navigation on every TUSC page; mark the current link `aria-current="page"`).
3. Add `<meta name="title-en" content="...">` so `od.js` can set the English title.
4. Tables: give every `td` a `data-label` (Thai) and `data-label-en` (English) so it stacks on a phone.
5. Copy the figure markup from `components.html`, section "Figure".

## Class names

- Chrome: `.skip-link .site-header .site-header__inner .site-header__brand .site-header__tools .toggle .breadcrumbs .site-footer .wrap .prose .vh .back-to-top`
- Layout: `.layout .layout__nav .layout__main`
- Section navigation: `.section-nav .section-nav__title .section-nav__list .section-nav__item .section-nav__link .section-nav--described .section-nav__desc`
- Heading: `.page-head .page-head__label .page-head__summary`
- Meta (description list): `.meta .meta__item .meta__term .meta__value`
- Key figures: `.key-figures .key-figures__item .key-figures__label .key-figures__figure .key-figures__context`
- Main points: `.main-points`
- Figure: `.figure .figure__number .figure__title .figure__subtitle .figure__chart .figure__source`
- Bar chart (SVG): `.bar-chart .bar-chart__grid .bar-chart__zero .bar-chart__tick .bar-chart__label .bar-chart__bar .bar-chart__bar--highlight .bar-chart__value .bar-chart__axis-title`
- Details and downloads: `.details .details__body .download-list`
- Table: `.table .table__caption .table__num .table-note`
- Status tag: `.status .status--success .status--info .status--warning .status--error .status--neutral`
- Pagination: `.pagination .pagination__position .pagination__items .pagination__item .pagination__link .pagination__gap`
- Text blocks: `.inset .warning .warning__icon .notice .notice__title .notice__icon`
- Document list: `.doc-list .doc-list__item .doc-list__title .doc-list__meta .doc-list__desc`
- Table of contents: `.toc .toc__title .toc__list`
- Related: `.related .related__title .related__list .related__desc`
- Cite: `.cite .cite__title .cite__text`
- Cards: `.cards .card .card__title .card__link`

## All pages

| File | Represents |
|---|---|
| `index.html` | `/about/open-data` |
| `tusc.html` | `/about/open-data/tusc` |
| `people.html` | `/about/open-data/tusc/people` |
| `committees.html`, `committee-canteen.html` | `/about/open-data/tusc/committees` and one committee |
| `meetings.html`, `meeting-ordinary-2-1.html` | `/about/open-data/tusc/meetings` and ordinary session 2 meeting 1 with full minutes |
| `decisions.html` | `/about/open-data/tusc/decisions` (38 resolutions, page 1 of 2) |
| `rules.html`, `rule-operation-2569.html` | `/about/open-data/tusc/rules` and the operation regulation 2569, full Thai and English text |
| `budget.html`, `budget-2569.html` | `/about/open-data/tusc/budget` and the FY 2569 bulletin |
| `reports.html`, `report-canteen.html` | `/about/open-data/tusc/reports` and the canteen report in full |
| `funds.html` | `/about/open-data/tusc/funds` (page 1 of 11) |
| `documents.html`, `doc-NN.html`, `document-traffic-2555.html` | `/about/open-data/tusc/documents` and a page for every source document with its full text as printed (`doc-NN.html` is generated from `data/open-data/tusc/transcripts/NN.md`) |
| `data.html` | `/about/open-data/tusc/data` with the budget data dictionary |
| `components.html` | Component reference |

`data/` holds the CSV behind every figure and table download. Every page passes axe (WCAG 2.2 AA tags) with no horizontal scroll at 360px in all four combinations.

## Not mocked up

- One page per item for the other meetings, committees and rules: links go to the index row or to the document page instead.
- `/about`, `/eat`, getting around and the welfare pages: placeholder links.
- Latin spellings of most names: no source gives them, so they show "[Latin spelling not stated]".
- Long Thai bodies (minutes, the canteen report) are not translated; English mode shows English headings, summaries and a notice that the text is the council's Thai.
- Page-specific classes still live in each page's `<style>` block; they move into the component library when built.
