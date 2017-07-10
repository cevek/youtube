import { BrowserHistory, Router, Route } from 'turbo-router';
import { App } from "./App";
import { Video } from "./Video";
import { List } from "./List";

export type IndexP = {};
export type ListP = { date: string };
export type VideoP = { ytId: string };

export var r = new Route<IndexP>('/', App);
export var rList = r.addChild<ListP>('/list/:date?', List);
export var rVideo = r.addChild<VideoP>('/video/:ytId/', Video);

