import VConsole from 'vconsole';
import $ from 'jquery'
import 'bootstrap/dist/css/bootstrap.css'
import './assets/font_Icon/iconfont.css';
require("./assets/css/chat.css");
require("./assets/css/styles.min.css");
import {
    initSDK,
    userRole,
    localStream,
    localStreamID,
    remoteStreamID,
    localUser,
    enterRoom,
    pushStream,
    outRoom,
    sendContactMessage,
    sendMessage,
    startMixer,
    zg,
    setDevices
} from "./common";

new VConsole();
var muteVideo = true; //是否关闭流画面，Boolean值
var isEnter = false; //是否进入房间
var roomID; //房间号

initSDK();


//监听:进入房间（推流）按钮
$('#btn-enter-push').click(async () => {
    roomID = $('#i_roomID').val() + '';
    if (isEmpty(roomID)) {
        alert('请输入对应的 roomID ');
    } else {
        isEnter = await enterRoom(localUser.userID, localUser.userName, roomID, userRole.anchor);
        if (isEnter) {
            pushStream(localStreamID);
        }
    }
});

//监听：进入房间按钮
$('#btn-enter-pull').click(async () => {
    roomID = $('#i_roomID').val() + '';
    if (isEmpty(roomID)) {
        alert('请输入对应的 roomID ');
    } else {
        isEnter = await enterRoom(localUser.userID, localUser.userName, roomID, userRole.viewer);
    }
});

//监听：退出房间按钮
$('#btn-out').click(() => {
    console.log(`outRoom：>>> ，传参前的localStream:${localStream}，传参前的localStreamID:${localStreamID}`);
    if (isEnter) {
        outRoom();
    } else {
        alert('未登录房间，无需退出!');
    }
});

//监听：消息发送按钮
$('#chat-fasong').click(async () => {
    let message = $('.div-textarea').text();
    sendMessage(message);
});

//监听：发起连麦按钮
$('#btn-start-contact').click(() => {
    let toID = $('#userList').val();
    if (toID != '') {
        sendContactMessage('contact', localStreamID, toID); //默认只能 从主播端发起，连麦邀请//否
    } else {
        alert(`发起连麦邀请，参数出错：toID：${toID}`);
    }
});

//目前只能两个人，逻辑需改变，待修复
$('#btn-start-mix').click(() => {
    startMixer();
});

//打开/关闭聊天框
$('.chatBtn').click(() => {
    $('.chatBox').toggle();
    $('.chatBox-kuang').toggle();
    $('#chatBox-content-demo').scrollTop($('#chatBox-content-demo')[0].scrollHeight); //聊天框默认最底部
});

//发起混音
$("#btn-audio-mixer").click(async () => {
    let audio1 = [$('#mix-audio')[0]];
    let re = zg.startMixingAudio(localStreamID, audio1);
    if (re) {
        let realyStream = 'zegotest-3212928334-' + localStreamID;
        zg.streamCenter.publisherList[realyStream].publisher.audioMixList[0].audioMix.gainNode.gain.value = 0.5;//此用于调节背景音 音量的内部对象，暂时性暴露，后续有修改的风险，慎用
    }
});

//字符是否为空
function isEmpty(str) {
    if (typeof str == null || str == "" || str == "undefined") {
        return true;
    } else {
        return false;
    }
}

//切换audio采集设备
$("#audioDeviceList").change(() => {
    if (localStream != null) {
        console.log(">>>>>>>>: " + $("#audioDeviceList").val());
        zg.useAudioDevice(localStream, $("#audioDeviceList").val());
    }
});

//切换video采集设备
$("#videoDeviceList").change(() => {
    if (localStream != null) {
        console.log(">>>>>>>>: " + $("#videoDeviceList").val());
        zg.useVideoDevice(localStream, $("#videoDeviceList").val());
    }
});