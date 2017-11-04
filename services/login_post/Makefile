TARGET    ?= node_1
TEST_PORT ?= 8901
SUBDIRS   := $(wildcard */.)

test-target:
	echo Testing for $(TARGET)
	PORT=$(TEST_PORT) TARGET=$(TARGET) ../../node_modules/.bin/mocha test

test-all: $(SUBDIRS)

$(SUBDIRS):
	PORT=$(TEST_PORT) TARGET=$@ ../../node_modules/.bin/mocha test

.PHONY: test-target test-all $(SUBDIRS)

