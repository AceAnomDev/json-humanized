# Publishing to npm

Step-by-step guide for maintainers.

---

## Prerequisites

- You have an account on [npmjs.com](https://www.npmjs.com)
- You are logged in: `npm whoami` should print your username
- If not: `npm login`

---

## First publish

### 1. Check the package name is available

```bash
npm view json-humanized
# If it returns "npm error 404" → name is free ✓
# If it returns package info → name is taken, update "name" in package.json
```

### 2. Review what will be published

```bash
npm pack --dry-run
```

You should see only:
- `bin/cli.js`
- `src/**`
- `examples/*.json`, `examples/demo.js`
- `README.md`, `LICENSE`, `package.json`

NOT included (via `.npmignore`): `test/`, `.github/`, `docs/`, `node_modules/`

### 3. Run tests one final time

```bash
npm test
```

### 4. Publish

```bash
npm publish
```

That's it. Your package is live at:
`https://www.npmjs.com/package/json-humanized`

---

## Publishing an update

### 1. Update CHANGELOG.md

Add an entry under a new version heading.

### 2. Bump the version

```bash
# Patch (1.0.0 → 1.0.1): bug fixes
npm version patch

# Minor (1.0.0 → 1.1.0): new features, backwards-compatible
npm version minor

# Major (1.0.0 → 2.0.0): breaking changes
npm version major
```

This command automatically:
- Updates `version` in `package.json`
- Creates a git commit: `"1.0.1"`
- Creates a git tag: `"v1.0.1"`

### 3. Push to GitHub

```bash
git push && git push --tags
```

### 4. Publish to npm

```bash
npm publish
```

---

## Publish with a tag (beta)

```bash
npm version prerelease --preid=beta   # → 1.0.1-beta.0
npm publish --tag beta
```

Users install it with: `npm install json-humanized@beta`

---

## Unpublish (within 72 hours only)

```bash
npm unpublish json-humanized@1.0.0
```

After 72 hours npm does not allow unpublishing — deprecate instead:

```bash
npm deprecate json-humanized@1.0.0 "Critical bug, use 1.0.1"
```

---

## Checking download stats

```bash
npm info json-humanized
# or visit: https://www.npmjs.com/package/json-humanized
```
