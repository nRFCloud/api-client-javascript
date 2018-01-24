.PHONY: clean

generated: generated/types generated/client.ts generated/index.ts generated/README.md
	./node_modules/.bin/tsc

generated/client.ts: generator/generate-client.js node_modules/@nrfcloud/api/docs/api.json
	node generator/generate-client.js $@

generated/index.ts:
	echo "export * from './client';" > $@

generator/generate-client.js: src/*.ts
	./node_modules/.bin/tsc -p tsconfig-generator.json

generated/types: node_modules/@nrfcloud/api/schemas/*.json
	@mkdir -p $@
	node node_modules/@nrfcloud/models/scripts/generate-base-models-from-schema.js node_modules/@nrfcloud/api/schemas $@

generated/README.md:
	echo "The files in this folder are auto-generated. Do not edit." > $@

dist: generated
	mkdir -p $@/types
	cp -r generated/types/* $@/types
	./node_modules/.bin/tsc

clean:
	rm -rf generator dist
