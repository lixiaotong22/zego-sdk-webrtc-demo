module.exports = {
    entry: __dirname + "/src/main.js",//已多次提及的唯一入口文件
    output: {
        path: __dirname + "/dist",//打包后的文件存放的地方
        filename: "bundle.js"//打包后输出文件的文件名
    },
    devServer: {
        contentBase: "./dist",//本地服务器所加载的页面所在的目录
        historyApiFallback: true,//不跳转
        inline: true//实时刷新
    },
    module: {
        rules: [
            { 
                test: /\.js$/, 
                exclude: /(node_modules)/,
                use: "babel-loader" 
            },
            {
                test: require.resolve('jquery'),
                loader: "expose-loader?jQuery!expose-loader?$"
            },
            {
                test: /\.(gif|png|jpe?g|svg)$/i,
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
    }
};