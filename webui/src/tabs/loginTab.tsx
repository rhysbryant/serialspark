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
import { Component } from "preact";
import { Button, TextInput } from "../commonControls";

interface Props {
    loginClick: ((userName: string, password: string) => void);
    errorMessage: string
}

export default class LoginTab extends Component<Props, {}> {
    #userRef: HTMLInputElement
    #passwordRef: HTMLInputElement
    constructor(props) {
        super(props);
    }

    render() {
        return <div class="from-center form-v" >
            <div className="form-message">
                <span>{this.props.errorMessage}</span>
            </div>
            <TextInput inputRef={e => this.#userRef = e} size={16} label="User" onChange={() => { }} />
            <TextInput inputRef={e => this.#passwordRef = e} size={16} type="password" label="Password" onChange={() => { }} />
            <Button onClick={() => this.props.loginClick(this.#userRef.value, this.#passwordRef.value)} label="LogIn" />
        </div>

    }
}