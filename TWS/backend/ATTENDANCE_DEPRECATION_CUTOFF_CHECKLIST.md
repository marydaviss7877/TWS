# Attendance Deprecated Endpoint Cutoff Checklist

This checklist defines the safe removal process for legacy attendance punch endpoints under `/api/attendance/*` that now proxy to canonical tenant routes.

## Deprecated Endpoints

- `POST /api/attendance/checkin`
- `POST /api/attendance/checkout`
- `POST /api/attendance/check-in`
- `POST /api/attendance/check-out`

## Canonical Successor Endpoints

- `POST /api/tenant/:tenantSlug/organization/hr/attendance/check-in`
- `POST /api/tenant/:tenantSlug/organization/hr/attendance/check-out`

## Telemetry Source of Truth

- Prometheus metric: `deprecated_attendance_requests_total{endpoint,method}`
- Track this metric per endpoint and per tenant traffic window.

## Cutoff Entry Criteria

- Migration notice has been communicated to internal/frontend teams.
- Deprecation headers are live on all deprecated punch endpoints.
- Dashboards/alerts exist for `deprecated_attendance_requests_total`.

## Removal Readiness Criteria

- 14 consecutive days with no increase in:
  - `deprecated_attendance_requests_total{endpoint="/api/attendance/checkin",method="POST"}`
  - `deprecated_attendance_requests_total{endpoint="/api/attendance/checkout",method="POST"}`
  - `deprecated_attendance_requests_total{endpoint="/api/attendance/check-in",method="POST"}`
  - `deprecated_attendance_requests_total{endpoint="/api/attendance/check-out",method="POST"}`
- No support tickets or error logs referencing legacy punch paths in the same period.
- Smoke tests for employee + admin attendance pass against canonical tenant routes.

## Removal Plan

1. Remove deprecated punch route handlers from `backend/src/modules/business/routes/attendance.js`.
2. Keep non-punch attendance endpoints untouched unless separately deprecated.
3. Deploy behind normal release process.
4. Monitor 48 hours:
  - 404/5xx rates for `/api/attendance/*`
  - Attendance check-in/check-out success rates on canonical routes.

## Rollback Plan

- If unexpected traffic/errors appear post-removal:
  1. Re-deploy previous version restoring compatibility handlers.
  2. Identify caller via access logs and migrate caller to canonical endpoint.
  3. Re-start 14-day no-traffic observation window.