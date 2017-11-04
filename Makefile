SERVICE_DIRS := $(wildcard services/*/.)

test: $(SERVICE_DIRS)

$(SERVICE_DIRS):
	$(MAKE) -C $@

.PHONY: test $(SERVICE_DIRS)
