PROJECT=jquery.iviewer
VERSION=0.4.1
BUNDLE_NAME=${PROJECT}-${VERSION}

#send all commits to the master repository
push:
	git push origin master

bundle:
	mkdir ${BUNDLE_NAME}
	ls -I Makefile -I ${BUNDLE_NAME} -I .git | xargs -I {} cp -fR {} ${BUNDLE_NAME}
	zip -r ${BUNDLE_NAME}.zip ${BUNDLE_NAME}
	rm -rf ${BUNDLE_NAME}
