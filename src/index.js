require('bootstrap/dist/css/bootstrap.css');
require('./assets/font_Icon/iconfont.css');
require('./assets/css/chat.css');
require('./assets/css/styles.min.css');
import VConsole from 'vconsole';
import $ from 'jquery';
import flvjs from 'flv.js';
import {
    initSDK,
    localStreamID,
    localStream,
    screenStreamID,
    localUser,
    zg,
    pushStream,
    enterRoom,
    outRoom,
    sendMessage,
    startMixer,
    setDevices,
    pushScreenStream
} from "./common";

new VConsole();
var isMuteVideo = false; //是否关闭流画面，Boolean值
var isMuteAudio = false; //是否关闭流画面，Boolean值
var isEnter = false; //是否进入房间
var roomID; //房间号

initSDK(); //初始化SDK

/** 监听:枚举设备 按钮 */
$("#btn-dirver-nume").click(() => {
    setDevices();
});

/** 监听:进入房间（推流）按钮 */
$('#btn-enter-push').click(async () => {
    roomID = $('#i_roomID').val() + '';
    if (isEmpty(roomID)) {
        alert('请输入对应的 roomID ');
        return;
    }
    if (!isEnter) {
        isEnter = await enterRoom(localUser.userID, localUser.userName, roomID);
        if (isEnter) {
            pushStream(localStreamID);
        }
    } else {
        pushStream(localStreamID);
    }
});

/** 监听:屏幕分享（推流）按钮 */
$('#btn-enter-screen').click(async () => {
    roomID = $('#i_roomID').val() + '';
    if (isEmpty(roomID)) {
        alert('请输入对应的 roomID ');
        return;
    }
    if (!isEnter) {
        isEnter = await enterRoom(localUser.userID, localUser.userName, roomID);
        if (isEnter) {
            pushScreenStream(screenStreamID);
        }
    } else {
        pushScreenStream(screenStreamID);
    }
});

/** 监听:进入房间 按钮 */
$('#btn-enter-pull').click(async () => {
    roomID = $('#i_roomID').val() + '';
    if (isEmpty(roomID)) {
        alert('请输入对应的 roomID ');
        return;
    }
    if (!isEnter) {
        isEnter = await enterRoom(localUser.userID, localUser.userName, roomID);
    } else {
        alert('已经在该房间内，无需再次进入房间 ');
    }
});

/** 监听:退出房间 按钮 */
$('#btn-out').click(() => {
    if (isEnter) {
        outRoom(roomID);
        isEnter = false;
    } else {
        alert('未登录房间，无需退出!');
    }
});

/** 监听:发起混流任务 按钮 */
$('#btn-start-mix').click(async () => {
    let result = await startMixer();
    console.warn('混流任务的结果， result：', JSON.stringify(result));
    if (result != "") {
        if (result.errorCode == 0) {
            const outputList = JSON.parse(result.extendedData).mixerOutputList;
            //播放flv
            const flvUrl = outputList[0].flvURL;
            console.log('flvUrl:>>>>>>>>>>>>>>  ', flvUrl);
            if (flvjs.isSupported()) {
                let flvPlayer = flvjs.createPlayer({
                    type: 'flv',
                    url: flvUrl,
                });
                let vd_mix = document.createElement('video'); //创建一个video标签
                vd_mix.autoplay = "true";
                vd_mix.controls = "true";
                $("#div_mix").append(vd_mix);
                flvPlayer.attachMediaElement(vd_mix);
                flvPlayer.load();
            }
        }
    }
});

/** 监听:消息发送 按钮 */
$('#chat-fasong').click(async () => {
    let message = $('.div-textarea').text();
    sendMessage(roomID, message);
});

/** 监听:打开/关闭聊天框 按钮 */
$('.chatBtn').click(() => {
    $('.chatBox').toggle();
    $('.chatBox-kuang').toggle();
    $('#chatBox-content-demo').scrollTop($('#chatBox-content-demo')[0].scrollHeight); //聊天框默认最底部
});

/** 监听:发起混音 按钮 */
$("#btn-audio-mixer").click(async () => {
    let audio1 = [$('#mix-audio')[0]];
    let re = zg.startMixingAudio(localStreamID, audio1);
});

/** 监听:切换audio采集设备 select */
$("#audioDeviceList").change(() => {
    if (localStream != null) {
        console.log(">>>>>>>>: " + $("#audioDeviceList").val());
        zg.useAudioDevice(localStream, $("#audioDeviceList").val());
    }
});

/** 监听:切换video采集设备 select */
$("#videoDeviceList").change(() => {
    if (localStream != null) {
        console.log(">>>>>>>>: " + $("#videoDeviceList").val());
        zg.useVideoDevice(localStream, $("#videoDeviceList").val());
    }
});

/** 监听:打开/关闭流画面 按钮 */
$("#btn-mute-video").click(() => {
    if (localStream != null) {
        isMuteVideo = !isMuteVideo;
        zg.mutePublishStreamVideo(localStream, isMuteVideo);
    }
});

/** 监听:打开/关闭流声音 按钮 */
$("#btn-mute-audio").click(() => {
    if (localStream != null) {
        isMuteAudio = !isMuteAudio;
        zg.mutePublishStreamAudio(localStream, isMuteAudio);
    }
});

/** 判断 字符是否为空 方法 */
function isEmpty(str) {
    if (typeof str == null || str == "" || str == "undefined") {
        return true;
    } else {
        return false;
    }
}