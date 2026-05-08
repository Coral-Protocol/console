# Changelog

## [0.3.12](https://github.com/Coral-Protocol/console/compare/v0.3.11...v0.3.12) (2026-05-08)


### Features

* new tag for deployment type to show/hide back to cloud button ([#156](https://github.com/Coral-Protocol/console/issues/156)) ([dc94e48](https://github.com/Coral-Protocol/console/commit/dc94e4887668768074d2ea1001f3beda6196b280))
* nicer breadcrumb system ([#151](https://github.com/Coral-Protocol/console/issues/151)) ([a626a27](https://github.com/Coral-Protocol/console/commit/a626a27159bd1d8f17c6e243f5c31f40af1825ba))
* updated ui ([#155](https://github.com/Coral-Protocol/console/issues/155)) ([92172e8](https://github.com/Coral-Protocol/console/commit/92172e89005bce8c5ee01d8178a50c1d92ea0ef0))


### Bug Fixes

* better websocket cleanup ([#154](https://github.com/Coral-Protocol/console/issues/154)) ([7c14b43](https://github.com/Coral-Protocol/console/commit/7c14b439cf0bf01c5ada337ee4f944d97896bdba))
* breadcrumb script ([aa74fef](https://github.com/Coral-Protocol/console/commit/aa74fefdbbe522bed8a1f076eb1e5c1ac87cfd19))
* nix cloud build ([c675114](https://github.com/Coral-Protocol/console/commit/c6751148f973a3fcc4cccda331a1cb6215e9a15a))
* use latest server api ([f6cb9ab](https://github.com/Coral-Protocol/console/commit/f6cb9ab48c97db09e82713a9175dd02a5b87bb5d))

## [0.3.11](https://github.com/Coral-Protocol/console/compare/v0.3.10...v0.3.11) (2026-04-14)


### Bug Fixes

* stop unselect after each character ([44adadc](https://github.com/Coral-Protocol/console/commit/44adadc2f1fe3cf422f3013eadd5f4da8264660d))

## [0.3.10](https://github.com/Coral-Protocol/console/compare/v0.3.9...v0.3.10) (2026-04-14)


### Bug Fixes

* stop coral templates loading with mixed up default options ([4fc4319](https://github.com/Coral-Protocol/console/commit/4fc4319f7d6231c19f90d70d4e89780d54bce597))

## [0.3.9](https://github.com/Coral-Protocol/console/compare/v0.3.8...v0.3.9) (2026-04-13)


### Features

* registry overhaul ([#133](https://github.com/Coral-Protocol/console/issues/133)) ([7c69fcc](https://github.com/Coral-Protocol/console/commit/7c69fccb752cf264308995f71f8e110856d062e1))
* support coral server (prototype runtime pr) ([#131](https://github.com/Coral-Protocol/console/issues/131)) ([730c0f6](https://github.com/Coral-Protocol/console/commit/730c0f60aa1661fee5864a78a43935d3c1a6bb02))


### Bug Fixes

* quick fix on string name collision and related ([54736b9](https://github.com/Coral-Protocol/console/commit/54736b95291ac8e4217c1353ba472b836e3cfc78))

## [0.3.8](https://github.com/Coral-Protocol/console/compare/v0.3.7...v0.3.8) (2026-04-12)


### Features

* show missing agents from templates ([06558fb](https://github.com/Coral-Protocol/console/commit/06558fb7010ae1cc5c33ab5199d58b2881c9af31))


### Bug Fixes

* checkbox to close the last session for saving resources during development ([bd0ed8f](https://github.com/Coral-Protocol/console/commit/bd0ed8f9eb57e43445d4813a5934a8dc5ad22a4f))
* default to reasonable hold after exit for development ([1c8977f](https://github.com/Coral-Protocol/console/commit/1c8977fbb883d7d118e6469e3298d432a227a3ba))
* issues with special number types, temporarily remove cost display ([75fae50](https://github.com/Coral-Protocol/console/commit/75fae50d002c369feb5308536a2f82f2376d5e4e))
* remove annoying browser interactions for secret options ([d6daf07](https://github.com/Coral-Protocol/console/commit/d6daf0768042d5d6cfc2ee2baca0319706bee3c6))
* set default ttl to 15m ([d220d39](https://github.com/Coral-Protocol/console/commit/d220d39218a0970c4fb1278619e138e84065ec83))
* share the arcane wisdom of making namespaces in namespace switcher ([d957ea0](https://github.com/Coral-Protocol/console/commit/d957ea00b75b5d5ea539503688776744bd27cc63))

## [0.3.7](https://github.com/Coral-Protocol/console/compare/v0.3.6...v0.3.7) (2026-04-06)


### Bug Fixes

* agent ws state updates ([#129](https://github.com/Coral-Protocol/console/issues/129)) ([721c647](https://github.com/Coral-Protocol/console/commit/721c64737766bc5fbb52d87abc70e9e355bc970b))
* update logo kerning to match designs ([3921914](https://github.com/Coral-Protocol/console/commit/3921914d0a3a12c5b66225ac4dcb85e8480433ce))

## [0.3.6](https://github.com/Coral-Protocol/console/compare/v0.3.5...v0.3.6) (2026-04-02)


### Bug Fixes

* tailwind component lib scanning in nix build ([#127](https://github.com/Coral-Protocol/console/issues/127)) ([c6480cc](https://github.com/Coral-Protocol/console/commit/c6480ccc4343de400411415012c84ee86c075fb4))

## [0.3.5](https://github.com/Coral-Protocol/console/compare/v0.3.4...v0.3.5) (2026-04-01)


### Bug Fixes

* catch empty error on 500's in GET wrapper ([#125](https://github.com/Coral-Protocol/console/issues/125)) ([d369cd8](https://github.com/Coral-Protocol/console/commit/d369cd8d1a36dfeccffdb6218046c5bfad4265c6))
* sidebar hydration issues ([#124](https://github.com/Coral-Protocol/console/issues/124)) ([432bbcc](https://github.com/Coral-Protocol/console/commit/432bbcc16628b59672ff26aaee42e612fb17a372))

## [0.3.4](https://github.com/Coral-Protocol/console/compare/v0.3.3...v0.3.4) (2026-03-31)


### Features

* agent possession + misc fixes ([#122](https://github.com/Coral-Protocol/console/issues/122)) ([dd4f893](https://github.com/Coral-Protocol/console/commit/dd4f893c17c775aebbe1bdb5f67158ed94e19092))
* default templates ([#118](https://github.com/Coral-Protocol/console/issues/118)) ([b7d09cd](https://github.com/Coral-Protocol/console/commit/b7d09cd6deb3e894c892aea2da6be39b46f76c53))
* move to external component library ([#117](https://github.com/Coral-Protocol/console/issues/117)) ([aa41aa0](https://github.com/Coral-Protocol/console/commit/aa41aa0f64c60cee56b76e574fa7f00489f6b30b))
* workbench header ([#123](https://github.com/Coral-Protocol/console/issues/123)) ([7212ea6](https://github.com/Coral-Protocol/console/commit/7212ea6064d688d0d635d58f776a8f4bc48095d6))


### Bug Fixes

* miscellaneous things ([#120](https://github.com/Coral-Protocol/console/issues/120)) ([3648d90](https://github.com/Coral-Protocol/console/commit/3648d9073222e51dbe514e477ec897c092366439))
* remove old variant type ([4e4bf97](https://github.com/Coral-Protocol/console/commit/4e4bf97ea5c478e4038574d075bf930a0f2d1e64))
* uppercase logo ([0009b7e](https://github.com/Coral-Protocol/console/commit/0009b7ebbfa84f9198b5d6c578cb17de6e67ab5b))

## [0.3.3](https://github.com/Coral-Protocol/console/compare/0.3.2...v0.3.3) (2026-03-09)


### Bug Fixes

* jsonDirty not being set post import ([#112](https://github.com/Coral-Protocol/console/issues/112)) ([12a566c](https://github.com/Coral-Protocol/console/commit/12a566cd501dde893716fe0dd7bf9e0a5f079e9a))
