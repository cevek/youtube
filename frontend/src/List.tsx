import * as React from 'react';
import { app } from "./index";
import { RouteParams, Link } from "turbo-router";
import { rVideo, ListP, rList } from "./routes";

interface ListProps {
    date: Date;
    videos: any[];
}

export class List extends React.Component<ListProps, {}> {
    static onEnter({ urlParams, onEnd }: RouteParams<ListP>) {
        var date = new Date(urlParams.date + 'Z') || new Date();
        return app.http.requestJSON('GET', '/api/videos/' + date.toJSON().split('T').shift()).then(videos => ({ date, videos, urlParams }));
    }

    render() {
        const { videos, date } = this.props;
        var dates: Date[] = [];
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        // for (var i = 10; i > 0; i--) {
        //     var d = new Date(date.getTime());
        //     d.setDate(date.getDate() - i);
        //     dates.push(d);
        // }
        var prevDate = new Date(date.getTime());
        prevDate.setDate(date.getDate() - 1);
        var nextDate = new Date(date.getTime());
        nextDate.setDate(date.getDate() + 1);
        dates.push(prevDate);
        dates.push(date);
        dates.push(nextDate);
        // dates.push(today);
        // for (var i = 1; i <= 10; i++) {
        //     var d = new Date(date.getTime());
        //     d.setDate(date.getDate() + i);
        //     if (d.getTime() < today.getTime()) {
        //         dates.push(d);
        //     }
        // }
        return (
            <div className="List">
                <div>
                    {dates.map(date =>
                        <Link className="date" url={rList.toUrl({ date: date.toJSON().split('T').shift()! })}>{date.toJSON().split('T').shift()}</Link>
                    )}
                </div>
                {videos.map(video =>
                    <Link url={rVideo.toUrl({ ytId: video.ytId })} className="video">
                        <div className="img" style={{ backgroundImage: `url(https://i.ytimg.com/vi/${video.ytId}/hqdefault.jpg)` }} />
                    </Link>
                )}
            </div>
        );
    }
}
