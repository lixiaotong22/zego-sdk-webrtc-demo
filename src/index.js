import $ from 'jquery'
import {
    ZegoExpressEngine
} from 'zego-express-engine-webrtc'
import flvjs from 'flv.js';
require("./css/chat.css");
require("./css/main.css");
require("./font_Icon/iconfont.css");
// require("./favicon.ico");
require("./assets/css/styles.min.css");
require("./assets/img/favicon.png");
require("./assets/bootstrap/css/bootstrap.min.css");
require("./assets/bootstrap/js/bootstrap.min.js");



const appID = 3293366674, // 必填，应用id，请从 即构管理控制台-https://console.zego.im/acount/register 或邮件中获取
    server = 'wss://webliveroom-test.zego.im/ws';
// appSigin = 'a8721f34e19651914d3e800ee1855973b842bdc4a3a432fd4c3f728ef0923d55', // appSigin为即构给客户分配的秘钥，请勿泄漏；（测试环境下是生成token的密码，必填，正式环境需要放到服务端）

const zg = new ZegoExpressEngine(appID, server);

//测试用的变量
// const roomID = '000000'; //房间号


//初始媒体流和角色，登录验证
var localStream = null;
var localStreamID = ''; //本地流ID
var remoteStream = null;
var remoteStreamID = '';//远端流ID
var eachUserID='';//与我连麦的用户ID，默认只有一个人，后面改成数组
var role;
var isEnter=false;

var userStreamList=new Array();//用户的流列表


//回调
zg.on('roomStateUpdate', (roomID, state, errorCode, extendedData) => {
    if (state == 'DISCONNECTED') {
        // 与房间断开了连接
        console.log('房间连接状态：', '与房间断开了连接');
    }

    if (state == 'CONNECTING') {
        // 与房间尝试连接中 
        console.log('房间连接状态：', '与房间尝试连接中');
    }

    if (state == 'CONNECTED') {
        // 与房间连接成功
        console.log('房间连接状态：与房间连接成功,roomID是：', roomID);
    }
})
//推拉流回调
zg.on('publisherStateUpdate', result => {
    //推流状态变更通知
    console.log('推流状态变更通知:', result);
})
zg.on('publishQualityUpdate', (streamID, stats) => {
    //推流质量
    console.log('推流质量:', stats);
})
zg.on('playerStateUpdate', result => {
    //处理拉流状态
    console.log('拉流状态：', result);
})
zg.on('playQualityUpdate', (streamID, stats) => {
    //拉流质量回调
    console.log('拉流质量：', stats);
})
/**
 * 需要更改拉流逻辑，连麦状态下，不拉取本地流
 */
zg.on('roomStreamUpdate', function (roomID, updateType, streamList) {
    //拉流更新回调
    console.log('房间流更新回调：', 'roomID : ' + roomID + '\n type： ' + updateType + '\n streamList:'+streamList);
    if (updateType == 'ADD') {
        console.info('开始遍历:>>>>>>>');
        for (let index = 0; index < streamList.length; index++) {
            const element = streamList[index];
            console.info(element.s + 'was add');
            userStreamList.push(element)
            pullStream(element.streamID);
        }
    }else if (updateType == 'DELETE') {
        for (let k = 0; k < userStreamList.length; k++) {
            for (let j = 0; j < streamList.length; j++) {
                if (userStreamList[k].streamID === streamList[j].streamID) {
                    try {
                        zg.stopPlayingStream(userStreamList[k].streamID);
                    } catch (error) {
                        console.error(error);
                    }

                    console.info(userStreamList[k].streamID + 'was devared');

                    userStreamList.splice(k, 1);

                    $('#vd_remote')[0].srcObject=null;

                    break;
                }
            }
        }
    }
})

/**获取token方法
 * 
 * appID为全局变量const，无需传参
 * userID是局部变量，每个人都有对应的唯一userID
 */
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
            console.log(typeof result);
            console.log('ajax调用成功，打印返回的result：:', result);
            token = result;
        }
    });
    console.log('获取token后：', token);
    return token;
}

/**进入房间方法
 *
 *    参数：userID和userName
 *    每一名用户在房间内的userID和userName都是唯一的，用户应结合业务场景，自己实现如何获取uesrID和userName
 */
async function enterRoom(userID, userName,roomID) {
    //获取token
    let token = getToken(userID);

    console.log('登录房间，传参前的值：>>>>>>', 'userID:' + userID + '>>>>>>' + 'userName:', +userName);
    //登录房间
    let result = await zg.loginRoom(roomID, token, {
        userID,
        userName
    },{
        userUpdate:true,
        maxMemberCount:0
    });
    return result;
}

/**退出房间方法
 * 
 * 未完成的方法，此处应传入一个房客的身份。主播端需进行停止推流，销毁本地流，再退出房间。观众端只需停止拉流，然后退出房间即可。
 */
async function outRoom() {
    console.log('返回isContact是否连麦状态：>>>>>>>>>>',isContact());
    if(isContact()){//连麦模式下
        zg.stopPlayingStream(remoteStreamID);
        let remoteVideo = $('#vd_remote')[0];
        remoteVideo.srcObject = null;
        //通知别人停止拉我的流
        console.log('要通知退出房间的连麦用户uID：>>>>>>>>',eachUserID);
        await sendContactMessage('stop',localStreamID,eachUserID);
        //停止推拉流，并清理相关状态,销毁流
        await zg.stopPublishingStream(localStreamID);
        await zg.destroyStream(localStream);
        let previewVideo = $('#vd_preview')[0];
        previewVideo.srcObject = null;
    }else{//非连麦模式
        if (role == userRole.anchor) { //是主播
            //停止推拉流，并清理相关状态,销毁流
            await zg.stopPublishingStream(localStreamID);
            await zg.destroyStream(localStream);
            let previewVideo = $('#vd_preview')[0];
            previewVideo.srcObject = null;
        } else {//是观众
            console.log('是观众调试点>>>>>>>>>>>>>>>');
            zg.stopPlayingStream(remoteStreamID);
            let remoteVideo = $('#vd_remote')[0];
            remoteVideo.srcObject = null;
        }
    }
    //登出房间
    zg.logoutRoom(roomID);
}

/**
 * 推流方法，push
 * @param {用户ID，每个房间内唯一} userID 
 * @param {用户名，房间内唯一} userName 
 */
async function pushStream(streamID) {
    // 创建本地流，camera对象可不传，不传则采用默认设置
    localStream = await zg.createStream({
        source:{
        camera: {
            video: true,
            audio: true,
        },}
    })
    console.log('获取媒体流：>>>>', localStream);
    console.log(typeof localStream);

    //<video>：预览渲染
    let previewVideo = $('#vd_preview')[0];
    previewVideo.srcObject = localStream;
    console.log('打印previewVideo的数据', previewVideo);

    //开始推流
    let re=zg.startPublishingStream(streamID, localStream);
    return re;//返回推流结果
}

/**
 * 拉流方法，pull
 * @param {用户ID，每个房间内唯一} userID 
 * @param {用户名，房间内唯一} userName 
 */
async function pullStream(streamID) {
        console.log('开始拉流：>>>>');
        //拉流
        remoteStream = await zg.startPlayingStream(streamID, {
            playOption: {
                video: false,
                audio: true
            },
        });

        //<video>:渲染播放mediaStream数据
        let remoteVideo = $('#vd_remote')[0];
        remoteVideo.srcObject = remoteStream;
}

/**
 * 获取user的方法
 * 
 * user{userID,userName}
 */
function getUser() {
    let uID = 'uID' + parseInt(Math.random() * 190000 + 5000);
    let uName = 'uName' + parseInt(Math.random() * 190000 + 5000);
    return {
        userID: uID,
        userName: uName
    }
}

/**
 * 定义用户角色的JSON对象，实现枚举效果
 */
const userRole = {
    anchor: 0,
    viewer: 1
};

/**
 * 房间弹幕消息,回调方法
 * 
 */
zg.on('IMRecvBarrageMessage', (roomID, chatData) => {
    console.log('IMRecvBroadcastMessage', roomID, chatData);

    var inputMessage = chatData[0].message;
    console.log('接收消息回调，打印数据：  》》》》》 ', '\n' + inputMessage);
    const chatBox = `
    <div class="clearfloat">
      <div class="author-name"><small class="chat-date">${new Date().toLocaleString()}</small></div>
      <div class="left">
          <div class="chat-avatars"><img src="${require('./img/icon01.png')}" alt="头像"></div>
          <div class="chat-message">${chatData[0].message}</div>
      </div>
    </div>
    `;
    //发送消息
    $('.chatBox-content-demo').append(chatBox);
});

/**
 * 自定义消息，回调
 * 
 * 实现连麦功能
 */
zg.on('IMRecvCustomCommand', (roomID, fromUser, command) => {
    console.log('IMRecvCustomCommand:>>>>>>>>>>>>>>>', roomID, fromUser, command);
    if (command.operation == 'stop') { //收到通知停止拉流
        zg.stopPlayingStream(remoteStreamID);
        let remoteVideo = $('#vd_remote')[0];
        remoteVideo.srcObject = null;
    } else {
        var re = confirm(fromUser.userID + ':邀请你连麦，是否同意？')
        if (re) {
            if (role == userRole.viewer) { //同意连麦，且是观众端
                localStreamID = 's' + parseInt(Math.random() * 190000 + 10000); //自动生成,观众端的推流ID
                console.log('打印自动生成的推流streamID:>>>>', localStreamID);
                pushStream(localStreamID);
                sendContactMessage('',localStreamID, fromUser.userID);
                eachUserID = fromUser.userID;
                console.log('观众连麦的主播，uID：>>>>>',eachUserID);
            } else { //是主播端的
                remoteStreamID = command.streamID; //command是对应角色的streamID
                pullStream(remoteStreamID);
                eachUserID = fromUser.userID;
                console.log('主播连麦的观众，uID：>>>>>',eachUserID);
            }
        }
    }
});

/**
 * 判断是否处于连麦模式
 * 
 * 返回Boolean值
 * 默认已登录
 */
function isContact(){
    if (remoteStreamID == ''){
        return false;
    }else{
        return true;
    }
}

















const localUser=getUser();
var roomID;

/**
 * 监听:进入房间（推流）按钮
 */
$('#btn-enter-push').click(async function () {
    roomID = $('#i_roomID').val()+'';
    if(isEmpty(roomID)){
        alert('请输入对应的 roomID ');
    }else{
        console.log('获取的user:>>>>', localUser.userID+'\t'+localUser.userName);

        role = userRole.anchor;
        localStreamID='s'+parseInt(Math.random() * 190000 + 10000);//自动生成
        console.log('打印自动生成的推流streamID:>>>>',localStreamID);
    
        isEnter = await enterRoom(localUser.userID,localUser.userName,roomID);
        if(isEnter){
            pushStream(localStreamID);
        }
    }
});

/**
 * 监听：退出房间按钮
 */
$('#btn-out').click(function () {
    console.log('打印当前用户角色：>>>>>', role)
    console.log('退出房间方法，传参前的localStream:>>>>>>>>', localStream);
    console.log('退出房间方法，传参前的localStream:>>>>>>>>', localStreamID);
    outRoom();
});

/**
 * 监听：拉流按钮
 */
$('#btn-enter-pull').click(async function () {
    roomID = $('#i_roomID').val()+'';
    if(isEmpty(roomID)){
        alert('请输入对应的 roomID ');
    }else{
        console.log('获取的user:>>>>', localUser.userID + '\t' + localUser.userName);
        role = userRole.viewer; //设置角色为观众
    
        isEnter = await enterRoom(localUser.userID, localUser.userName,roomID);
    }
});

/**
 * 监听：消息发送按钮
 */
$('#chat-fasong').click(async function () {
    let message = $('.div-textarea').text();
    console.log('监听事件，需要发送的信息：>>>>>>', message);
    // try {
    const isSent = await zg.sendBarrageMessage(roomID, message);
    console.log('打印接收的Message：>>>  ', message);
    console.log('>>> sendMsg success, ', isSent);
    $('.chatBox-content-demo').append(`
             <div class="clearfloat">
            <div class="author-name">
                <small class="chat-date"> ${new Date().toLocaleString()}</small>
            </div>
            <div class="right">
                <div class="chat-message"> ${message} </div>
                <div class="chat-avatars">
                    <img src="${require('./img/icon02.png')}" alt="头像" />
                </div>
            </div>
            </div>`);

    //发送后清空输入框
    $('.div-textarea').html('');
    //聊天框默认最底部
    $('#chatBox-content-demo').scrollTop($('#chatBox-content-demo')[0].scrollHeight);
});

/**
 * 监听：发起连麦按钮
 */
$('#btn-start-contact').click(function () {
    let toID = $('#userList').val();
    console.log('获取到的toID:>>>>>',toID);
    if(toID=='')
        alert('发送邀请的用户ID为空，请重新选择连麦用户：');
    //默认是从主播端发起，连麦邀请
    //主播不用传streamID
    sendContactMessage('','',toID);
});

/**
 * 发送自定义消息方法,(基于IM信令实现混流)
 * 
 * @param {操作行为} opt 
 * @param {streamID} sID 
 * @param {接收信息的userID} toID 
 */
async function sendContactMessage(opt,sID,toID){
    let command={
        operation:opt,
        streamID:sID
    }
    try {
        const res = await zg.sendCustomCommand(roomID, command, [toID]);
        console.warn('send custom success >>>>>>>>>>' + res.errorCode)
    } catch (error) {
        console.error('发送失败：>>>>>>>',JSON.stringify(error))
    }
}

/**
 * 目前只能两个人，逻辑需改变，待修复
 */
$('#btn-start-mix').click(async () => {
    const taskID = 'tid7788';
    const mixStreamID = 'mixID'+parseInt(Math.random() * 190000 + 10000);//自动生成混流ID
    const streamList = [{ //传入需要混流的原本流数据
            streamID: localStreamID,
            contentType: 'VIDEO',
            layout: {
                top: 0,
                left: 0,
                bottom: 240,
                right: 320,
            }
        },
        {
            streamID: remoteStreamID,
            contentType: 'VIDEO',
            layout: {
                top: 240,
                left: 0,
                bottom: 480,
                right: 320,
            }
        },
    ];
    try {
        console.log('开始混流命令前，传参：>>>>>>>>>',taskID+'\t'+streamList[0].streamID+'\t'+streamList[0].contentType+'\t'+streamList[0].layout+'\t'+mixStreamID);
        const res = await zg.startMixerTask({
            taskID: taskID,
            inputList: streamList,
            outputList: [
                mixStreamID, //混流后的流名，streamID
            ],
            outputConfig: {
                outputBitrate: 300,
                outputFps: 15,
                outputWidth: 320,
                outputHeight: 480,
            },
        });
        console.log('打印混流命令的结果：>>>>>>>>',res);
        if (res.errorCode == 0) {
            // $('#stopMixStream').removeAttr('disabled');
            const result = JSON.parse(res.extendedData).mixerOutputList;
            // alert('获取结果:>>>>>>>' + result);
            console.log('获取结果:>>>>>>>', result[0].streamID);

            console.log('开始播放混流后的flv：>>>>');
            //播放flv
            if (res.errorCode == 0) {
                const flvUrl = result[0].flvURL.replace('http', 'https');
                console.log('flvUrl:>>>>>>>>>>>>>>  ',flvUrl);
                if (flvjs.isSupported()) {
                    let flvPlayer = flvjs.createPlayer({
                        type: 'flv',
                        url: flvUrl,
                    });
                    flvPlayer.attachMediaElement($('#vd_mix')[0]);
                    flvPlayer.load();
                }
            }
            
        }
    } catch (err) {
        alert('混流失败。。。');
        console.error('err: ', err);
    }
});

var localUserList=new Array();
//房间用户进出回调
zg.on('roomUserUpdate', (roomID, updateType, userList) => {
    console.warn(
        `roomUserUpdate: room ${roomID}, user ${updateType === 'ADD' ? 'added' : 'left'} `,
        JSON.stringify(userList),
    );
    if (updateType === 'ADD') {
        userList.forEach(user => {//这里逻辑待改进
            localUserList.push(user);
        });
    } else if (updateType === 'DELETE') {//这里逻辑待改进
        userList.forEach(user => {
            localUserList = localUserList.filter(item => item.userID !== user.userID);
        });
    }
    let userListHtml = '';
    console.warn('走到这里了',localUserList[0].userID);
    localUserList.forEach(user => {
        console.warn('走进来了',user);
        //这部分逻辑待修改
        user.userID !== localUser.userID && (userListHtml += `<option value= ${user.userID}>${user.userName}</option>`);
    });
    $('#userList').html(userListHtml);
});

function isEmpty(str) {
    if(typeof str== null || str== "" || str== "undefined") {
        return true;
    } else {
        return false;
    }
}