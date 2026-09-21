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

The repository's `vercel.json` ignores ordinary commits. A Vercel build is requested only when the latest commit message contains either `[staging]` or `[deploy]`.

This prevents every small implementation commit from consuming a Preview build.
