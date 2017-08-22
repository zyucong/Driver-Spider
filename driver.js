'use strict';
let http = require('http');
// var Promise = require('bluebird');
let cheerio = require('cheerio');
let fs = require('fs')

const Config = {
    startPage: 1, //开始页码
    endPage: 1, //结束页码，不能大于当前图片类型总页码
    downloadImg: true, //是否下载图片到硬盘,否则只保存Json信息到文件
    downloadConcurrent: 10, //下载图片最大并发数
    currentImgType: "scy" //当前程序要爬取得图片类型,取下面AllImgType的Key。
};

// console.log(pageIds)
const AllImgType = { //网站的图片类型
    ecy: "http://tu.hanhande.com/ecy/ecy_", //二次元   总页码: 50
    scy: "http://tu.hanhande.com/scy/scy_", //三次元   总页码: 64
    cos: "http://tu.hanhande.com/cos/cos_", //cosPlay 总页码: 20
};
let albums = [];
for(let i = Config.startPage; i<= Config.endPage; i++){
    albums.push('http://tu.hanhande.com/cos/cos_' + i + '.shtml');
}
console.log(albums);

let getAlbumsAsync = function(url){
    return new Promise(function (resolve, reject) {
        console.log('Crawling albums: ' );
        let albums = [];
        http.get(url, function(res) {
            let content = '';
            res.on('data', function (chunk) {
                content += chunk;
            });
            res.on('end', function(){
                let $ = cheerio.load(content);
                $('.picList p a').each(function(){
                    let album = $(this);
                    albums.push({
                        albumURL: album.attr('href'),
                        imgList: []
                    });
                    // console.log(album.attr('href'));
                })
                resolve(albums);
            })
        }).on('error', (e)=>{
            console.log('error: '+ e.message);
            reject(e);
        });
    });
};

let getImageListAsync = function (albumsList) {
    return new Promise(function (resolve, reject) {
        console.log('Crawling pics: ' + albumsList);
        let url = albumsList;
        http.get(url, function(res) {
            let content = '';
            let imgList = []
            res.on('data', function (chunk) {
                content += chunk;
            });
            res.on('end', function(){
                let $ = cheerio.load(content);
                $('#picLists a img').each(function(){
                    let picList = $(this);
                    console.log(picList.attr('src'));
                    imgList.push(picList.attr('src'));
                });
                let albums = {
                    albumURL : url,
                    imgList : imgList
                }
                // console.log(albumsList);
                // console.log(albums)
                resolve(albums);
            })
        }).on('error', (e)=>{
            console.log('error: '+ e.message);
            reject(e);
        });

    });
};

let test = Promise
    .all(albums.map(getAlbumsAsync))
    .then(function(data){
        // console.log(data[0][0].albumURL)
        let albumList = [];
        data.map(function(page){
            let test_page = page.slice(1,6)
            test_page.map(function(album){
                albumList.push(album.albumURL);
            })
        })
        return Promise.all(albumList.map(getImageListAsync));
        // return Promise.all(data.map(getImageListAsync))
    })
    .then(function (albumList) {
        let folder = `json-${Config.currentImgType}-${Config.startPage}-${Config.endPage}`
        fs.mkdirSync(folder);
        let filePath = `./${folder}/${Config.currentImgType}-${Config.startPage}-${Config.endPage}.json`;
        fs.writeFileSync(filePath, JSON.stringify(albumList));
        // console.log(albumList);
    })

/*
let actions = albums.map(getAlbumsAsync);
let results = Promise.all(actions);
results.then(function(data){
    console.log(data);
})*/
