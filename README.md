# 运行
```shell
$ git clone https://github.com/zyucong/Driver-Spider.git
$ cd Driver-Spider
$ npm install
$ npm install cheerio
$ npm install --save async
$ node driver.js
```

基本功能：一键下载小姐姐
![下载结果演示](https://raw.githubusercontent.com/zyucong/MarkdownPhoto/master/2017/August/downloaded-img.PNG)

几个月之前在 [CNode](https://cnodejs.org/) 首页看到了一个帖子——[《扎心了，老铁！Node.js福利图爬虫》](https://cnodejs.org/topic/58ccd7149aa9bafe76762ac2)，介绍了血气方刚的楼主在某个晚上误打误撞点进入了某个福利图册网站，嫌弃只有刷新页面才能看到下一张图片的设定过于繁琐，写了个爬虫把所有福利图都爬到本地保存，方便以后阅览的故事。

那位老哥的代码实现使用了几个我没用过的库，他也在README里面说明他使用了Async Await进行并发控制，需要用到Node 7.6及以上版本，而我使用的是6.1*的LTS版，因此打算重新写一个自己能用能看懂的爬虫。可惜那段时间因为各种毕业的事情而分心乏术，最近竟然在谷歌搜到了那篇帖子，~~于是先写了个半成品。~~于是利用空余时间慢慢把坑填上了，用Node.js LTS版即可！

正所谓，技术改变开车~先放重点
[那位老哥的版本: https://github.com/nieheyong/HanhandeSpider](https://github.com/nieheyong/HanhandeSpider)
[我的版本: https://github.com/zyucong/Driver-Spider](https://github.com/zyucong/Driver-Spider)
[福利图网站点此](http://tu.hanhande.com/ecy/)

<!--more-->

# 使用的库
`cheerio`，在NodeJS端实现jQuery
`async`，实现串行下载（因为并发开车会崩）
```js
const http = require('http')
const fs = require('fs')
const path = require('path')
const cheerio = require('cheerio')
const async = require('async')
```

# 实现过程
## 网站结构分析
该网站的URL非常有规律，例如cosplay频道第3页的URL是`http://tu.hanhande.com/cos/cos_3.shtml`。如下列出，只要将URL中的`cos`替换为`ecy`和`scy`即可分别访问二次元和三次元频道。
```js
const IMGTYPE = {
    ecy: 'http://tu.hanhande.com/ecy/ecy_',     //二次元
    scy: 'http://tu.hanhande.com/scy/scy_',     //三次元
    cos: 'http://tu.hanhande.com/cos/cos_'      //COS
}
```
通过改变爬虫起始页和爬虫结束页参数，在代码运行前将所有要爬的页面链接push到一个数组中，方便之后Promise判断是否所有迭代任务已执行完毕。
```js
const CONFIG = {        //能改变程序执行结果的参数都在这里
    startPage: 6,   //开始页码
    endPage: 8,     //结束页码，不能小于开始页码
    currentImgType: 'scy',  //要下载的图片类型，详见IMGTYPE
    download: true,     //是否下载图片，否的话只保存JSON文件
    downloadDelay: 1    //每次下载之间的最大可能间隙
}

let pageList = []
let currentType = IMGTYPE[CONFIG.currentImgType]
for(let i = CONFIG.startPage; i <= CONFIG.endPage; i++){
    pageList.push(currentType + i + '.shtml')
}
```
## 获取图册和图片链接
![获取图册URL](https://raw.githubusercontent.com/zyucong/MarkdownPhoto/master/2017/August/album%20list.PNG)

了解了页码URL的规律之后，接下来研究如何获取页面中所有图册的URL。分析页面的HTML可知，所有的图册URL都在一个类名为`picList`的无序列表中，通过cheerio实现jQuery，设计好选择器，用each()方法遍历一波。可以轻易在DOM中获取图册URL信息。以下是获取指定页码范围内所有图册的代码：
```js
let getAlbumAsync = function (url) {
    return new Promise(function (resolve, reject) {
        console.log("Crawling Page: " + path.basename(url))
        http.get(url, function (res) {
            let html = ''
            let albums = []
            res.on('data', function (chunk) {
                html += chunk
            })
            res.on('end', function () {
                let $ = cheerio.load(html)
                $('.picList p a').each(function(){
                    let album = $(this).attr('href')
                    albums.push(album)
                })
                resolve(albums)
            })
        })
    })
}
```
![获取图片URL](https://raw.githubusercontent.com/zyucong/MarkdownPhoto/master/2017/August/picLists.PNG)

一页至多有24个图册，每个图册的图片数量不一，但好在图册页面的DOM也很有规律，图册中所有的图片都以缩略图的形式出现在一个类名为`picLists`的无序列表中。值得庆幸的是，缩略图并不是低清的预览图，分析网页HTML可知，它的src与上面显示大图的src是一致的，只不过设置了`width="100"的样式，显示成正方形小图。再次通过cheerio实现jQuery，遍历一波，又可以轻易在DOM中获取图册中所有图片的URL信息。以下是获取所有图册的所有图片URL代码：
```js
let allData = []
let getImageAsync = function (url) {
    return new Promise(function (resolve, reject) {
        console.log("Crawling Album: " + path.basename(url))
        http.get(url, function (res) {
            let html = ''
            let picsList = []
            res.on('data',function(chunk){
                html += chunk
            })
            res.on('end',function(){
                let $ = cheerio.load(html)
                $('#picLists a img').each(function(){
                    let picURL = $(this).attr('src')
                    picsList.push(picURL)
                    // downloadIMG(picURL)
                })
                allData.push(picsList)
                saveData(allData)		//每获取完一个图册里的所有图片URL，就把这些URL保存到json文件中
                resolve(picsList)
            }).on('error', function (err) {
                console.log(error)
            })
        })
    })
}
```


图片URL信息保存成功后的json文件格式是这样的，数据放在两层数组内，以图册为单位在第二层数组中分隔开，属于同一个图册的图片URL都放在同一个数组中。
```json
[
  [
    "http://www.hanhande.com/upload/170731/4182591_102713_6864.jpg",
    "http://www.hanhande.com/upload/170731/4182591_102714_4467.jpg",
    "http://www.hanhande.com/upload/170731/4182591_102716_7709.jpg",
    "http://www.hanhande.com/upload/170731/4182591_102717_3281.jpg",
    "http://www.hanhande.com/upload/170731/4182591_102718_1390.jpg",
    "http://www.hanhande.com/upload/170731/4182591_102720_7655.jpg",
    "http://www.hanhande.com/upload/170731/4182591_102721_5830.jpg",
    "http://www.hanhande.com/upload/170731/4182591_102723_1299.jpg"
  ],
  [
    "http://www.hanhande.com/upload/170802/4182591_110023_6051.jpg",
    "http://www.hanhande.com/upload/170802/4182591_110024_4289.jpg",
    "http://www.hanhande.com/upload/170802/4182591_110025_4553.jpg",
    "http://www.hanhande.com/upload/170802/4182591_110026_3622.jpg",
    "http://www.hanhande.com/upload/170802/4182591_110027_5706.jpg",
    "http://www.hanhande.com/upload/170802/4182591_110028_6381.jpg",
    "http://www.hanhande.com/upload/170802/4182591_110029_1284.jpg"
  ]
]
```
当时设想的是图册信息也要以这样的格式保存在json文件中，在第二层数组中把不同页面所在的图册分隔开，同一个页面的图册URL都放在同一个数组中。后来分析了一下觉得没有必要保存json文件，同一个图册有哪些图是固定的，同一个页面有哪几个图册是会随着新图册的上传而发生变化的。但是这样安排数据可以方便查看获取到的页面数，进行查验。


## 利用ES6特性避开回调地狱，完成所有操作
显而易见，爬虫是异步操作，只有获取到所有指定页面的图册链接后，才能执行获取所有图片URL的函数，只有成功获取了所有图片的URL后，才能下载图片。而不同页面的爬虫速度不可能一致，不同图册中图片数量不一，获取所有图片信息的速度显然更不同。上述过程至少需要走两次异步，后续如果要增加其他功能，异步过程只会更多。

这时就需要用到Promise对象的`Promise.all()`方法了，经实践，`Promise.all().then().all()`是行不通的。感谢万能的[StackOverflow](https://stackoverflow.com/questions/31413749/node-js-promise-all-and-foreach)，在`then()`方法中`return Promise.all()`，然后继续`then()`就可以继续异步回调下去了，逻辑清楚又可以避免回调地狱。

由于之前提及的两层数组的缘故，在执行下一步操作之前必须把之前获取到的所有URL放进同一个数组中，代码如下：
```js
let driver = Promise.all(pageList.map(getAlbumAsync))
    .then(function (albums) {
        let allAlbums = []
        albums.forEach(function (elem, index) {
            elem.forEach((function (item, index) {
                allAlbums.push(item)        //把所有的图片集URL放进一个数组里
            }))
        })
        // allAlbums = allAlbums.slice(0,20)
        // console.log(allAlbums)
        return Promise.all(allAlbums.map(getImageAsync))
    })
    .then(function (data) {
        let allPics = []
        if(CONFIG.download){
            data.forEach(function (elem, index) {
                elem.forEach(function (item, index) {
                    allPics.push(item)          //把所有的图片URL放进一个数组里
                })
            })
            downloadIMG(allPics)
        }
    })
```

## 保存图片URL至JSON文件
之前已经介绍过，每获取完一个图册里的所有图片URL，就执行saveData()函数，把这些URL保存到json文件中。使用了nodejs自带的File System，调用writeFile()方法，将图片URL数据异步写入JSON文件。
```js
const folderJSON = 'data'	//可自定义存储JSON文件的文件夹名
if(!fs.existsSync(folderJSON)){     //新建一个文件夹之前你首先也要判断
    fs.mkdirSync(folderJSON)
}
function saveData(pics){
    // fs.writeFile(folder + '/data.json', JSON.stringify(pics),function (err) {
    fs.writeFile(folderJSON + jsonFileName, JSON.stringify(pics),function (err) {
        if(err){
            return console.log(err)
        }
        console.log('Data Saved')
    })
}
```

## 保存图片至本地
图片的下载也是要用到`fs.writeFile()`方法，不同的是图片下载需要时间，短时间大量下载请求可能会玩坏它的服务器。为了~~不被封IP~~保护人家的服务器，需要做一个限流处理。我参考的那个老哥就是在这里用Async Await做的并发控制。但是我测试过发现即使并发数很小，程序执行时也很有可能会中途卡住不动，下载到一半就莫名停止，而且每次下载成功的图片数都不同，大概在下载到三百张左右的时候会出现这种情况，图片下载间隔调大也救不回来。可能是对面服务器扛不住，可能是对面有反爬机制。如果只用`async.mapSeries()`方法进行串行下载，一路走到底，基本没有下载到一半失败的。
```js
const folderIMG = 'img'		//同样得新建一个文件夹，与保存JSON的文件夹区分开
if(!fs.existsSync(folderIMG)){	//首先要判断，不要见得风是得雨
    fs.mkdirSync(folderIMG)
}
function downloadIMG(urls) {
    // async.mapLimit(urls, CONCUR, function (url, callback) {      //一并发就会炸
    async.mapSeries(urls, function (url, callback) {
        http.get(url,function (res) {
            let data = ''
            res.setEncoding('binary')
            // concurrency++
            console.log('downloading: '+ path.basename(url))
            res.on('data',function (chunk) {
                data += chunk
            })
            res.on('end',function () {
                fs.writeFile(folderIMG + '/' + path.basename(url),data,'binary',function (err){    //保存的图片文件名取URL最后一个斜杠之后的字符串
                    if(err){
                        return console.log(err)
                    }
                    let callbackTime = (Math.random() + '0').substr(2,3) * CONFIG.downloadDelay     //（这里是1秒）不定时callback
                    // console.log(callbackTime)
                    console.log('img downloaded: '+ path.basename(url))
                    setTimeout(function () {
                        // concurrency--
                        callback(null, url)
                    }, callbackTime)

                })
            })
        }).on('error',function (err) {
            console.log(err)
        })
    })
}
```
理论上这个callback是不需要延时的，但是这样中间留点时间也能让对面服务器喘口气，稍微开个并发就受不了我还真怕把它玩坏了……反正都到这一步了慢慢来吧，细水长流也不着急这点时间，心急看不了小姐姐。从运行时打印的中间过程来看，图片的保存确实是串行执行的。
```console
...
downloading: 4182591_103643_8735.jpg
img downloaded: 4182591_103643_8735.jpg
downloading: 4182591_103644_9846.jpg
img downloaded: 4182591_103644_9846.jpg
downloading: 4182591_103335_7194.jpg
img downloaded: 4182591_103335_7194.jpg
downloading: 4182591_103336_2650.jpg
img downloaded: 4182591_103336_2650.jpg
downloading: 4182591_103337_2009.jpg
img downloaded: 4182591_103337_2009.jpg
downloading: 4182591_103338_4705.jpg
img downloaded: 4182591_103338_4705.jpg
downloading: 4182591_103339_2888.jpg
img downloaded: 4182591_103339_2888.jpg
downloading: 4182591_103340_3767.jpg
img downloaded: 4182591_103340_3767.jpg
downloading: 4182591_103341_8366.jpg
img downloaded: 4182591_103341_8366.jpg
downloading: 4182591_103342_9570.jpg
img downloaded: 4182591_103342_9570.jpg
...
```

# 总结
这个网站像是那种右下角弹窗常见的网站，没什么原创内容，更新也慢。不过DOM有规律，缩略图其实就是原图这个设定让爬虫简单了不少，感谢。
跟原版相比，部分借鉴了那位老哥的代码逻辑，重写了爬虫实现的代码，适配了一下node.js LTS版，优化了用户体验，修改了一下数据保存的逻辑，放弃获取图册名保存到JSON文件里或作为图片文件名。首先原网页的编码是GB2312，直接获取中文文本会得到乱码，而且这些所谓的图册名无非就是“丰满”、“性感”、“唯美”这几个词轮着用，这些图也不是他们原创的，图册名也不重要，处理这个还得再整个库，之后的JSON格式还会变得复杂，没啥必要
还有每次保存的json文件名都不同，比如`scy-3-9.json`文件保存的就是三次元分类第3至第9页的图片URL信息，让你心里有点b数，知道哪几页存了。图片都保存在同一个文件夹里，方便查阅，不然每次下载的图片都放在不同的文件夹里看起来多费劲不是~
[完整代码  https://github.com/zyucong/Driver-Spider/blob/master/driver.js](https://github.com/zyucong/Driver-Spider/blob/master/driver.js)

# 参考资料
[Node.js官方文档](https://nodejs.org/dist/latest-v6.x/docs/api/)
[async官方文档--mapSeries方法](https://caolan.github.io/async/docs.html#mapSeries)