import $ from 'jquery'
import flvjs from 'flv.js';
import {
    ZegoExpressEngine
} from 'zego-express-engine-webrtc'

const appID = 3212928334, // 必填，appID
    server = 'wss://webliveroom-test.zego.im/ws',
    LogUrl = 'wss://weblogger-test.zego.im/log';

//初始媒体流和角色，登录验证
var localStream = null;
var localStreamID = 's' + parseInt(Math.random() * 190000 + 10000); //本地推流ID
var remoteStream = null;
var remoteStreamID = ''; //远端流ID
var eachUserID = ''; //与我连麦的用户ID，默认只有一个人，后面改成数组

var userStreamList = new Array(); //用户的流列表
var localUserList = new Array(); //房间内的用户列表
const localUser = getUser(); //获取本地用户
var roomID; //房间号
const userRole = { //定义用户角色的JSON对象，js实现枚举效果
    anchor: 0,
    viewer: 1
};
var msgCount = 0; //消息总数
var role; //用户角色

const zg = new ZegoExpressEngine(appID, server); //zego引擎对象
zg.setLogConfig({
    logLevel: 'debug',
    logURL: LogUrl,
    remoteLogLevel: 'debug',
});

function initSDK() {
    $(".head-div").append(`<img class="border rounded-circle border-primary" src="${require('./assets/img/favicon.png')}" 
                style="margin-right: 0px;margin-left: 190px;padding-right: 0px;padding-left: 0px;">`);

    //房间状态更新回调
    zg.on('roomStateUpdate', (roomID, state, errorCode, extendedData) => {
        console.warn(`roomStateUpdate, roomID：${roomID} state：${state}，errorCode：${errorCode}，extendedData:${JSON.stringify(extendedData)}`);
    })
    //房间用户进出回调
    zg.on('roomUserUpdate', (roomID, updateType, userList) => {
        console.warn(`roomUserUpdate, room: ${roomID}, user: ${updateType === 'ADD' ? 'added' : 'left'}, userList: ${JSON.stringify(userList)}`);
        if (updateType === 'ADD') {
            userList.forEach(user => { //这里逻辑待改进
                localUserList.push(user); //增加
            });
        } else if (updateType === 'DELETE') { //这里逻辑待改进
            userList.forEach(user => {
                localUserList = localUserList.filter(item => item.userID !== user.userID); //删除
            });
        }
        let userListHtml = '';
        localUserList.forEach(user => {
            //这部分逻辑待修改
            user.userID !== localUser.userID && (userListHtml += `<option value= ${user.userID}>${user.userName}</option>`);
        });
        $('#userList').html(userListHtml);
    })
    // 需要更改拉流逻辑，连麦状态下，不拉取本地流
    // 订阅拉流更新回调
    zg.on('roomStreamUpdate', (roomID, updateType, streamList) => {
        console.warn(`roomStreamUpdate, roomID: ${roomID} type: ${updateType} streamList: ${JSON.stringify(streamList)}`);
        if (updateType == 'ADD') {
            for (let index = 0; index < streamList.length; index++) {
                const element = streamList[index];
                userStreamList.push(element)
                pullStream(element.streamID);
            }
        } else if (updateType == 'DELETE') {
            for (let k = 0; k < userStreamList.length; k++) {
                for (let j = 0; j < streamList.length; j++) {
                    if (userStreamList[k].streamID === streamList[j].streamID) {
                        try {
                            zg.stopPlayingStream(userStreamList[k].streamID);
                        } catch (error) {
                            console.error(error);
                        }
                        userStreamList.splice(k, 1);
                        $('#vd_remote')[0].srcObject = null;
                        break;
                    }
                }
            }
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
    //监听自定义命令信令通知
    zg.on('IMRecvCustomCommand', async (roomID, fromUser, command) => {
        console.warn(`'IMRecvCustomCommand, roomID: ${roomID} fromUser: ${fromUser} command: ${JSON.stringify(command)}`);
        switch (command.operation) {
            case 'stop':
                if (remoteStreamID != '') {
                    await zg.stopPlayingStream(remoteStreamID);
                    let remoteVideo = $('#vd_remote')[0];
                    remoteVideo.srcObject = null;
                    remoteStreamID = '';
                    remoteStream = null;
                }
                break;

            case 'contact':
                if (role == userRole.viewer) {
                    // localStreamID = 's' + parseInt(Math.random() * 190000 + 10000); //自动生成,观众端的推流ID

                    pushStream(localStreamID);
                    sendContactMessage('contact', localStreamID, fromUser.userID);
                    eachUserID = fromUser.userID;
                    console.log('观众连麦的主播，uID：>>>>>', eachUserID);
                } else if (role == userRole.anchor) {
                    remoteStreamID = command.streamID; //command是对应角色的streamID
                    eachUserID = fromUser.userID;
                    console.log('主播连麦的观众，uID：>>>>>', eachUserID);
                }
                break;

            default:
                break;
        }
    })
    //房间消息通知
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

    //设置设备
    setDevices();
}

//获取token，需业务侧实现
function getToken(userID) {
    let token;
    $.ajax({
        url: 'https://wsliveroom-alpha.zego.im:8282/token', //获取token的接口，目前该接口，仅用于测试。实际业务场景中，需自己实现token的获取与鉴权
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

//判断是否处于连麦模式
//默认已登录，逻辑需修改
function isContact() {
    if (remoteStreamID != '' && localStreamID != '') {
        return true;
    } else {
        return false;
    }
}

//发送广播消息
async function sendMessage(message1) {
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

//发送自定义信令
async function sendContactMessage(opt, sID, toID) {
    console.log('获取到的toID:>>>>>', toID);
    let command = {
        operation: opt, //opt 执行的操作
        streamID: sID
    }
    try {
        const res = await zg.sendCustomCommand(roomID, command, [toID]);
        console.warn('send custom success >>>>>>>>>>' + JSON.stringify(res))
    } catch (error) {
        console.error('send custom failed >>>>>>>', JSON.stringify(err))
    }
}

//进入房间
async function enterRoom(userID, userName, roomID1, role1) {
    roomID = roomID1;
    role = role1;
    let token = getToken(userID); //获取token
    console.log(`loginRoom传参：>>>>>>', userID：${userID}，userName:${userName}`);
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
// 未完成的方法，此处应传入一个房客的身份。主播端需进行停止推流，销毁本地流，再退出房间。观众端只需停止拉流，然后退出房间即可。
async function outRoom() {
    console.log('返回isContact是否连麦状态：>>>>>>>>>>', isContact());
    if (isContact()) { //连麦模式下
        //停止拉流，清除连麦状态和拉流ID
        zg.stopPlayingStream(remoteStreamID);
        let remoteVideo = $('#vd_remote')[0];
        remoteVideo.srcObject = null;
        remoteStreamID = '';
        remoteStream = null;
        //通知别人停止拉我的流
        console.log('要通知退出房间的连麦用户uID：>>>>>>>>', eachUserID);
        await sendContactMessage('stop', localStreamID, eachUserID);
        //停止推流，并清理相关状态,销毁流
        await zg.stopPublishingStream(localStreamID);
        zg.destroyStream(localStream);
        let previewVideo = $('#vd_preview')[0];
        previewVideo.srcObject = null;
    } else { //非连麦模式
        if (localStreamID != '') { //推流端
            await sendContactMessage('stop', localStreamID, eachUserID); //通知观众停止拉流
            await zg.stopPublishingStream(localStreamID);
            zg.destroyStream(localStream);
            let previewVideo = $('#vd_preview')[0];
            previewVideo.srcObject = null;
        } else if (remoteStreamID != '') {
            zg.stopPlayingStream(remoteStreamID);
            let remoteVideo = $('#vd_remote')[0];
            remoteVideo.srcObject = null;
            remoteStreamID = '';
            remoteStream = null;
        }
    }
    zg.logoutRoom(roomID); //登出房间
}

//推流方法
async function pushStream(streamID) {
    let videoInputString = $("#videoDeviceList").val();
    console.log(`打印的推流streamID:>>>> ${streamID} ,videoInput: ${videoInputString}`);
    localStream = await zg.createStream({
        camera: { //camera对象可不传，不传则采用默认设置
            video: true,
            audio: true,
            videoInput:videoInputString,
            // videoQuality: 4,
            // width:480,
            // height:640,
            // frameRate:15,
            // bitrate:800,
        },
    })
    console.log(`localStream：>>>> ${JSON.stringify(localStream)}`);
    //<video>：预览渲染
    let previewVideo = $('#vd_preview')[0];
    previewVideo.srcObject = localStream;
    //开始推流
    let result = zg.startPublishingStream(streamID, localStream, );
    return result; //返回推流结果
}

//拉流方法
async function pullStream(streamID) {
    //拉流
    remoteStream = await zg.startPlayingStream(streamID, {
        playOption: {
            video: false,
            audio: true
        },
    });
    console.log('>>>>>>' + remoteStream.active + remoteStream.id + ':::' + remoteStream.onaddtrack + '>' + remoteStream.onremovetrack)
    //<video>:渲染播放mediaStream数据
    //改进为动态创建video标签，播放
    let remoteVideo = $('#vd_remote')[0];
    // let remoteVideo=document.createElement('video');
    // remoteVideo.autoplay="true";
    remoteVideo.srcObject = remoteStream;
    // $('#video_div').append(remoteVideo);
}

async function startMixer() {
    let taskID = 'tid' + parseInt(Math.random() * 190000 + 10000);
    let mixStreamID = 'mixID' + parseInt(Math.random() * 190000 + 10000); //自动生成混流ID
    let inputList1 = [{ //传入需要混流的原本流数据
            streamID: localStreamID,
            contentType: 'VIDEO',
            layout: {
                top: 0,
                left: 0,
                bottom: 150,
                right: 200,
            }
        },
        {
            streamID: remoteStreamID,
            contentType: 'VIDEO',
            layout: {
                top: 0,
                left: 200,
                bottom: 150,
                right: 400,
            }
        },
    ];
    try {
        console.log('开始混流命令前，传参：>>>>>>>>>', taskID + '\t' + inputList1[0].streamID + '\t' + inputList1[0].contentType + '\t' + inputList1[0].layout + '\t' + mixStreamID);
        const res = await zg.startMixerTask({
            taskID: taskID,
            inputList: inputList1,
            outputList: [
                mixStreamID, //混流后的流名，mixStreamID
            ],
            outputConfig: {
                outputBitrate: 300,
                outputFps: 15,
                outputWidth: 500,
                outputHeight: 480,
            },
        });
        if (res.errorCode == 0) {
            const result = JSON.parse(res.extendedData).mixerOutputList;
            console.log('获取结果:>>>>>>>', JSON.stringify(result));
            console.log('开始播放混流后的flv：>>>>');
            //播放flv
            const flvUrl = "https://hdl-wsdemo.zego.im/miniapp/" + result[0].flvURL;
            console.log('flvUrl:>>>>>>>>>>>>>>  ', flvUrl);
            if (flvjs.isSupported()) {
                let flvPlayer = flvjs.createPlayer({
                    type: 'flv',
                    url: flvUrl,
                });
                let vd_mix = document.createElement('video'); //创建一个video标签
                vd_mix.autoplay = "true";
                vd_mix.controls = "true";
                $("#video_div").append(vd_mix);
                flvPlayer.attachMediaElement(vd_mix);
                flvPlayer.load();
            }
        }
    } catch (err) {
        alert('混流失败。。。');
        console.error('err: ', err);
    }
}

export {
    initSDK,
    userRole,
    localStreamID,
    localStream,
    localUser,
    zg,
    pushStream,
    enterRoom,
    outRoom,
    sendContactMessage,
    sendMessage,
    startMixer,
    setDevices
}

async function setDevices() {
    var devicesInfo = await zg.enumDevices();
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