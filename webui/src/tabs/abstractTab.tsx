/*
 Copyright (c) 2024 Rhys Bryant

 serialspark is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 serialspark is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with serialspark. If not, see <https://www.gnu.org/licenses/>.
 */
import { Attributes, Component, ComponentChild, ComponentChildren, Ref } from "preact";
import { SerialClient } from "../lib/serialClient";
import { Auth } from "../lib/settingsAPI";

interface TabProps {
    auth: Auth
    serialClient: SerialClient
    postStatusUpdate: (type: string, message: string) => void,
    //get a callback function for providing new data to the tab without rerendering
    dataUpdateFunc?:(newDataCallback: (func) =>void ) => void
}

export abstract class AbstractTab<S = {}> extends Component<TabProps, S>{
    set currentOperation(value: string) {
        this.props.postStatusUpdate('operation', value)
    }
}

interface TabContainerProps {
    isActive: boolean
}

export class TabContainer extends Component<TabContainerProps> {
    render(props?: Readonly<Attributes & { children?: ComponentChildren; ref?: Ref<any>; }>, state?: Readonly<{}>, context?: any): ComponentChild {

        return <div style={this.props.isActive ? { display: "block" } : { display: "none" }}>
            {props.children}
        </div>
    }
}