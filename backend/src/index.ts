import { Drive, Youtube } from "./drive";
import { config, configDir } from "./config";
import { query } from "./db";
import { writeFileSync, readFileSync } from "fs";
import { createHash } from "crypto";

// var drive = new Drive();
// drive.auth();
// drive.createFolder('foo').catch(err => console.error(err));
var youtube = new Youtube(configDir);

async function updateYoutubeVideos() {
    console.log(new Date(), 'updateYoutubeVideos');
    await youtube.auth();
    var d = new Date();
    const [{ count }] = await query<{ count: number }[]>('SELECT count(id) as count FROM videos WHERE date = CURRENT_DATE');
    if (count > 0) {
        console.log('Nothing to find');
    } else {
        try {
            await findAndAddVideosByDate(youtube, '', d);
        } catch (err) {
            console.error(err.stack);
        }
    }
    try {
        await updateAllVideoInfo();
    } catch (err) {
        console.error(err.stack);
    }
    try {
        await updateCaptionIds();
    } catch (err) {
        console.error(err.stack);
    }
}

async function findAndAddVideosByDate(youtube: Youtube, pageToken: string, date: Date) {
    var afterDate = new Date(date.getTime());
    afterDate.setHours(0, 0, 0, 0);
    var beforeDate = new Date(date.getTime());
    beforeDate.setHours(23, 59, 59, 999);
    var params = {
        part: 'snippet',
        maxResults: 50,
        // order: 'viewCount',
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
    var res = await youtube.search(params);
    var insert = [];

    for (var i = 0; i < res.items.length; i++) {
        var item = res.items[i];
        insert.push([item.id.videoId, item.snippet.channelId, item.snippet.title, date]);
    }
    if (insert.length > 0) {
        await query('INSERT IGNORE INTO videos (ytId, ytChannelId, title, date) VALUES ?', [insert] as any);
    } else {
    }
    console.log(date.toJSON().split('T').shift() + ' inserted ' + insert.length);
    if (insert.length === 50) {
        await findAndAddVideosByDate(youtube, res.nextPageToken, date);
    }
}

async function updateAllVideoInfo() {
    await youtube.auth();
    var promises = [];
    var rows = await query<{ ytId: string }[]>('SELECT ytId FROM videos WHERE infoUpdatedAt IS NULL OR (ADDDATE(infoUpdatedAt, DATEDIFF(NOW(), date) / 10) < CURRENT_DATE)');
    console.log('updateAllVideoInfo', rows.length);
    while (rows.length > 0) {
        var sliced = rows.slice(0, 50);
        rows = rows.slice(50);
        if (sliced.length > 0) {
            promises.push(updateVideoInfo(sliced.map(row => row.ytId)));
        }
    }
    await Promise.all(promises);
}

async function updateVideoInfo(ids: string[]) {
    if (ids.length === 0) return;
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
        q += 'UPDATE videos SET infoUpdatedAt=NOW(), topic1=?, topic2=?, topic3=?, categoryId=?, views=?, likes=?, dislikes=?, favorites=?, comments=?, duration=?, defaultLanguage=?, defaultAudioLanguage=? WHERE ytId=?;\n'
        values.push(topics[1], topics[2], topics[3], item.categoryId, stat.viewCount, stat.likeCount, stat.dislikeCount, stat.favoritesCount, stat.commentCount, parseTime(item.contentDetails.duration), item.snippet.defaultLanguage, item.snippet.defaultAudioLanguage, item.id);
    }
    // console.log(values);
    if (values.length > 0) {
        await query(q, values);
    }
}


async function updateCaptionIds() {
    await youtube.auth();
    var rows = await query<any>('SELECT ytId FROM videos WHERE defaultAudioLanguage in ("en", "en-CA", "en-GB", "en-IE", "en-US") and likes > 10 and views > 500 and (likes/dislikes > 5 OR dislikes = 0) and duration < 1200 AND captionUpdatedAt IS NULL');
    console.log('updateCaptionIds', rows.length);
    while (rows.length > 0) {
        var sliced = rows.slice(0, 50);
        rows = rows.slice(50);
        var promises = [];
        for (var j = 0; j < sliced.length; j++) {
            promises.push(updateCaption(sliced[j].ytId));
        }
        try {
            await Promise.all(promises);
        } catch (err) {
            console.error(err);
        }
    }
}


async function updateCaption(videoId: string) {
    var data = await youtube.captionList({ part: 'snippet', videoId });
    // await captionDownload(row.ytId);
    let ytEnCaptionId, ytASRCaptionId;
    for (var i = 0; i < data.items.length; i++) {
        var item = data.items[i];
        var snippet = item.snippet;
        if (snippet.language.match(/^(en|en-CA|en-GB|en-IE|en-US)$/)) {
            if (item.snippet.trackKind === 'ASR') {
                ytASRCaptionId = item.id;
            } else {
                ytEnCaptionId = item.id;
            }
        } else {
        }
    }
    await query('UPDATE videos SET ytEnCaptionId=?, ytASRCaptionId=?, captionUpdatedAt = NOW() WHERE ytId=?', [ytEnCaptionId, ytASRCaptionId, videoId]);
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


updateYoutubeVideos().catch(err => console.error(err.stack));
// updateCaptionIds().catch(err => console.error(err.stack));