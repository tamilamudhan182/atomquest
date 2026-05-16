# AtomQuest Goal Portal API

Base URL: `/api`

## Auth

| Method | Endpoint | Roles | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/login` | Public | JWT login |
| GET | `/auth/me` | Authenticated | Current user profile |
| POST | `/auth/register` | Admin | Create users |

## Goals

| Method | Endpoint | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/goals` | Employee, Manager, Admin | Role-scoped goal list |
| POST | `/goals` | Employee, Manager, Admin | Create goal during goal-setting window |
| PUT | `/goals/:id` | Owner, Manager, Admin | Edit unlocked goals |
| POST | `/goals/submit` | Employee, Manager, Admin | Submit goal set after weightage validation |
| POST | `/goals/:id/approve` | Manager, Admin | Inline edit, approve, and lock goal |
| POST | `/goals/:id/return` | Manager, Admin | Return goal for rework |

## Check-ins

| Method | Endpoint | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/checkins?quarter=Q1` | Employee, Manager, Admin | Planned versus actual data |
| POST | `/checkins/goals/:goalId` | Employee, Manager, Admin | Log achievement for a quarter |
| POST | `/checkins/:id/review` | Manager, Admin | Structured manager comment |

## Admin and Governance

| Method | Endpoint | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/admin/users` | Manager, Admin | User and hierarchy view |
| PATCH | `/admin/users/:id/hierarchy` | Admin | Update hierarchy or role |
| GET | `/admin/cycles` | Authenticated | Cycle configuration |
| POST | `/admin/cycles` | Admin | Create cycle with check-in windows |
| PATCH | `/admin/cycles/:id` | Admin | Update cycle windows |
| POST | `/admin/shared-goals/push` | Manager, Admin | Push shared departmental KPIs |
| POST | `/admin/goals/:id/unlock` | Admin | Unlock approved goal |
| GET | `/admin/audit-logs` | Admin | Audit trail |
| POST | `/admin/windows/sync` | Admin | Manual scheduled-window sync |

## Reporting

| Method | Endpoint | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/dashboard/summary` | Employee, Manager, Admin | Completion dashboard and analytics |
| GET | `/reports/achievements.csv` | Employee, Manager, Admin | CSV export |
| GET | `/reports/achievements.xlsx` | Employee, Manager, Admin | Excel export |
