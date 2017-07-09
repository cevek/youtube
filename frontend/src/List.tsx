import * as React from 'react';
import { app } from "./index";
import { RouteParams, Link } from "turbo-router/dist/Router";
import { rVideo } from "./routes";

interface ListProps {
    videos: any[];
}

export class List extends React.Component<ListProps, {}> {
    static onEnter({ urlParams, onEnd }: RouteParams) {
        return app.http.requestJSON('GET', '/api/videos').then(videos => ({ videos, urlParams }));
    }

    render() {
        const { videos } = this.props;
        return (
            <div className="List">
                {videos.map(video =>
                    <Link url={rVideo.toUrl({ ytId: video.ytId })} className="video">
                        <div className="img" style={{ backgroundImage: `url(https://i.ytimg.com/vi/${video.ytId}/hqdefault.jpg)` }} />
                    </Link>
                )}
            </div>
        );
    }
}
