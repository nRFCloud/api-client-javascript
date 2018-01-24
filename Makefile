.PHONY: clean

generated: generated/ts/types generated/ts/client.ts generated/ts/index.ts generated/README.md
	./node_modules/.bin/tsc
	mkdir -p generated/js/types
	cp generated/ts/types/* generated/js/types

generated/ts/client.ts: generator/generate-client.js node_modules/@nrfcloud/api/docs/api.json
	node generator/generate-client.js $@

generated/ts/index.ts:
	echo "export * from './client';" > $@

generator/generate-client.js: src/*.ts
	./node_modules/.bin/tsc -p tsconfig-generator.json

generated/ts/types : node_modules/@nrfcloud/api/schemas/*.json
	@mkdir -p $@
	node node_modules/@nrfcloud/models/scripts/generate-base-models-from-schema.js node_modules/@nrfcloud/api/schemas $@

generated/README.md:
	echo "The files in this folder are auto-generated. Do not edit." > $@

clean:
	rm -rf generator
