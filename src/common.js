import $ from 'jquery'
import {
    ZegoExpressEngine
} from 'zego-express-engine-webrtc'
import {
    appID,
    server,
    logUrl,
    generateToken
} from './appconfig'

//变量
var localStream = null;
var localStreamID = 's' + parseInt(Math.random() * 190000 + 10000); //本地推流ID
var taskID = "";
var isPublish = false;
var isPlay = false;
var isMixer = false;

var roomStreamList = new Array(); //房间的流列表
var msgCount = 0; //消息总数

const localUser = getUser(); //获取本地用户
const zg = new ZegoExpressEngine(appID, server); //zego引擎对象

function initSDK() {
    $(".head-div").append(`<img class="border rounded-circle border-primary" src="${require('./assets/img/favicon.png')}" 
                style="margin-right: 0px;margin-left: 190px;padding-right: 0px;padding-left: 0px;">`);
    //配置日志
    zg.setLogConfig({
        logLevel: 'debug',
        logURL: logUrl,
        remoteLogLevel: 'debug',
    });

    //房间状态更新回调
    zg.on('roomStateUpdate', (roomID, state, errorCode, extendedData) => {
        console.warn(`roomStateUpdate, roomID：${roomID} state：${state}，errorCode：${errorCode}，extendedData:${JSON.stringify(extendedData)}`);
    })
    //房间用户进出回调
    zg.on('roomUserUpdate', (roomID, updateType, userList) => {
        console.warn(`roomUserUpdate, room: ${roomID}, user: ${updateType === 'ADD' ? 'added' : 'left'}, userList: ${JSON.stringify(userList)}`);
    })
    // 订阅拉流更新回调
    zg.on('roomStreamUpdate', (roomID, updateType, streamList) => {
        console.warn(`roomStreamUpdate, roomID: ${roomID} type: ${updateType} streamList: ${JSON.stringify(streamList)}`);
        if (updateType == 'ADD') {
            streamList.forEach(streamInfo => {
                roomStreamList.push(streamInfo.streamID);
                pullStream(streamInfo.streamID);
            })
        } else if (updateType == 'DELETE') {
            streamList.forEach(streamInfo => {
                for (let i = 0; i < roomStreamList.length; i++) {
                    if (streamInfo.streamID === roomStreamList[i]) {
                        try {
                            zg.stopPlayingStream(streamInfo.streamID);
                            roomStreamList.splice(i, 1);
                        } catch (error) {
                            console.error(error);
                        }
                        let div = document.getElementById('div_remote');
                        let remoteVideo = document.getElementById('video_' + streamInfo.streamID);
                        div.removeChild(remoteVideo);
                        break;
                    }
                }
            })
        }
    })
    //订阅推流状态回调
    zg.on('publisherStateUpdate', result => {
        console.warn(`publisherStateUpdate, result:${JSON.stringify(result)}`);
    })
    // 订阅推流质量回调
    zg.on('publishQualityUpdate', (streamID, stats) => {
        console.warn(`publishQualityUpdate, streamID:${streamID}，stats：${JSON.stringify(stats)}`);
    })
    // 订阅拉流状态回调
    zg.on('playerStateUpdate', result => {
        console.warn(`playerStateUpdate, streamID：${result.streamID}，state：${result.state}，errorCode:${result.errorCode}，extendedData：${result.extendedData}`);
    })
    // 订阅拉流质量回调
    zg.on('playQualityUpdate', (streamID, stats) => {
        console.warn(`playQualityUpdate, streamID:${streamID}，${JSON.stringify(stats)}`);
    })
    //房间广播消息通知
    zg.on('IMRecvBroadcastMessage', (roomID, chatData) => {
        console.warn(`IMRecvBroadcastMessage, roomID: ${roomID} chatData: ${JSON.stringify(chatData)}`);

        var inputMessage = chatData[0].message;
        console.info('接收消息回调，打印数据：  》》》》》 ', '\n' + inputMessage);
        const chatBox = `
        <div class="clearfloat">
        <div class="author-name"><small class="chat-date">${new Date().toLocaleString()}</small></div>
        <div class="left">
            <div class="chat-avatars"><img src="${require('./assets/img/icon01.png')}" alt="头像"></div>
            <div class="chat-message">${chatData[0].message}</div>
        </div>
        </div>
        `;
        //发送消息
        $('.chatBox-content-demo').append(chatBox);
        msgCount++;
        $('.chat-message-num').text(msgCount);
        $('.chatBox').show();
        $('.chatBox-kuang').show();
    });

    //枚举设备
    setDevices();
}

//获取user，需业务侧实现
function getUser() {
    let uID = 'uID' + parseInt(Math.random() * 190000 + 5000);
    let uName = 'uName' + parseInt(Math.random() * 190000 + 5000);
    console.log(`getUser: userID；${uID} userName：${uName}`);
    return {
        userID: uID,
        userName: uName
    }
}

//发送广播消息
async function sendMessage(roomID, message1) {
    console.log(`sendMsg：>>>>>> message：${message1}`);
    let result1 = await zg.sendBroadcastMessage(roomID, message1);
    console.log(`'sendMsg：>>> result：${result1}`);
    $('.chatBox-content-demo').append(`
             <div class="clearfloat">
            <div class="author-name">
                <small class="chat-date"> ${new Date().toLocaleString()}</small>
            </div>
            <div class="right">
                <div class="chat-message"> ${message1} </div>
                <div class="chat-avatars">
                    <img src="${require('./assets/img/icon02.png')}" alt="头像" />
                </div>
            </div>
            </div>`);
    $('.div-textarea').html(''); //发送后清空msg输入框
    $('#chatBox-content-demo').scrollTop($('#chatBox-content-demo')[0].scrollHeight); //聊天框默认最底部
}

//枚举设备
async function setDevices() {
    $("#videoDeviceList").html('');
    $('#audioDeviceList').html('');

    var devicesInfo = await zg.enumDevices(); //枚举设备
    var camerasHTML = '',
        microphonesHTML = '';
    devicesInfo.cameras.forEach(element => {
        camerasHTML += `<option value= ${element.deviceID}>${element.deviceName}</option>`
    });
    devicesInfo.microphones.forEach(element => {
        microphonesHTML += `<option value= ${element.deviceID}>${element.deviceName}</option>`
    });
    $("#videoDeviceList").html(camerasHTML);
    $('#audioDeviceList').html(microphonesHTML);
}

//进入房间
async function enterRoom(userID, userName, roomID) {
    let token = generateToken(userID); //获取token
    //登录房间
    let result = await zg.loginRoom(roomID, token, {
        userID,
        userName
    }, {
        userUpdate: true,
        maxMemberCount: 0
    });
    return result;
}

//退出房间 
async function outRoom(roomID) {
    if (isMixer) {
        zg.stopMixerTask(taskID);
        $("#div_mix").html('');
        isMixer = false;
    }
    if (isPlay) {
        roomStreamList.forEach(streamID => {
            zg.stopPlayingStream(streamID);
        })
        $("#div_remote").html('');
        isPlay = false;
    }
    if (isPublish) {
        zg.stopPublishingStream(localStreamID);
        zg.destroyStream(localStream);
        document.getElementById('vd_preview').srcObject = null;
        localStream = null;
        isPublish = false;
    }
    zg.logoutRoom(roomID);
}

//推流方法
async function pushStream(streamID) {
    let videoInputString = $("#videoDeviceList").val();
    localStream = await zg.createStream({
        camera: { //camera对象可不传，不传则采用默认设置
            video: true,
            audio: true,
            videoInput: videoInputString
        }
    })

    let previewVideo = $('#vd_preview')[0];
    previewVideo.srcObject = localStream;

    let publishOption = {
        videoCodec: 'H264'
    }
    isPublish = zg.startPublishingStream(streamID, localStream, publishOption);
}

//拉流方法
async function pullStream(streamID) {
    //拉流
    let remoteStream = await zg.startPlayingStream(streamID, {
        video: true,
        audio: true,
        videoCodec: 'H264'
    });
    //<video>:渲染播放mediaStream数据
    let div = document.getElementById('div_remote');
    let remoteVideo = document.createElement('video');
    remoteVideo.id = "video_" + streamID;
    remoteVideo.autoplay = "true";
    remoteVideo.controls = "true";
    remoteVideo.srcObject = remoteStream;
    div.appendChild(remoteVideo);
    isPlay = true;
}

//发起混流任务
async function startMixer() {
    taskID = 'tid' + parseInt(Math.random() * 190000 + 10000);
    let mixStreamID = 'mixID' + parseInt(Math.random() * 190000 + 10000); //自动生成混流ID

    let inputList1 = new Array();
    let input = { //临时变量，输入流信息
        streamID: localStreamID,
        contentType: 'VIDEO',
        layout: {
            top: 0,
            left: 0,
            bottom: 150,
            right: 200,
        }
    };
    inputList1.push(input);

    var width = 200,
        height = 150;
    for (let i = 0; i < roomStreamList.length; i++) {
        let width_next = width + 200;
        input = {
            streamID: roomStreamList[i],
            contentType: 'VIDEO',
            layout: {
                top: 0,
                left: width,
                bottom: height,
                right: width_next,
            }
        };
        inputList1.push(input);
        width = width_next;
    }

    try {
        let res = await zg.startMixerTask({
            taskID: taskID,
            inputList: inputList1,
            outputList: [
                mixStreamID, //混流后的流名，mixStreamID
            ],
            outputConfig: {
                outputBitrate: 300,
                outputFps: 15,
                outputWidth: width,
                outputHeight: height,
            },
        });
        isMixer = true;
        return res;
    } catch (err) {
        console.error('发起混流任务失败  ', 'err: ', err);
        return "";
    }
}

export {
    localStreamID,
    localStream,
    localUser,
    zg,
    initSDK,
    pushStream,
    enterRoom,
    outRoom,
    sendMessage,
    startMixer,
    setDevices
}