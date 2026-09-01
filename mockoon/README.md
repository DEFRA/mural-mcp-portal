# Mural MCP mock server

`mural-mcp.json` is a [Mockoon](https://mockoon.com) environment that stands in for a real
`mural-mcp` instance during local development, replacing the old in-process `MURAL_MCP_MOCK`
simulation. It implements every endpoint `src/infra/mural/{approvals,linking,tokens}.js` calls,
using Mockoon's [data buckets](https://mockoon.com/docs/latest/data-buckets/overview/) to keep
state (created/decided board requests, minted/revoked tokens, linked users) for the life of the
running mock.

The portal never knows the difference: it always makes real HTTP calls via `MuralClient`. "Mock
mode" is now purely a `MURAL_MCP_URL` choice, wired up in `compose.yaml` (service
`mural-mcp-mock`, image `mockoon/cli`) rather than anything in the portal's own code.

## Running it standalone

```bash
docker run --rm -p 8085:8085 -v "$(pwd)/mockoon:/data:ro" mockoon/cli:latest start --data /data/mural-mcp.json --port 8085
curl http://localhost:8085/admin/access-requests -H 'X-User-Id: dev@example.com'
```

Or via `docker compose up mural-mcp-mock -d` from the repo root, which does the same thing and
matches what `npm run start:dev` (run outside Docker, against `.env`'s
`MURAL_MCP_URL=http://localhost:8085`) expects to find.

## Editing

The file is a plain JSON export in Mockoon's environment schema - open it in the
[Mockoon desktop app](https://mockoon.com/download/) ("Open environment") to edit visually, or
hand-edit the JSON directly. Validate a hand-edit before committing:

```bash
npx @mockoon/cli@9 validate --data mockoon/mural-mcp.json
```

## Design notes, for whoever edits this next

- **Seed data.** The `approvals` data bucket is seeded with the same five board requests the old
  `mock-approvals-store.js` seeded, owned by `dev@example.com` (kept in step with `mockUser.email`
  in `src/pages/login/mock-user.js`) and `someone.else@defra.gov.uk`, spanning
  `pending`/`approved`/`rejected`. `tokens` and `linking` start empty, same reasoning as before: a
  token list or a connection should only ever show what *this* run created.
- **Templating gotchas that shaped these routes** (Mockoon 9.8, may differ in future versions):
  - `data`/`dataRaw` are not interchangeable. `data` renders a value as text (safe to print
    directly with `{{...}}` or `{{{...}}}`); `dataRaw` returns the real value, and is the one to
    use inside `#each`, `#if`, `eq`, `find`, etc. Using `data` where `dataRaw` belongs renders
    empty strings that are still truthy - a `{{#if (data ...)}}` check is always true.
  - A bucket top-level key that itself contains dots (an email, a Mural board ID like
    `workspace1.board1`) works fine as a *bare* key (`setData 'set' 'bucket' theDottedKey value`),
    but breaks as soon as it is used with a **path** argument alongside a `.field` suffix (
    `concat theDottedKey '.field'`) - the dot in the key gets parsed as a nesting separator. That
    is why `approvals`/`tokens` are keyed by a generated `{{uuid}}` (never dotted) rather than by
    the board ID or user email directly, and why board-ID and linked-user lookups go through a
    plain array (`boardIds`, `linking`) scanned with the `find` helper instead of an object keyed
    by the dotted value.
  - `includes` is a *string* helper ("does string A appear in string B"), not `Array.includes`. Use
    `find` for array membership - `{{#if (find (dataRaw 'bucket') needle)}}`.
  - `setVar` is scoped to the block it is set in: a value set inside `{{#each}}` is visible to
    later iterations of that *same* loop, but is gone the moment the loop closes. It does persist
    across a plain `{{#if}}`/`{{else}}`. Route bodies here that need a "was anything found"
    condition after a scan use the `{{status CODE}}` override pattern instead (set a default status
    before the loop, override it inside the matching branch) rather than a post-loop `getVar`.
  - `{{{stringify this}}}` (triple-stash, not double) turns an object/array into real JSON - handy
    for rendering a bucket record without hand-listing every field. Double-stash HTML-escapes the
    quotes.
  - A helper call immediately followed by a literal `}` (e.g. `{{/if}}}` closing both an `#if` and
    a JSON object) can be misparsed as part of a triple-mustache close. Where that collision shows
    up, a route body here adds a harmless space before the literal brace.
  - `faker 'date.soon'`/`'date.recent'` return `Date` objects, not strings, that will string
    only when Handlebars renders them into text. Stored as a data-bucket field value directly
    (via `object`), they get double-JSON-encoded on read; force a string first with
    `(concat (faker 'date.soon' days=30) '')`. The plain `now` helper does not have this problem -
    it already returns a string.
- **Known simplifications** (all deliberate, in line with this being a manual-QA aid, not a
  faithful `mural-mcp` re-implementation - the request/response *contract* itself is exercised by
  the nock-based unit tests in `tests/unit/infra/mural/`, not by this mock):
  - `GET /admin/access-requests` always returns every request regardless of status, ignoring any
    query string. Upstream only ever returns pending requests and takes no filters at all; this
    mock is deliberately more permissive so the boards directory has something to show for every
    status.
  - Timestamps generated by this mock (`createdAt`, `expires_at`, ...) are valid, parseable date
    strings but not strictly ISO 8601 (`now` renders with a numeric UTC offset rather than `Z`).
  - Token secrets/prefixes are realistic-looking (`mmcp_` + random alphanumeric) but the prefix is
    generated independently of the full secret, not literally its first 13 characters.
