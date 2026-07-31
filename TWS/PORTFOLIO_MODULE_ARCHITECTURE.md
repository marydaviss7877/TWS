# Internal Portfolio Module

## Scope

The portfolio is an authenticated, organization-internal knowledge and sales-enablement
workspace. It has no anonymous or public API. Tenant and organization isolation is
enforced on every query.

## Domain model

`PortfolioItem` is the aggregate root for a case study, project, showcase,
testimonial, or reusable resource. It contains:

- structured story fields: challenge, approach, solution, outcome;
- outcome metrics with label, value, and verification context;
- client metadata with an NDA/confidentiality flag;
- searchable services, technologies, and tags;
- ordered rich-content blocks;
- allow-listed Loom, YouTube, Vimeo, and Figma embeds;
- private S3 media assets and an optional cover asset;
- draft, internally published, and archived lifecycle states;
- internal audience scope (`sales` by default or `organization`) with optional visibility start/end times;
- featured ordering and complete creator/updater audit references.

## Access model

- `portfolio:read`: view the internal library and signed asset previews.
- `portfolio:write`: create, edit, upload, publish internally, archive, and delete.
- Owners inherit wildcard access.
- Admins, managers, and project managers receive read/write by default.
- Employees receive read access by default.
- Every API request is authenticated and filtered by `orgId`.
- Portfolio managers can manage every lifecycle state. Read-only members can only retrieve
  currently visible published entries for their audience.
- Sales/GTM membership is resolved from active tenant department access. Sales, Business
  Development, Revenue, Growth, and Account Management departments qualify.
- Legacy entries without an audience setting default securely to Sales/GTM visibility.
- NDA-protected entries cannot be widened to organization visibility.
- No anonymous route, public page, public object URL, or external share token exists.

## API

Base: `/api/tenant/:tenantSlug/organization/portfolio`

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Paginated internal search and filters |
| POST | `/` | Create an item |
| GET | `/:id` | Read an item with short-lived signed asset URLs |
| PATCH | `/:id` | Update structured content |
| POST | `/:id/duplicate` | Clone content into a new draft without copying private media |
| POST | `/:id/assets` | Upload one private media asset |
| DELETE | `/:id/assets/:assetId` | Remove an asset |
| POST | `/:id/status` | Draft, internally publish, or archive |
| DELETE | `/:id` | Soft-delete |

## Security and media

- S3 objects are private and UUID-named.
- MIME and file-extension pairs are allow-listed.
- Uploaded object signatures are read back from S3 and verified against the declared format.
- Limits: images 5 MB, documents 25 MB, video 100 MB.
- Uploads are rate-limited to five per minute per client.
- Portfolio media participates in tenant storage quota calculations.
- Stored strings are stripped of HTML.
- Embed URLs require HTTPS and a supported provider; raw embed HTML is never stored.
- Signed asset URLs are issued only after authenticated org-scoped access.
- Create, update, duplicate, upload, status, asset deletion, and item deletion are written to the tenant audit log.

## User experience

- The hub provides server-backed search, status/type/featured filters, sorting, and pagination.
- Cards render signed cover images or video posters when media exists.
- Read-only users open an internal presentation view; write controls are permission-gated.
- The viewer renders metrics, structured story sections, uploaded media, safe provider embeds, content blocks, and testimonials.
- The editor supports preview, unsaved-change warnings, media removal, cover selection, internal publishing, and ordered supporting blocks.

## Authoring practice

The editor favors a scannable outcome-led structure: snapshot, challenge, approach,
solution, outcome, proof, contextual media, and an approved client quote. This keeps
the library useful for internal sales, proposals, onboarding, and delivery learning.
