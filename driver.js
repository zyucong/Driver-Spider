'use strict';

const http = require('http')
const fs = require('fs')
const path = require('path')
const cheerio = require('cheerio')
const async = require('async')

let albumURL = 'http://tu.hanhande.com/cos/7042311.shtml'
let pageList = ['http://tu.hanhande.com/scy/scy_7.shtml','http://tu.hanhande.com/scy/scy_8.shtml']
let albumList = ['http://tu.hanhande.com/cos/7042311.shtml', 'http://tu.hanhande.com/cos/7042221.shtml']

function saveData(pics){
    let folder = 'data'
    if(!fs.existsSync(folder)){
        fs.mkdirSync(folder)
    }
    fs.writeFile(folder + '/data.json', JSON.stringify(pics),function (err) {
        if(err){
            return console.log(err)
        }
        console.log('Data Saved')
    })
}

function downloadIMG(urls) {
    let folder = 'img'
    if(!fs.existsSync(folder)){
        fs.mkdirSync(folder)
    }
    async.mapSeries(urls, function (url, callback) {
        http.get(url,function (res) {
            let data = ''
            res.setEncoding('binary')
            console.log('downloading: '+ path.basename(url))
            res.on('data',function (chunk) {
                data += chunk
            })
            res.on('end',function () {
                fs.writeFile(folder + '/' + path.basename(url),data,'binary',function (err){
                    if(err){
                        return console.log(err)
                    }
                    let callbackTime = (Math.random() + '0').substr(2,3) * 1
                    // console.log(callbackTime)
                    console.log('img downloaded: '+ path.basename(url))
                    setTimeout(function () {
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
                resolve(picsList)
                saveData(allData)
            }).on('error', function (err) {
                console.log(error)
            })
        })
    })
}

let test = Promise.all(pageList.map(getAlbumAsync))
    .then(function (albums) {
        let allAlbums = []
        albums.forEach(function (elem, index) {
            elem.forEach((function (item, index) {
                allAlbums.push(item)
            }))
        })
        // allAlbums = allAlbums.slice(0,20)
        // console.log(allAlbums)
        return Promise.all(allAlbums.map(getImageAsync))
    })
    .then(function (data) {
        let allPics = []
        // console.log(albumLength)
        data.forEach(function (elem, index) {
            elem.forEach(function (item, index) {
                allPics.push(item)
            })
        })
        downloadIMG(allPics)
        /*        async.mapSeries(allPics, function (pic, callback) {
                    console.log('downloading from: ' + path.basename(pic))
                    downloadIMG(pic)
                    setTimeout(function () {
                        callback(null, pic)
                    },1000)
                })*/
    })

