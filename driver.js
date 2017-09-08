'use strict';

const http = require('http')
const fs = require('fs')
const path = require('path')
const cheerio = require('cheerio')
const async = require('async')

const CONFIG = {        //能改变程序执行结果的参数都在这里
    startPage: 9,   //开始页码
    endPage: 9,     //结束页码，不能小于开始页码
    currentImgType: 'scy',  //要下载的图片类型，详见下面的IMGTYPE
    download: true,     //是否下载图片，否的话只保存JSON文件
    downloadDelay: 1    //每次下载之间的最大可能间隙
}

const IMGTYPE = {
    ecy: 'http://tu.hanhande.com/ecy/ecy_',     //二次元
    scy: 'http://tu.hanhande.com/scy/scy_',     //三次元
    cos: 'http://tu.hanhande.com/cos/cos_'      //COS
}

const folderJSON = 'data'
if(!fs.existsSync(folderJSON)){     //新建一个文件夹之前你首先也要判断
    fs.mkdirSync(folderJSON)
}
const folderIMG = 'img'
if(!fs.existsSync(folderIMG)){
    fs.mkdirSync(folderIMG)
}

let jsonFileName = '/' + CONFIG.currentImgType + '-' + CONFIG.startPage + '-' + CONFIG.endPage + '.json'
let pageList = []
let currentType = IMGTYPE[CONFIG.currentImgType]
for(let i = CONFIG.startPage; i <= CONFIG.endPage; i++){
    pageList.push(currentType + i + '.shtml')
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

// const CONCUR = 5
// let concurrency = 0

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
                fs.writeFile(folderIMG + '/' + path.basename(url),data,'binary',function (err){    //保存的图片文件名取URL最后一个斜杠之后的信息
                    if(err){
                        return console.log(err)
                    }
                    let callbackTime = (Math.random() + '0').substr(2,3) * CONFIG.downloadDelay     //不定时callback
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
                saveData(allData)
                resolve(picsList)
            }).on('error', function (err) {
                console.log(error)
            })
        })
    })
}

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