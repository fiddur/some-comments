SERVICE_DIRS := $(wildcard services/*/.)

test: $(SERVICE_DIRS)

$(SERVICE_DIRS):
	$(MAKE) -C $@ test

.PHONY: test $(SERVICE_DIRS)
