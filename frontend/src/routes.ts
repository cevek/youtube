import { BrowserHistory, Router, Route } from 'turbo-router';
import { App } from "./App";
import { Video } from "./Video";
import { List } from "./List";

export type IndexP = {};
export type VideoP = { ytId: string };

export var r = new Route<IndexP>('/', App).addIndex(List);
export var rVideo = r.addChild<VideoP>('/video/:ytId/', Video);

