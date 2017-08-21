const http = require('http');
// var Promise = require('bluebird');
const cheerio = require('cheerio');
let baseUrl = 'http://www.imooc.com/learn/'
const videoIds = [348,259,197,134,75]
/*
courseData = {
    courseTitle: '',
    content:[{
        chapterTitle: '',
        videos: [
            title: '',
            id: ''
        ]
    }]
}
 */
function filterChapter (html) {
    let $ = cheerio.load(html);
    let chapters = $('.chapter');
    let courseTitle = $('.hd').find('h2').text();
    let courseData = {
        courseTitle: courseTitle,
        content:[]
    };
    // var test = $('.chapter').text();
    // console.log(test);
    chapters.each( function() {
        let chapter = $(this);
        let chapterRaw = chapter.find('strong').text().trim();
        let chapterTitle = chapterRaw.split('\n');
        let chapterIntro = chapterTitle[chapterTitle.length - 1].trim();
        chapterTitle = chapterTitle[0] + '\n' + chapterIntro;
        // console.log(chapterTitle);
        let chapterData = {
            chapterTitle: chapterTitle,
            videos: []
        };
        let videos = chapter.find('a');
        videos.each( function (){
            let video = $(this);
            let videoTitle = video.text().trim().split('\n');
            videoTitle = videoTitle[0] + videoTitle[1].trim()
            // console.log(videoTitle);
            let id = video.attr('href').split('/')[2];
            // console.log(id);
            chapterData.videos.push({
                title: videoTitle,
                ids: id
            })
        });
        courseData.content.push(chapterData);
    });
    return courseData;
}

function printInfo(course) {
    course.forEach(function (item) {
        let courseTitle = item.courseTitle;
        console.log(courseTitle);
        item.content.forEach(function (content) {
            let chapterTitle = content.chapterTitle;
            console.log(chapterTitle + '\n');
            content.videos.forEach(function(video){
                console.log('[' + video.ids + ']' + video.title + '\n');
            })
        })
    });
}

function getPagesAsync(url){
    return new Promise( function(resolve, reject){
        console.log('crawling: '+ url);
        http.get(url, function(res){
            let content = ''
            res.on('data', (chunk)=>{
                content += chunk;
            });
            res.on('end',  () =>{
                resolve(content)
            })
        }).on('error', (e) => {
            reject(e);
            console.log('error: ' + e.message);
        })
    })
}
let fetchCourse = [];
videoIds.forEach( (t) => {
    fetchCourse.push(getPagesAsync(baseUrl + t));
})

Promise
    .all(fetchCourse)
    .then((pages)=>{
    let courseData = [];
    pages.forEach( (item) =>{
        let courses = filterChapter(item);
        courseData.push(courses);
    })
    printInfo(courseData);
})