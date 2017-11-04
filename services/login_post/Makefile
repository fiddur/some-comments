TARGET       ?= node_1
TEST_PORT    ?= 8901
SUBDIRS      := $(wildcard */.)
ES_ENDPOINT  ?= tcp://localhost:1113
ES_USER      ?= admin
ES_PASS      ?= changeit

export TARGET ES_ENDPOINT

test-target:
	echo Testing for $(TARGET)
	PORT=$(TEST_PORT) \
	../../node_modules/.bin/mocha test

test-all: $(SUBDIRS)

$(SUBDIRS):
	PORT=$(TEST_PORT) TARGET=$@ ../../node_modules/.bin/mocha test

.PHONY: test-target test-all $(SUBDIRS)

