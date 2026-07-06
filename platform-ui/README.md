# Platform UI

A minimal developer portal: a static HTML form that calls the platform API's
`POST /services` endpoint to onboard a new service.

Served by the platform API itself at `/` (see `platform-api/src/app.py`), so
there's no separate build step or dev server — same origin, no CORS needed.

A production version would likely be Backstage, React/Next.js, or an internal
company portal instead of a static form.
