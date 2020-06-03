import {
    ZegoExpressEngine
} from 'zego-express-engine-webrtc'

// require("./css/chat.css");
// require("./font_Icon/iconfont.css");

const appID = 2452251574, // 必填，应用id，请从 即构管理控制台-https://console.zego.im/acount/register 或邮件中获取
    server = 'wss://webliveroom-test.zego.im/ws';
// appSigin = 'a8721f34e19651914d3e800ee1855973b842bdc4a3a432fd4c3f728ef0923d55', // appSigin为即构给客户分配的秘钥，请勿泄漏；（测试环境下是生成token的密码，必填，正式环境需要放到服务端）


const zg = new ZegoExpressEngine(appID, server);

//测试用的变量
const roomID = '000000'; //房间号
const streamID = '222223333333'; //流ID

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
zg.on('roomStreamUpdate', function (roomID, type, streamList) {
    //拉流更新回调
    console.log('拉流更新回调：', 'roomID : ' + roomID + '\n type： ' + type + '\n streamList:');
    console.log(streamList);
    var len = streamList.length;
    console.log('streamList 的长度：', len);
    for (let index = 0; index < len; index++) {
        const element = streamList[index];
        console.log(element);
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
async function enterRoom(userID, userName) {
    //获取token
    let token = getToken(userID);

    console.log('登录房间，传参前的值：>>>>>>', 'userID:' + userID + '>>>>>>' + 'userName:', +userName);
    //登录房间
    let result = await zg.loginRoom(roomID, token, {
        userID,
        userName
    });
    return result;
}

/**退出房间方法
 * 
 * 未完成的方法，此处应传入一个房客的身份。主播端需进行停止推流，销毁本地流，再退出房间。观众端只需停止拉流，然后退出房间即可。
 */
async function outRoom(localStream) {
    //停止推拉流，并清理相关状态
    await zg.stopPublishingStream(streamID);
    zg.stopPlayingStream(streamID);
    zg.destroyStream(localStream);
    //登出房间
    zg.logoutRoom(roomID);
}

/**
 * 推流方法，push
 * @param {用户ID，每个房间内唯一} userID 
 * @param {用户名，房间内唯一} userName 
 */
async function pushStream(userID, userName) {
    let isEnter = await enterRoom(userID, userName);
    if (isEnter) {//success
        // 创建本地流，camera对象可不传，不传则采用默认设置
        let localStream = await zg.createStream({
            camera: {
                video: true,
                audio: false,
            },
        });
        console.log('获取媒体流：>>>>', localStream);
        console.log(typeof localStream);
        //<video>：预览渲染

        let previewVideo = $('#vd_preview')[0];
        previewVideo.srcObject = localStream;
        console.log('打印previewVideo的数据', previewVideo);

        //开始推流
        zg.startPublishingStream(streamID, localStream);

        return localStream; //返回本地流mediaStream数据
    } else {
        console.log('进入房间失败，请检查后，重试>>>>');
        return null;
    }

}

/**
 * 拉流方法，pull
 * @param {用户ID，每个房间内唯一} userID 
 * @param {用户名，房间内唯一} userName 
 */
async function pullStream(userID, userName) {
    let isEnter =await enterRoom(userID, userName);
    if (isEnter) { //success
        console.log('开始拉流：>>>>');
        //拉流
        const remoteStream = await zg.startPlayingStream(streamID);

        //<video>:渲染播放mediaStream数据
        let remoteVideo = $('#vd_remote')[0];
        remoteVideo.srcObject = remoteStream;
        return true;
    } else {
        console.log('登录房间出错，拉流未执行：>>>>');
        return false;
    }
}


function getUser(){
    let uID='uID'+parseInt(Math.random()*190000+5000);
    let uName='uName'+parseInt(Math.random()*190000+5000);
    return {
        userID:uID,
        userName:uName
    }
}


var localStream;
//事件监听方法
$('#bt_push').click(function () {
    let user=getUser();
    console.log('获取的user:>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>',user);
    console.log('获取的user:>>>>>>>>>>>>>>>>>>>>\n>>>>>>>>>>>>>>>>>>>>>>\n>>>>>>>>>>>>>>');

    localStream = pushStream(user.userID, user.userName);
});
$('#bt_out').click(function () {
    outRoom(localStream);
});
$('#bt_pull').click(function () {
    let user=getUser();
    console.log('获取的user:>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>',user);
    console.log('获取的user:>>>>>>>>>>>>>>>>>>>>\n>>>>>>>>>>>>>>>>>>>>>>\n>>>>>>>>>>>>>>');

    pullStream(user.userID, user.userName);
});


//房间消息,回调方法
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

//监听发送按钮的点击事件
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
 * 自定义消息按钮，点击事件监听
 */
$('#bt_custom_message').click(async function () {
    let uID =$('#i_rev_user').val()+'';

    let message = $('.div-textarea').text();
    console.log('自定义消息按钮，监听事件，需要发送的信息：>>>>>>', message);
    try {
        const res = await zg.sendCustomCommand(roomID, message, [uID]);
        console.warn('send custom success >>>>>>>>>>' + res.errorCode)
    } catch (error) {
        console.error(JSON.stringify(error))
    }

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
    $('#i_rev_user').val('');
    //聊天框默认最底部
    $('#chatBox-content-demo').scrollTop($('#chatBox-content-demo')[0].scrollHeight);
});

/**
 * 自定义消息的回调
 */
zg.on('IMRecvCustomCommand', (roomID, fromUser, command) => {
    console.log('IMRecvCustomCommand:>>>>>>>>>>>>>>>',roomID, fromUser, command);
    let message = '\n ID:' +fromUser.userID+
            '\n name:'+ fromUser.userName+
            '\n content: '+command + '(自定义发送)';
    
    console.log('收到自定义的消息，打印数据：>>>>>>>>>>>>> ', '\n' + message);

    const chatBox = `
    <div class="clearfloat">
      <div class="author-name"><small class="chat-date">${new Date().toLocaleString()}</small></div>
      <div class="left">
          <div class="chat-avatars"><img src="${require('./img/icon01.png')}" alt="头像"></div>
          <div class="chat-message">${message}</div>
      </div>
    </div>
    `;

    //发送消息
    $('.chatBox-content-demo').append(chatBox);
});