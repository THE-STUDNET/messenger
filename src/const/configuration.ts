let CONFIG: any = {};

// PACKAGE
CONFIG.package = 'com.twic.messenger';

// API
CONFIG.api = {};
CONFIG.api.protocol = "http";
CONFIG.api.domain = "local.api.com";
CONFIG.api.path = "api.json-rpc";
CONFIG.api.authorization_header = "authorization";
CONFIG.api.url = CONFIG.api.protocol+'://'+CONFIG.api.domain+'/'+CONFIG.api.path;

// DMS
CONFIG.dms = {};
CONFIG.dms.protocol = "http";
CONFIG.dms.domain = "local.api.com";
CONFIG.dms.paths = {};
CONFIG.dms.paths.datas = "data";
CONFIG.dms.paths.download = "download";
CONFIG.dms.paths.upload = "save";
CONFIG.dms.base_url = '//'+CONFIG.dms.domain+'/';
CONFIG.dms.max_upload_size = 104857600;

// FRONT BASE URL
CONFIG.twic_url = "http://local.opentwic.com/";

// REAL TIME APP
CONFIG.rt = {};
CONFIG.rt.domain = "local.events.com";
CONFIG.rt.port = "8080";
CONFIG.rt.secure = false;

// TOKBOX
CONFIG.tokbox_api_key = 'TOKBOX_API_KEY';

// FIREBASE
CONFIG.firebase = {
    apiKey: "FIREBASE_API_KEY",
    authDomain: "FIREBASE_AUTH_DOMAIN",
    databaseURL: "FIREBASE_DATABASE_URL",
    messagingSenderId: "FIREBASE_SENDER_ID",
    projectId: "FIREBASE_PROJECT_ID",
    storageBucket: "FIREBASE_STORAGE_BUCKET"
};

// CONFERENCE RULES.
CONFIG.LIVECLASS_OPT = {"autoPublishCamera":[{"roles":["academic","instructor"]}],"autoPublishMicrophone":false,"archive":[{"roles":["admin","super_admin","academic","instructor"]}],"raiseHand":[{"roles":["student"]}],"publish":[{"roles":["admin","super_admin","academic","instructor"]}],"askDevice":[{"roles":["admin","super_admin","academic","instructor"]}],"askScreen":[{"roles":["admin","super_admin","academic","instructor"]}],"forceMute":[{"roles":["admin","super_admin","academic","instructor"]}],"forceUnpublish":[{"roles":["admin","super_admin","academic","instructor"]}],"kick":[{"roles":["admin","super_admin","academic"]}]};
CONFIG.GROUPWORK_OPT = {"autoPublishCamera":true,"autoPublishMicrophone":false,"archive":false,"raiseHand":false,"publish":true,"askDevice":[{"roles":["admin","super_admin","academic","instructor"]}],"askScreen":[{"roles":["admin","super_admin","academic","instructor"]}],"forceMute":[{"roles":["admin","super_admin","academic","instructor"]}],"forceUnpublish":[{"roles":["admin","super_admin","academic","instructor"]}],"kick":[{"roles":["admin","super_admin","academic","instructor"]}]};

export const configuration: any = CONFIG;
