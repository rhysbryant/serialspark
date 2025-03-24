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
import { Button, TextInput } from "../../commonControls";
import { AuthSettings } from "../../lib/settingsAPI";

interface State {
    showPwssword: boolean
    errorMessage: string
}

interface AuthSettingsProps {
    settingsAPI: AuthSettings
    onStatusChange: (msg: string) => void

}

export class AuthSettingsForm extends Component<AuthSettingsProps, State> {
    #newPWElm
    #currentPWElm
    #userNameElm
    constructor(props) {
        super(props);
        this.state = {
            showPwssword: false,
            errorMessage: ""
        }
    }

    #viewPWClick() {
        this.setState({ showPwssword: !this.state.showPwssword });
    }

    #updateUserClick() {
        this.props.settingsAPI.updateUser({
            user: this.#userNameElm.value,
            password: this.#newPWElm.value
        }, {
            user: this.#userNameElm.value,
            password: this.#currentPWElm.value
        }).then(() => {
            this.setState({ errorMessage: "Sucsessful" });
            this.props.onStatusChange("password change Sucsessful");
        }).catch(e => {
            this.setState({ errorMessage: e });
        })
    }

    render() {
        const showNewPW = this.state.showPwssword;

        return <div>
            <details class="form-group" >
                <summary>Login</summary>
                <div class=" form-v" >

                    <div className="form-message">
                        <span>{this.state.errorMessage}</span>
                    </div>
                    <TextInput label="User Name" inputRef={e => this.#userNameElm = e} value="user" enabled={false} />
                    <TextInput label="Current Password" inputRef={e => this.#currentPWElm = e} type="password" />
                    <TextInput label="New Password" inputRef={e => this.#newPWElm = e} onChange={() => { }} type={showNewPW ? "text" : "password"} >
                        <span style="cursor: pointer;font-size: small" onClick={this.#viewPWClick.bind(this)} >
                            {showNewPW ? "Hide" : "View"}
                        </span>
                    </TextInput>
                    <Button label="Change" onClick={this.#updateUserClick.bind(this)} />
                </div>
            </details>
        </div>
    }
}