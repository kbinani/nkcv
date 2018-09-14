#!/bin/sh

openssl aes-256-cbc -k $DECORD_CERT -in script/certs/cert.cer.enc -d -a -out script/certs/cert.cer
openssl aes-256-cbc -k $DECORD_CERT -in script/certs/cert.p12.enc -d -a -out script/certs/cert.p12

security create-keychain -p travis nkcv-build.keychain
security default-keychain -s nkcv-build.keychain
security unlock-keychain -p travis nkcv-build.keychain
security set-keychain-settings -t 3600 -l ~/Library/Keychains/nkcv-build.keychain

security import ./script/certs/AppleWWDRCA.cer -k ~/Library/Keychains/nkcv-build.keychain -T /usr/bin/codesign
security import ./script/certs/cert.cer -k ~/Library/Keychains/nkcv-build.keychain -T /usr/bin/codesign
security import ./script/certs/cert.p12 -k ~/Library/Keychains/nkcv-build.keychain -P $CERTS_PASS -T /usr/bin/codesign
