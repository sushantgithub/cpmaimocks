# CertMocks Release Workflow

## Normal change

1. Branch from `staging`.
2. Implement the complete issue locally/in the feature branch.
3. Run GitHub CI: Prisma generate, TypeScript, unit tests and Next.js build.
4. Open PR into `staging`.
5. Squash/merge with a commit title beginning `[staging]`.
6. Test the deployed staging site.
7. Fix any staging issue on a feature branch and repeat the staging gate.
8. When accepted, PR `staging` -> `claude/cpmai-exam-platform-dg2pob`.
9. Squash/merge production with a commit title beginning `[deploy]`.
10. Verify production Vercel status and run a short smoke test.

## Vercel build budget

Vercel Git deployments are disabled for feature branches entirely. Only the permanent `staging` branch and the production branch may create Vercel deployments.

On those two branches, the `ignoreCommand` adds a second gate: a build is requested only when the latest commit message contains `[staging]` or `[deploy]`.

This means normal feature-branch pushes use GitHub CI only and do not create Vercel Preview deployment attempts.
