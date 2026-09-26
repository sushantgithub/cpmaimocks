# CertMocks Staging Environment

## Goal

Staging is the only place where new CertMocks behavior should be exercised with a real browser before production.

Release flow:

```
feature branch
  -> GitHub CI
  -> PR into staging
  -> one Vercel staging deployment
  -> acceptance testing
  -> PR/promote staging into claude/cpmai-exam-platform-dg2pob
  -> one Vercel production deployment
```

## Branches

- `staging` — permanent integration / acceptance branch.
- `claude/cpmai-exam-platform-dg2pob` — production branch.
- Feature branches should normally branch from `staging` and return to `staging`.

Vercel deployments are intentionally restricted:
- Feature branches are disabled at `git.deploymentEnabled`, so their pushes use GitHub CI only and do not create Vercel deployment attempts.
- Only `staging` and `claude/cpmai-exam-platform-dg2pob` may deploy through the Git integration.
- Use `[staging]` in the final staging merge commit to request a staging build.
- Use `[deploy]` only for an approved production merge.
- Commits on those permanent branches without the appropriate marker are ignored by the build gate.

## Required isolation

Staging must have its own:

1. Supabase project/database.
2. Vercel Preview environment variables scoped specifically to the `staging` branch.
3. NextAuth secret and staging callback URL.
4. Razorpay test-mode keys and staging webhook.
5. Email/test sender configuration.
6. Admin/test users.

Never copy production users, sessions, payments, subscriptions, exam attempts, bookmarks, password-reset tokens, or analytics into staging.

It is acceptable to copy non-personal learning content such as certifications, domains, questions, mock definitions, plans, coupons intended for testing, and site settings after reviewing them.

## Safety guard

When `APP_ENV=staging`, the application fails closed if:

- `STAGING_DATABASE_PROJECT_REF` is missing.
- `DATABASE_URL` or `DIRECT_URL` does not contain that staging Supabase project ref.
- The public/auth URL points to `certmocks.com` production.
- A Razorpay key is present but is not a `rzp_test_` key.

Staging also displays a visible warning banner and uses `noindex, nofollow`.

## Supabase setup

Create a separate Supabase project named something obvious such as `certmocks-staging`.

On a brand-new empty staging database, create the schema from the checked-in Prisma schema. Use the current schema as the source of truth and validate it before loading content.

Do not point staging at the production database even temporarily.

After schema creation, load only sanitized/reference content needed to test:
- certification/domain metadata
- quiz questions
- mock exams + question mappings
- practice-only questions
- subscription-plan configuration

Create fresh staging-only users and attempts through the application.

## Vercel setup

Keep the existing Vercel project and use the Preview environment for the `staging` Git branch.

Configure branch-scoped variables from `.env.staging.example`.

Assign a stable branch/custom domain, preferably:

```
staging.certmocks.com
```

If that custom domain is not configured yet, use the stable Vercel branch URL first and set `NEXT_PUBLIC_APP_URL` / `NEXTAUTH_URL` to that exact HTTPS URL.

## Acceptance gate

Before production promotion, test at minimum:

- login/logout and account activation
- admin Question Bank / imports
- quiz single-answer and multiple-answer behavior
- quiz resume/back navigation
- dashboard counts
- practice selection
- mini/full mock launch, submit and results
- free vs paid access
- Razorpay test checkout/webhook
- email links use staging URL
- mobile layout

Only after acceptance passes should staging be promoted to production.

## Production promotion

Create a PR from `staging` to `claude/cpmai-exam-platform-dg2pob`.

The final production merge commit should contain `[deploy]` exactly once. Do not redeploy intermediate commits.
