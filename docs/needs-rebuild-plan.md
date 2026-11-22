# Rebuild around user needs

The site is organised by what a student is trying to do. Each section is a life event. Inside a section, each need is met by one thing: a topic page (stored in `content_pages`), or an existing tool (shuttle, canteen, places, complaints and so on). Welfare and guide pages no longer exist as types; every page is a topic page in one section.

## Contracts (fixed, do not edit)

| File | What it fixes |
|---|---|
| `lib/db/schema/content/enums.ts` | `CONTENT_SECTIONS`: `start`, `campus`, `study`, `health`, `money`, `help`, `say` |
| `lib/db/schema/content/pages.ts` | `content_pages` has `section` (not null) and `user_need` (text, staff only); no `kind`; `slug` unique across the table |
| `lib/db/migrations/0023_*`, `0024_*` | The migration |
| `lib/content/sections.ts` | Each section's path, icon, label, intro, and the tool entries its hub lists. `topicPath(section, slug)` |
| `lib/content/types.ts` | `ContentPage._type` is `"topicPage"` and it has `section` |
| `lib/content/revalidate.ts` | One entity type, `topicPage` |

## Sections

| Key | Path | Label |
|---|---|---|
| start | `/start` | Starting at Tha Prachan |
| campus | `/campus` | Day to day |
| study | `/study` | Study and exams |
| health | `/health` | Health and support |
| money | `/money` | Money |
| help | `/help` | Get help |
| say | `/have-your-say` | Have your say |

A hub page lists its topic pages (by `order`) and its entries from `sections.ts` (by `order`) in one list, merged by order. A topic page lives at `/<section path>/<slug>`.

## Topic pages

Order numbers interleave with the tool entries in `sections.ts`. Needs refer to the needs list (numbers in brackets).

| Section | Order | Slug | Title (en) | Needs | Sources (current pages) |
|---|---|---|---|---|---|
| start | 10 | getting-to-campus | Getting to Tha Prachan | 1 | guide/getting-to-tha-prachan |
| start | 30 | get-online | Get online: Wi-Fi, email and free software | 4 | welfare/sanitary-products-and-facilities (software, Wi-Fi) |
| start | 40 | what-your-student-card-gets-you | What your student card gets you | 5 | free things across all pages, each linking to its topic page |
| start | 60 | dress-and-titles | What you can wear, and your title | 6 | welfare/student-rights-elections-dress-and-titles (dress and titles) |
| campus | 40 | book-a-space | Book a space for an activity | 13 | welfare/student-facilities (activity building, gymnasium booking, football pitch, Lan Pridi, common rooms) |
| campus | 50 | fitness-and-sport | Fitness centre and gymnasium | 14 | welfare/student-facilities |
| campus | 70 | cafes-and-shops | Cafés and shops on campus | 11 | welfare/student-facilities (bookshop, cafés and shops) |
| campus | 80 | discounts | Student discounts | 16 | welfare/discounts-and-exam-fees, guide/student-discounts (museums only where a deal is stated) |
| study | 10 | book-a-study-room | Book a study room | 17 | welfare/library-welfare, guide/tu-library (LINE steps) |
| study | 20 | libraries | Library opening hours and services | 18, 21 | guide/tu-library, welfare/library-welfare |
| study | 30 | tu-get | TU-GET: the English test | 22, 34 | guide/tu-get, welfare/discounts-and-exam-fees (fees) |
| study | 40 | printing-and-checking-your-work | Printing, plagiarism and AI checks | 15, 20 | welfare/sanitary-products-and-facilities (library), guide/tu-library, guide/student-discounts |
| study | 50 | borrow-from-the-library | Borrow a laptop, charger or calculator | 19 | welfare/library-welfare (equipment) |
| study | 60 | getting-to-rangsit | Getting to Rangsit | 23 | guide/tha-prachan-to-rangsit, welfare/shuttle-buses-and-travel (1-9E) |
| health | 10 | after-an-accident | After an accident | 27 | welfare/accident-insurance |
| health | 20 | talk-to-someone | Talk to someone about how you feel | 29, 30 | welfare/mental-health-services, guide/useful-online-services (wellbeing LINE accounts) |
| health | 30 | see-a-doctor | See a doctor on campus | 25 | welfare/healthcare-rights (Virtual Clinic) |
| health | 40 | medical-and-dental-costs | What the university pays for medical and dental care | 26 | welfare/healthcare-rights |
| health | 50 | claim-accident-insurance | Claim accident insurance | 28 | welfare/accident-insurance |
| health | 60 | sanitary-products-and-condoms | Free sanitary products and condoms | 31 | welfare/sanitary-products-and-facilities |
| health | 70 | disability-support | Support for disabled students | 32 | welfare/scholarships-and-disability-support |
| money | 10 | hardship-grants | Grants if you are in difficulty | 33 | welfare/scholarships-and-disability-support (grants) |
| say | 10 | who-represents-you | Who represents you, and how to vote | 40 | guide/about-tusu, guide/about-tusc, welfare/student-rights (elections) |
| say | 30 | rules-and-your-rights | University rules and your rights | 44 | guide/rules-and-documents |

The `help` section has no topic pages: its needs are met by existing tools.

### Cut
- guide/our-tpc (the faculty list is in the directory)
- guide/useful-online-services (each link moves to the page for its need)
- guide/rules-and-documents (becomes rules-and-your-rights; the shuttle timetable link moves to getting-to-rangsit or the shuttle page)
- Museum entries that state no discount
- TU-GET "Notes" folded into tu-get

### Gaps the student bodies must fill
No content exists for these, so nothing is invented:
- 29: urgent mental-health help during the day
- 33: how to apply for a hardship grant, deadlines and who to contact
- 32: a contact for disability support
- 7: a list of clubs
- 40: election dates
- 41: how to apply for club funding

## Writing rules for topic pages
- The title names the task or the thing, starting with the key word.
- The summary is the answer for the most common case, in one sentence.
- Body order: key facts, then what to do (steps), then the details (hours, costs, eligibility), then who to contact.
- Every fact comes from the sources above. Nothing is invented. Facts that appear on two pages are written once and linked from the other.
- Thai is written as Thai. No em dashes.
