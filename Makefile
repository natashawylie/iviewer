PROJECT=jquery.iviewer
VERSION=dev
BUNDLE_NAME=${PROJECT}-${VERSION}

#send all commits to the master repository
push:
	git push origin master

min:
	rm -f jquery.iviewer.min.js
	googlecc --js jquery.iviewer.js --js_output_file jquery.iviewer.min.tmp.js
	sed -n '/^\/\*/,/\*\// p' jquery.iviewer.js > jquery.iviewer.min.js
	cat jquery.iviewer.min.tmp.js >> jquery.iviewer.min.js
	rm -f jquery.iviewer.min.tmp.js

bundle:
	mkdir ${BUNDLE_NAME}
	ls -I Makefile -I ${BUNDLE_NAME} -I .git | xargs -I {} cp -fR {} ${BUNDLE_NAME}
	zip -r ${BUNDLE_NAME}.zip ${BUNDLE_NAME}
	rm -rf ${BUNDLE_NAME}
