## [1.5.4](https://github.com/luxqw/torio/compare/v1.5.3...v1.5.4) (2026-07-15)


### Bug Fixes

* **nix:** refresh npmDepsHash for v1.5.3 lockfile ([7b5ce9b](https://github.com/luxqw/torio/commit/7b5ce9b7a2345164bccc0bc6606394d3bce237e3))

## [1.5.3](https://github.com/luxqw/torio/compare/v1.5.2...v1.5.3) (2026-07-15)


### Bug Fixes

* stop sidebar navigation from swapping the content pane live ([5ed196c](https://github.com/luxqw/torio/commit/5ed196cb1ded55ff27d43d8a34126511072133f1))

## [1.5.2](https://github.com/luxqw/torio/compare/v1.4.1...v1.5.2) (2026-07-15)


### Features

* automate releases with semantic-release and build Nix for all platforms ([fb6d20e](https://github.com/luxqw/torio/commit/fb6d20e3da3efc7cff6b11e5e5f81facef8ba932))


### Bug Fixes

* derive VERSION from package.json instead of hardcoding it ([c641846](https://github.com/luxqw/torio/commit/c641846ded8e5ab31555d6826d9a147f4050f085))
* regenerate package-lock.json for ip-set direct dependency ([968963f](https://github.com/luxqw/torio/commit/968963ff1ff3da84bb3e4e694f2307495a910cdf)), closes [#3](https://github.com/luxqw/torio/issues/3)
* repackage Nix build for this fork instead of the old upstream repo ([8d1d1c2](https://github.com/luxqw/torio/commit/8d1d1c2f5d78ee9ba5e0df1c891e4c93edc91be4))
* repoint project links to luxqw/torio ([2bdaf2c](https://github.com/luxqw/torio/commit/2bdaf2cb3f9399e65f8a4ead58898d42c5aabd7f))
* vendor/ip-set не попадал в npm-тарболл — override не работал ([7a7f487](https://github.com/luxqw/torio/commit/7a7f4870cf87dd3bfefa51f01ffcdff8316b29b5))
* включить vendor/ip-set в публикуемый пакет и перенести в корень ([aa67e91](https://github.com/luxqw/torio/commit/aa67e918efe4b031912c1bfa0aae5e137a74466d))
* заменить overrides на прямую зависимость file:vendor/ip-set ([28fa6fe](https://github.com/luxqw/torio/commit/28fa6fe6381fc58aee781fc02bc0d87b745728c1))
* publish as @luxqw/torio — npm blocked torio-cli (no access to the old owner) and then unscoped torio (too similar to "turbo") ([7ed0a4f](https://github.com/luxqw/torio/commit/7ed0a4f6314d1fa7ddcda17e54fd8a9284aad589), [3c4b10b](https://github.com/luxqw/torio/commit/3c4b10b2a382b98ddf50d62b173699b912122b3a))
