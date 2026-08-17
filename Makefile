.PHONY: bootstrap check check-portable test-cli test-paths-changed test-resource-lease

bootstrap:
	npm install
	git config core.hooksPath .githooks

check:
	@$(MAKE) -s check-portable
	@$(MAKE) -s test-resource-lease

check-portable:
	@node tools/check-docs-examples.mjs
	@node tools/check-no-sparkles.mjs
	@$(MAKE) -s test-cli
	@$(MAKE) -s test-paths-changed

test-cli:
	@node tools/test-cli.mjs

test-paths-changed:
	@./tools/test-paths-changed.sh

test-resource-lease:
	@./tools/test-resource-lease.sh
