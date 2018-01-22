dist: dist/types
	./node_modules/.bin/tsc

dist/types: node_modules/@nrfcloud/api/schemas/*.json
	@mkdir -p $@
	node node_modules/@nrfcloud/models/scripts/generate-base-models-from-schema.js node_modules/@nrfcloud/api/schemas $@
