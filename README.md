This is the messenger App for TWIC.

### Install

```bash
$ sudo npm install -g ionic cordova
```

Add your configuration files in config Folder (look at /configs/localhost for an example ):
- google-services.json 
- GoogleService-Info.plist
- configuration.ts ( it will replace src/const/configuration.ts )

Then build (Ionic will prompt you to install dependencies, just say YES)

```bash
$ ionic build
```

## Run

```bash
$ ionic serve
```

## Compile ( For Android )

Add a build.json & its associated .keystore file in root folder.
Then just run: 

```bash
$ npm run android-apk
```


## Notes

 - cordova-plugin-cocoapod-support is required on IOS.
 - (Android) update cordova-plugin-file-opener2 plugin.xml => <framework src="com.android.support:support-v4:27.+" />