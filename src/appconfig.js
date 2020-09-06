import md5 from 'md5';
import CryptoJS from 'crypto-js';

const userRoleEnum = { //定义用户角色的JSON对象，js实现枚举
        anchor: 0,
        viewer: 1
    },
    tokenTypeEnum = { //定义token类型的JSON对象，js实现枚举
        testEnv: 0,
        formatEnv: 1,
        thirdAuth: 2
    };

/* 默认app配置信息*/
var appID = 2452251574,
    server = 'wss://webliveroom-test.zego.im/ws',
    logUrl = 'wss://weblogger-test.zego.im/log',
    tokenType = tokenTypeEnum.testEnv, //三种token，指定具体那种类型
    appSign = "a8721f34e19651914d3e800ee1855973b842bdc4a3a432fd4c3f728ef0923d55",
    serverSecret = "a6d2b6421812cb58ed121241560260cb";

/*生成token方法，对外部的*/
function generateToken(userID) {
    let token;
    switch (tokenType) {
        case 0: //测试环境token
            token = getTestToken(appID, userID);
            break;
        case 1: //正式环境token
            token = getZeGouToken(appID, appSign, userID);
            break;
        case 2: //第三方鉴权token，用于登录房间鉴权
            token = getThirdToken(appID, userID);
            break;
        default:
            token = "";
            break;
    }
    return token
}

/*获取 测试环境 token*/
function getTestToken(appID, userID) {
    let token = "";
    $.ajax({
        url: 'https://wsliveroom-alpha.zego.im:8282/token', //测试环境下，获取token的HTTP接口
        data: {
            'app_id': appID,
            'id_name': userID
        },
        async: false,
        success: function (result) {
            token = result;
        }
    });
    return token;
}

/*获取 正式环境 token*/
function getZeGouToken(appID, appSign, userID) {
    let nonce = new Date().getTime().toString();
    let time = Math.floor(new Date().getTime() / 1000 + 30 * 60);
    let appSign32 = appSign.replace(/0x/g, '').replace(/,/g, '').substring(0, 32);
    if (appSign32.length < 32) {
        console.log('private sign erro!!!!');
        return "";
    }
    let sourece = md5(appID + appSign32 + userID + nonce + time);
    console.log('hash:' + sourece);
    let jsonStr = JSON.stringify({
        'ver': 1,
        'expired': time,
        'nonce': nonce,
        'hash': sourece
    });
    return Buffer.from(jsonStr).toString('base64');
}

/*获取 第三方鉴权 token*/
function getThirdToken(appID, userID) {
    let version = '01';

    let nonce = new Date().getTime();
    let time = Math.floor(new Date().getTime() / 1000 + 30 * 60);
    let third_token_json_str = JSON.stringify({
        "app_id": appID,
        "timeout": time,
        "nonce": nonce,
        "id_name": userID
    });

    return version + Buffer.from(encrypt(third_token_json_str), 'hex').toString('base64');
}

/* AES 加密方法*/
function encrypt(word) {
    let key = CryptoJS.enc.Utf8.parse(serverSecret);
    let IV = randomString(16);
    let iv = CryptoJS.enc.Utf8.parse(IV);
    let srcs = CryptoJS.enc.Utf8.parse(word);

    let encrypted = CryptoJS.AES.encrypt(srcs, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });

    return Buffer.from(IV).toString('hex') + encrypted.ciphertext.toString();
}

/*生成 16bytes 随机字符串*/
function randomString(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

/**
 * 修改app配置信息，常用于设置其他环境运行
 * 
 * 带参url示例：http://localhost:8080/?appID=&server=&logUrl=&tokenType=&appSign=&serverSecret=
 */
function setAppConfig() {
    let param_appID = getUrlParam("appID");
    let param_server = getUrlParam("server");
    let param_logUrl = getUrlParam("logUrl");
    let param_tokenType = getUrlParam("tokenType"); //三种token，指定具体那种类型
    let param_appSign = getUrlParam("appSign");
    let param_serverSecret = getUrlParam("serverSecret");
    console.warn("========",param_appID)

    if (!isNull(param_appID)) {
        appID = Number(param_appID);
    }
    if (!isNull(param_server)) {
        server = param_server;
    }
    if (!isNull(param_logUrl)) {
        logUrl = param_logUrl;
    }
    if (!isNull(param_tokenType)) {
        tokenType = Number(param_tokenType);
    }
    if (!isNull(param_appSign)) {
        appSign = param_appSign;
    }
    if (!isNull(param_serverSecret)) {
        serverSecret = param_serverSecret;
    }

    console.warn("app配置信息：",
        `appID: ${appID},\n
        server: ${server},\n
        logUrl: ${logUrl},\n
        tokenType: ${tokenType},\n
        appSign: ${appSign},\n
        serverSecret: ${serverSecret}`)
}

/*通过正则获取url中的参数*/
function getUrlParam(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
    var r = window.location.search.substr(1).match(reg);
    if (r != null)
        return decodeURI(r[2]);
    return null;
}

/*判断变量是否为null值*/
function isNull(tmp) {
    if (!tmp && typeof (tmp) != "undefined" && tmp != 0) {
        return true;
    } else if(tmp == ""){
        return true;
    }else{
        return false;
    }
}

/*加载页面时，获取url参数值，并设置*/
setAppConfig();

export {
    appID,
    server,
    logUrl,
    generateToken
}