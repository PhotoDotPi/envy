## What does this change?

<!-- A short, human description of the change and why it exists. Keep it to a
     sentence or two — the diff is the detail. Link to the related issue if one
     exists. -->

## Type of change

<!-- Check one or more -->

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Packaging / build
- [ ] CI
- [ ] Documentation
- [ ] Dependencies

## How was it verified?

<!-- Briefly describe your verification, including command output if relevant.
     For behavior changes, say which regression test you added. -->

## Checklist

The whole gate, in one place. `bun run check` covers most of it — run it first:

- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes
- [ ] `bun run format:check` passes (or `bun run format` run first)
- [ ] `bun run test` passes (new runtime behavior has regression tests)
- [ ] `bun run test:types` passes (positive + negative suites)
- [ ] `bun run test:coverage` passes (thresholds are enforced, not lowered)
- [ ] `bun run build` passes
- [ ] `bun run verify:package` passes (packed-artifact consumer matrix; run for
      any change to `package.json`, build config, or the public surface)
- [ ] `npx publint` reports "All good!"
- [ ] Public behavior changes are reflected in README/JSDoc and `CHANGELOG.md`
- [ ] Dependency changes update both `bun.lock` and `package-lock.json`

> One PR, one idea. If this starts to sprawl, split it — small changes review
> faster and land more reliably.
