declare var YT: any;
var resolve: () => void;
var reject;
export var YTReady = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
});
(window as any).onYouTubeIframeAPIReady = () => { console.log('yeah'); resolve() }

export function createPlayer(dom: string | HTMLElement, options: any) {
    return YTReady.then(() => {
        console.log('YT created');
        options.events = options.events || {};
        return new Promise((res, rej) => {
            options.events.onReady = () => res(player);
            var player = new YT.Player(dom, options);
        });
    });
}


import * as React from 'react';

interface PlayerProps {
    videoId: string;
}

export class Player extends React.Component<PlayerProps, {}>{
    player: any;
    playerState = 0;
    timeout: any;
    currentTime: number = 0;
    refs: {
        player: HTMLElement;
    }
    getCurrentState = () => {
        this.playerState = this.player.getPlayerState();
        this.currentTime = this.player.getCurrentTime();
        if (this.playerState === YT.PlayerState.PLAYING) {
            this.timeout = setTimeout(this.getCurrentState, 20);
        }

        this.forceUpdate();
    }

    componentDidMount() {
        createPlayer(this.refs.player, {
            videoId: this.props.videoId,
            width: window.innerWidth,
            height: window.innerHeight,
            playerVars: {
                cc_load_policy: 0,
                enablejsapi: 1,
                iv_load_policy: 3,
                modestbranding: 1,
                rel: 0,
                // hl: 'ru',
                showinfo: 0,
                // controls: 0,
            },
            events: {
                onStateChange: () => {
                    this.getCurrentState();
                }
            }
        }).then(p => this.player = p, err => console.error(err));

        window.addEventListener('resize', () => {
            this.player.setSize(window.innerWidth, window.innerHeight);
        });

        document.addEventListener('keypress', (e) => {
            if (e.keyCode === 32) {
                e.preventDefault();
                if (this.playerState === 1) {
                    this.player.pauseVideo();
                } else {
                    this.player.playVideo();
                }
            }

        });
        document.addEventListener('keydown', (e) => {
            if (e.keyCode === 38) {
                e.preventDefault();
            }
            if (e.keyCode === 40) {
                e.preventDefault();
            }
        });
    }

    render() {
        var { } = this.props;
        return (
            <div className="video" ref="player"></div>
        );
    }
}


