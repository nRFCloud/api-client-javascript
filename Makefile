.PHONY: clean

dist: ts/types ts/client.ts ts/index.ts
	./node_modules/.bin/tsc
	mkdir -p dist/types
	cp ts/types/* dist/types

ts/client.ts: generator/generate-client.js node_modules/@nrfcloud/api/docs/api.json
	node generator/generate-client.js

ts/index.ts:
	echo "export * from './client';" > $@

generator/generate-client.js: src/*.ts
	./node_modules/.bin/tsc -p tsconfig-generator.json

ts/types : node_modules/@nrfcloud/api/schemas/*.json
	@mkdir -p $@
	node node_modules/@nrfcloud/models/scripts/generate-base-models-from-schema.js node_modules/@nrfcloud/api/schemas $@

clean:
	rm -rf dist generator ts
