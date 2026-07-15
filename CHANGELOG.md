# [1.5.0](https://github.com/luxqw/torio/compare/v1.4.1...v1.5.0) (2026-07-15)


### Bug Fixes

* derive VERSION from package.json instead of hardcoding it ([c641846](https://github.com/luxqw/torio/commit/c641846ded8e5ab31555d6826d9a147f4050f085))
* regenerate package-lock.json for ip-set direct dependency ([968963f](https://github.com/luxqw/torio/commit/968963ff1ff3da84bb3e4e694f2307495a910cdf)), closes [#3](https://github.com/luxqw/torio/issues/3)
* repackage Nix build for this fork instead of the old upstream repo ([8d1d1c2](https://github.com/luxqw/torio/commit/8d1d1c2f5d78ee9ba5e0df1c891e4c93edc91be4)), closes [.#default](https://github.com/./issues/default)
* repoint project links to luxqw/torio ([2bdaf2c](https://github.com/luxqw/torio/commit/2bdaf2cb3f9399e65f8a4ead58898d42c5aabd7f))
* vendor/ip-set не попадал в npm-тарболл — override не работал ([7a7f487](https://github.com/luxqw/torio/commit/7a7f4870cf87dd3bfefa51f01ffcdff8316b29b5))
* включить vendor/ip-set в публикуемый пакет и перенести в корень ([aa67e91](https://github.com/luxqw/torio/commit/aa67e918efe4b031912c1bfa0aae5e137a74466d))
* заменить overrides на прямую зависимость file:vendor/ip-set ([28fa6fe](https://github.com/luxqw/torio/commit/28fa6fe6381fc58aee781fc02bc0d87b745728c1))


### Features

* automate releases with semantic-release and build Nix for all platforms ([fb6d20e](https://github.com/luxqw/torio/commit/fb6d20e3da3efc7cff6b11e5e5f81facef8ba932))
