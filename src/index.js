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
    startMixer
} from "./common";

var muteVideo = true; //是否关闭流画面，Boolean值
var isEnter = false; //是否进入房间
var roomID; //房间号
// //初始媒体流和角色，登录验证
// var localStream = null;
// var localStreamID = ''; //本地流ID
// var remoteStream = null;
// var remoteStreamID = ''; //远端流ID
// var eachUserID = ''; //与我连麦的用户ID，默认只有一个人，后面改成数组




initSDK();
$(".head-div").append(`<img class="border rounded-circle border-primary" src="${require('./assets/img/favicon.png')}" 
                style="margin-right: 0px;margin-left: 190px;padding-right: 0px;padding-left: 0px;">`);


//监听:进入房间（推流）按钮flvjs
$('#btn-enter-push').click(async () => {
    roomID = $('#i_roomID').val() + '';
    if (isEmpty(roomID)) {
        alert('请输入对应的 roomID ');
    } else {
        // role = userRole.anchor; //设置角色为主播
        // localStreamID = 's' + parseInt(Math.random() * 190000 + 10000); //自动生成
        // console.log(`自动生成的推流streamID:>>>> ${localStreamID} `);
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
        // role = userRole.viewer; //设置角色为观众
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
    if (toID != '' /*&& role == userRole.anchor*/ ) {
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


//
$("#btn-stop-video").click(() => {
    zg.mutePublishStreamVideo(localStream, muteVideo);
    muteVideo = !muteVideo;
});

//字符是否为空
function isEmpty(str) {
    if (typeof str == null || str == "" || str == "undefined") {
        return true;
    } else {
        return false;
    }
}
