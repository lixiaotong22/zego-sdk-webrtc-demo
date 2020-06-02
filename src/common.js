import {
    ZegoExpressEngine
} from 'zego-express-engine-webrtc'

const appID = 2452251574, // 必填，应用id，请从 即构管理控制台-https://console.zego.im/acount/register 或邮件中获取
    server = 'wss://webliveroom-test.zego.im/ws';
    // appSigin = 'a8721f34e19651914d3e800ee1855973b842bdc4a3a432fd4c3f728ef0923d55', // appSigin为即构给客户分配的秘钥，请勿泄漏；（测试环境下是生成token的密码，必填，正式环境需要放到服务端）


const zg = new ZegoExpressEngine(appID, server);

//测试用的变量
const roomID='000000';//房间号
const streamID='222223333333';//流ID

//回调方法
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
});

zg.on('publishQualityUpdate', (streamID, stats) => {
    //推流质量
    console.log('推流质量:', stats);
});
zg.on('playerStateUpdate', result => {
    //处理拉流状态
    console.log('拉流状态：',result);
});
zg.on('playQualityUpdate', (streamID, stats) => {
    //拉流质量回调
    console.log('拉流质量：',stats);
});
zg.on('roomStreamUpdate', function(roomID,type,streamList) {
    //拉流更新回调
    // alert('拉流更新回调：','roomID : '+roomID+', type： '+type+', streamList:'+streamList);
    console.log('拉流更新回调：','roomID : '+roomID+'\n type： '+type+'\n streamList:');
    console.log(streamList);
    var len=streamList.length;
    console.log('streamList 的长度：',len);
    for (let index = 0; index < len; index++) {
        const element = streamList[index];
        console.log(element);
    }
});



var token;
/* 获取token
    appID为全局变量const，无需传参
    userID是局部变量，每个人都有对应的唯一userID
*/ 
var getToken = async function (userID) {
    console.log('获取token前：',token);

        $.ajax({
            url: 'https://wsliveroom-alpha.zego.im:8282/token',
            data: {
                'app_id': appID,
                'id_name': userID
            },
            async: false,
            success: function (result) {
                console.log(typeof result);
                console.log('打印result：:', result);
                token = result;
            }
        });
    console.log('获取token后：',token);

    
    

};
var localStream;

//事件监听方法
$('#openbt').click(async function () {
    var userID = 'sampleID11111',
      userName = 'sampleUser11111';
    getToken(userID);

    console.log('推流时，登录房间，传参前的值：','');
    console.log('userID:',userID);
    console.log('userName:',userName);

    //登录房间
    const result = await zg.loginRoom(roomID, token, {
        userID,
        userName
    });
    // 创建流，camera对象可不传，不传则采用默认设置
    localStream = await zg.createStream({
        camera: {
            video: true,
            audio: false,
        },
    });
    console.log('获取媒体流：', localStream);
    console.log(typeof localStream);

    //<video>：预览渲染
    let previewVideo=$('#previewvd')[0];
    previewVideo.srcObject = localStream;
    console.log('打印previewVideo的数据',previewVideo);

    //开始推流
    var re=zg.startPublishingStream(streamID,localStream);
});

$('#closebt').click(async function () {
    //停止推拉流，并清理相关状态
    await zg.stopPublishingStream(streamID)
    zg.stopPlayingStream(streamID)
    zg.destroyStream(localStream)
    //登出房间
    zg.logoutRoom(roomID);
});

$('#playbt').click(async function () {
    var userID = 'sampleID22222',
      userName = 'sampleUser222222';
    getToken(userID);

    console.log('拉流时，登录房间，传参前的值：','');
    console.log('userID:',userID);
    console.log('userName:',userName);
    
    //拉流前，需先登录房间
    var re=await zg.loginRoom(roomID, token, { userID, userName }, { userUpdate: true });
    console.log('拉流时，房间登录状态：!!!!!!!!!!', re);

    //拉流
    const remoteStream = await zg.startPlayingStream(streamID);
    
    //<video>:渲染播放mediaStream数据
    let remoteVideo=$('#remotevd')[0];
    remoteVideo.srcObject = remoteStream;
});