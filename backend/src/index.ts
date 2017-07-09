import { Drive, Youtube } from "./drive";
import { config, configDir } from "./config";
import { query } from "./db";
import { writeFileSync, readFileSync } from "fs";
import { createHash } from "crypto";

// var drive = new Drive();
// drive.auth();
// drive.createFolder('foo').catch(err => console.error(err));
var youtube = new Youtube(configDir);
async function main() {
    await youtube.auth();
    for (var i = 0; i < 1000; i++) {
        var d = new Date();
        d.setDate(d.getDate() - i);
        await request(youtube, '', d);
    }
}

async function request(youtube: Youtube, pageToken: string, date: Date) {
    var afterDate = new Date(date.getTime());
    afterDate.setHours(0, 0, 0, 0);
    var beforeDate = new Date(date.getTime());
    beforeDate.setHours(23, 59, 59, 999);
    var params = {
        part: 'snippet',
        maxResults: 50,
        order: 'viewCount',
        pageToken: pageToken,
        publishedBefore: beforeDate.toJSON(),
        publishedAfter: afterDate.toJSON(),
        relevanceLanguage: 'en',
        type: 'video',
        videoCaption: 'closedCaption',
        videoDefinition: 'high',
        videoEmbeddable: 'true',
        regionCode: 'us',
        // topicId: '/m/02jjt,/m/098wr,/m/019_rr,/m/04rlf'
    };
    // console.log(params);
    // var hash = createHash('md5').update(JSON.stringify(params)).digest("hex").substr(0, 5);
    // var tokenFilename = configDir + 'nextPageToken-' + hash + '.txt';
    var res = await youtube.search(params);
    var insert = [];

    for (var i = 0; i < res.items.length; i++) {
        var item = res.items[i];
        insert.push([item.id.videoId, item.snippet.channelId, item.snippet.title, date]);
    }
    if (insert.length) {
        await query('INSERT IGNORE INTO videos (ytId, ytChannelId, title, date) VALUES ?', [insert] as any);
    } else {
    }
    console.log(date.toJSON().split('T').shift() + ' inserted ' + insert.length);
    if (insert.length === 50) {
        await request(youtube, res.nextPageToken, date);
    }
}

async function list() {
    await youtube.auth();
    for (var i = 0; i < 1000; i++) {
        var promises = [];
        var rows = await query<{ ytId: string }[]>('SELECT ytId FROM videos WHERE views IS NULL LIMIT 2500');
        if (rows.length == 0) {
            console.log('done');
            return;
        }
        for (var j = 0; j < 50; j++) {
            var sliced = rows.slice(j * 50, (j + 1) * 50);
            promises.push(getList(sliced.map(row => row.ytId)));
        }
        try {
            await Promise.all(promises);
        } catch (err) {
            console.error(err);
        }
    }
}

async function getList(ids: string[]) {
    if (ids.length === 0) return;
    console.log('getList', ids.length);
    var q = '';
    var data = await youtube.videosList({
        id: ids.join(),
        part: 'contentDetails,snippet,statistics,topicDetails'
    });
    // console.log(JSON.stringify(data, null, 2));
    var values = [];
    for (var i = 0; i < data.items.length; i++) {
        var item = data.items[i];
        var stat = item.statistics;
        var topics = item.topicDetails ? (item.topicDetails.relevantTopicIds || []) : [];
        q += 'UPDATE videos SET topic1=?, topic2=?, topic3=?, categoryId=?, views=?, likes=?, dislikes=?, favorites=?, comments=?, duration=?, defaultLanguage=?, defaultAudioLanguage=? WHERE ytId=?;\n'
        values.push(topics[1], topics[2], topics[3], item.categoryId, stat.viewCount, stat.likeCount, stat.dislikeCount, stat.favoritesCount, stat.commentCount, parseTime(item.contentDetails.duration), item.snippet.defaultLanguage, item.snippet.defaultAudioLanguage, item.id);
    }
    // console.log(values);
    await query(q, values);
}


async function captionList() {
    await youtube.auth();
    var rows = await query<any>('SELECT ytId FROM videos WHERE good = 1 and ytASRCaptionId IS NULL AND ytEnCaptionId IS NULL');
    for (var i = 0; i < rows.length; i += 1) {
        var promises = [];
        for (var j = 0; j < 1; j++) {
            promises.push(getCaptions(rows[i + j].ytId));
        }
        try {
            await Promise.all(promises);
        } catch (err) {
            console.error(err);
        }
    }
}


async function getCaptions(videoId: string) {
    console.log(videoId);
    var data = await youtube.captionList({ part: 'snippet', videoId });
    // await captionDownload(row.ytId);
    let ytEnCaptionId, ytASRCaptionId;
    for (var i = 0; i < data.items.length; i++) {
        var item = data.items[i];
        var snippet = item.snippet;
        if (snippet.language.match(/^(en|en-CA|en-GB|en-IE|en-US)$/)) {
            if (item.snippet.trackKind === 'ASR') {
                ytASRCaptionId = item.id;
                // await captionDownload(item.id);
            } else {
                ytEnCaptionId = item.id;
            }
        } else {
            // console.log(snippet.language);
        }
    }
    await query('UPDATE videos SET ytEnCaptionId=?, ytASRCaptionId=? WHERE ytId=?', [ytEnCaptionId, ytASRCaptionId, videoId]);
    // console.log(data.items);
}


async function captionDownload(id: string) {
    console.log('captionDownload', id);
    var data = await youtube.captionDownload(id);

    // console.log(data);
}
// main().catch(err => console.error(err.stack));

function parseTime(input: string) {
    var reptms = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;
    var hours = 0, minutes = 0, seconds = 0, totalseconds;
    if (reptms.test(input)) {
        var matches = reptms.exec(input)!;
        if (matches[1]) hours = Number(matches[1]);
        if (matches[2]) minutes = Number(matches[2]);
        if (matches[3]) seconds = Number(matches[3]);
        totalseconds = hours * 3600 + minutes * 60 + seconds;
    }
    return totalseconds;
}

// list().catch(err => console.error(err.stack));
captionList().catch(err => console.error(err.stack));