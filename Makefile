all:
	npm install

install: node_modules

node_modules:
	npm install

test:
	rm -fr build
	mkdir build
	@./node_modules/.bin/mocha

test-cov:
	rm -fr build
	mkdir build
	./node_modules/.bin/istanbul cover --report json --dir build ./node_modules/.bin/_mocha
	unzip -p build/coverage.zip coverage.json > build/route-coverage.json
	node mergeCoverage.js

test-coveralls: test-cov
	cat build/lcov.info | ./node_modules/coveralls/bin/coveralls.js --verbose

.PHONY: test
