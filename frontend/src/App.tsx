import './Maybe';
import * as React from 'react';
import { RouteParams, Route, Link } from 'turbo-router';
import { app } from "./index";
import { r, rVideo } from "./routes";

interface AppProps {
}
export class App extends React.Component<AppProps, {}> {
    render() {
        const { } = this.props;
        return (
            <div className="app">
                {this.props.children}
            </div>
        )
    }
}

