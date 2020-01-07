SERVICE_DIRS        := $(wildcard services/*/.)
ES_ENDPOINT         ?= tcp://localhost:1113
ES_USER             ?= admin
ES_PASS             ?= changeit
ACCESS_TOKEN_SECRET ?= verysecret

.EXPORT_ALL_VARIABLES:
.PHONY: test $(SERVICE_DIRS)

test: $(SERVICE_DIRS)

$(SERVICE_DIRS):
	$(MAKE) -C $@ test


startNode1:
	PORT=3001 node services/login_post/node_1/loginPost.js & \
	PORT=3002 node services/comment_put/node_1/commentPut.js & \
	PORT=3003 node services/comment_get/node_1/commentGet.js & \
	cd client && http-server
