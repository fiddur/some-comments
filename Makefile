test:
	rm -fr build
	mkdir build
	@./node_modules/.bin/mocha

test-cov: test
	cd build && unzip coverage.zip

test-coveralls: test
	@echo TRAVIS_JOB_ID $(TRAVIS_JOB_ID)
	unzip -p build/coverage.zip lcov.info | ./node_modules/coveralls/bin/coveralls.js --verbose

.PHONY: test
