import React, {Component} from 'react';
import {observer} from 'mobx-react';
import store from './test.store';

@observer
export default class TestView extends Component {
    render() {
        return (
            <div>
                <h2>TestView - check/uncheck items to see what happens</h2>
            </div>
        );
    }
}
