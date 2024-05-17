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
import { Terminal } from "@xterm/xterm";
import '@xterm/xterm/css/xterm.css'
import {AbstractTab} from "./abstractTab";

export default class TermTab extends AbstractTab {
    #term: Terminal
    componentDidMount() {
        if (this.#term == null) {
            this.#term = new Terminal();
            this.#term.open(document.getElementById("term"))


            this.#term.onData((data) => {
                this.props.serialClient.writeString(data);
            })
        }

        this.props.dataUpdateFunc(this.#onAsyncData.bind(this));
    }

    #onAsyncData(buffer: ArrayBuffer): void{
        this.#term.write(new Uint8Array(buffer));
    }

    render() {
        return <div id="term">

        </div>
    }
}