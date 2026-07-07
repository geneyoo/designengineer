.PHONY: bootstrap check

bootstrap:
	npm install
	git config core.hooksPath .githooks

check:
	@node tools/check-docs-examples.mjs
