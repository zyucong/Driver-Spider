'use strict';
var http = require('http');
var cheerio = require('cheerio');
var url = 'http://www.imooc.com/learn/348';
/*
[{
    chapterTitle: '',
    videos: [
        title: '',
        id: ''
    ]
}]
*/

function filterChapter (html) {
    var $ = cheerio.load(html);
    var chapters = $('.chapter');
    // var test = $('.chapter').text();
    // console.log(test);
    var courseData = [];
    chapters.each( function() {
        var chapter = $(this);
        var chapterRaw = chapter.find('strong').text().trim();
        var chapterTitle = chapterRaw.split('\n');
        var chapterIntro = chapterTitle[chapterTitle.length - 1].trim();
        chapterTitle = chapterTitle[0] + '\n' + chapterIntro;
        // console.log(chapterTitle);
        var chapterData = {
            chapterTitle: chapterTitle,
            videos: []
        };
        var videos = chapter.find('a');
        videos.each( function (){
            var video = $(this);
            var videoTitle = video.text().trim().split('\n');
            videoTitle = videoTitle[0] + videoTitle[1].trim()
            // console.log(videoTitle);
            var id = video.attr('href').split('/')[2];
            // console.log(id);
            chapterData.videos.push({
                title: videoTitle,
                ids: id
            })
        });
        courseData.push(chapterData);
    });
    return courseData;
}

function printInfo(course) {
    course.forEach(function(item){
       var chapterTitle = item.chapterTitle;
       console.log(chapterTitle + '\n');
       item.videos.forEach(function (item){
           var id = item.ids;
           var videoTitle = item.title;
           console.log('[' + id + ']' + videoTitle + '\n');
       })
    });
}

http.get(url, (res) => {
    let html = '';
res.on('data', (chunk) => html += chunk);
res.on('end', () => {
    // console.log(html);
    var course = filterChapter(html);
    printInfo(course);
});
}).on('error', function(e){
    console.log('error: ' + e.message);
});