.PHONY: bootstrap check test-pr-context test-resource-lease

bootstrap:
	npm install
	git config core.hooksPath .githooks

check:
	@node tools/check-docs-examples.mjs
	@node tools/check-cross-harness-skills.mjs
	@$(MAKE) -s test-pr-context
	@$(MAKE) -s test-resource-lease

test-pr-context:
	@node tools/test-pr-context.mjs

test-resource-lease:
	@./tools/test-resource-lease.sh
