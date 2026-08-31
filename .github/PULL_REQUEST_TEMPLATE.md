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

The whole gate, in one place. `npm run check` covers most of it — run it first:

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run format:check` passes (or `npm run format` run first)
- [ ] `npm test` passes (new runtime behavior has regression tests)
- [ ] `npm run test:types` passes (positive + negative suites)
- [ ] `npm run test:coverage` passes (thresholds are enforced, not lowered)
- [ ] `npm run build` passes
- [ ] `npm run verify:package` passes (packed-artifact consumer matrix; run for
      any change to `package.json`, build config, or the public surface)
- [ ] `npx publint` reports "All good!"
- [ ] Public behavior changes are reflected in README/JSDoc and `CHANGELOG.md`
- [ ] Dependency changes update `package-lock.json`

> One PR, one idea. If this starts to sprawl, split it — small changes review
> faster and land more reliably.
