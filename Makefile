
docs: clean-docs
	@./bin/codex build docs \
		--out docs/out
	@./bin/codex serve \
		--out docs/out

clean-docs:
	@rm -rf docs/out

.PHONY: clean-docs docs