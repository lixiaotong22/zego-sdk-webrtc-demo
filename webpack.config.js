const HtmlWebpackPlugin = require('html-webpack-plugin');
// const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const internalIp = require('internal-ip');

module.exports = {
    entry: __dirname + "/src/index.js",//已多次提及的唯一入口文件
    output: {
        path: __dirname + "/dist",//打包后的文件存放的地方
        filename: "bundle.js"//打包后输出文件的文件名
    },
    devServer: {
        contentBase: "./dist",//本地服务器所加载的页面所在的目录
        historyApiFallback: true,//不跳转
        inline: true,//实时刷新
        https: true,
        host: internalIp.v4.sync(),
    },
    module: {
        rules: [
            {
                test: /\.css$/,   // 正则表达式，表示.css后缀的文件
                use: ['style-loader','css-loader']   // 针对css文件使用的loader，注意有先后顺序，数组项越靠后越先执行
            },
            { 
                test: /\.js$/, 
                exclude: /(node_modules)/,
                use: "babel-loader" 
            },
            {
                test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 10000, // 小于10000 ／ 1024 kb的字体会被url-loader压缩成base64格式
                            name: 'static/font/[name].[hash:7].[ext]', // 字体名字，7位哈希值，扩展名
                        },
                    },
                ],
            },
            {
                test: require.resolve('jquery'),
                loader: "expose-loader?jQuery!expose-loader?$"
            },
            {
                test: /\.(gif|png|jpe?g|svg|ico)$/i,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 8192,
                            name: './dist/img/[name].[ext]',
                            fallback: 'file-loader', //超过了限制大小调用回调函数
                            // outputPath: './dist/img', //图片存储的地址
                        },
                    },
                ],
            },
        ]
    },
    plugins:[
        new HtmlWebpackPlugin({
            // title:"登陆",  //生成的html title名字，在模板文件中用  <title><%= htmlWebpackPlugin.options.title %></title>调用即可
            // chunks:['/src/index.js'],  //引入entry中的key名字的js文件，此处为login，打包后html后会自动引入login.js文件
            filename: 'index.html', // dist目录下生成的html文件名
            template: 'src/index.html' // 我们原来的index.html路径，作为模板
        }),
        //new CleanWebpackPlugin(),
    ]
};