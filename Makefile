.PHONY: bootstrap check test-resource-lease

bootstrap:
	npm install
	git config core.hooksPath .githooks

check:
	@node tools/check-docs-examples.mjs
	@$(MAKE) -s test-resource-lease

test-resource-lease:
	@./tools/test-resource-lease.sh
