import * as React from 'react';
import { RouteParams } from "turbo-router";
import { VideoP } from "./routes";
import { Player } from "./Player";

interface VideoProps {
    urlParams: VideoP;
}

export class Video extends React.Component<VideoProps, {}> {
    static onEnter({ urlParams }: RouteParams<VideoP>) {
        return Promise.resolve({ urlParams });
    }
    render() {
        const { urlParams } = this.props;
        return (
            <div className="Video">
                <Player videoId={urlParams.ytId}/>
            </div>
        );
    }
}