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
import { TextInput, DropDown, CheckBox, Button } from "../../commonControls";
import { Network, NetworkType, WiFiSettings } from "../../lib/settingsAPI";

interface WifiSettingsState {
    wifiList: Network[]
    scanInProgress: boolean
    busy: boolean
    WIFIClient: Network
    WIFIvirtualAccessPoint: Network
}

interface WifiSettingsProps {
    onStatusChange: (msg: string) => void
    settingsAPI: WiFiSettings
}

export class WifiSettingsForm extends Component<WifiSettingsProps, WifiSettingsState> {

    constructor(props) {
        super(props);
        this.state = {
            wifiList: [],
            scanInProgress: false,
            busy: false,
            WIFIClient: { psk: "", name: "", securityType: "" },
            WIFIvirtualAccessPoint: { psk: "", name: "", securityType: "" },
        }
    }

    set currentOperation(status: string) {
        this.props.onStatusChange(status);
    }

    componentDidMount(): void {

        this.props.settingsAPI.getSavedNetwork().then(val => {
            this.setState({
                WIFIClient: val["sta"],
                WIFIvirtualAccessPoint: val["ap"]
            })
        }).catch(e => {
            this.currentOperation = e.toString();
        })
    }

    #doScan() {
        this.setState({ scanInProgress: true })
        this.props.settingsAPI.WifiScan().then(val => {
            this.setState({ wifiList: val })
        }).catch(r => {
            this.currentOperation = r.toString();
        }).finally(() => {
            this.setState({ scanInProgress: false })
        });
    }

    #onScanClick() {
        this.#doScan();
    }

    #onJoinClick() {
        this.setState({ busy: true })
        this.props.settingsAPI.setSavedNetwork(NetworkType.Client, this.state.WIFIClient).then(() => {
            this.currentOperation = "completed";
        }).catch(e => this.currentOperation = e.toString())
            .finally(() => {
                this.setState({ busy: false });
            });
    }

    #onSaveClick() {
        this.setState({ busy: true })

        const { name, psk, securityType } = this.state.WIFIvirtualAccessPoint;
        const payload = { name, psk, securityType };

        this.props.settingsAPI.setSavedNetwork(NetworkType.AP, payload).then(() => {
            this.currentOperation = "completed";
        }).catch(e => this.currentOperation = "Error: " + e.toString())
            .finally(() => {
                this.setState({ busy: false });
            });
    }

    #patchWIFIField(VAP: boolean, fieldName: string, value: string) {

        let { WIFIvirtualAccessPoint, WIFIClient } = this.state


        if (VAP) {
            WIFIvirtualAccessPoint[fieldName] = value;
            this.setState({ WIFIvirtualAccessPoint: WIFIvirtualAccessPoint });
        } else {
            WIFIClient[fieldName] = value;
            this.setState({ WIFIClient: WIFIClient });
        }
    }

    #getStatusSummay(network: Network) {
        let IPAddress = network.IPAddress;
        if (IPAddress != null) {
            return <span className="extraInfo" >(ESP Address: {IPAddress})</span>
        }
        return <span></span>

    }

    render() {

        const { state } = this;

        let APStatusInfo = this.#getStatusSummay(this.state.WIFIvirtualAccessPoint);
        let clientStatusInfo = this.#getStatusSummay(this.state.WIFIClient);

        return <div>
            <details class="form-group" >
                <summary>Client {clientStatusInfo}</summary>
                <div class="form-v" >
                    <TextInput size={10} label="SSID" value={this.state.WIFIClient?.name} valueList={state.wifiList.map(list => list.name)} onChange={(elm) => this.#patchWIFIField(false, "name", elm.value)} >
                        <button onClick={this.#onScanClick.bind(this)} {...((state.scanInProgress || state.busy) && { disabled: true })} >{state.scanInProgress ? "Scanning" : "Scan"}</button>
                    </TextInput>

                    <TextInput size={16} type="password" label="Passphrase" onChange={(elm: HTMLInputElement) => this.#patchWIFIField(false, "psk", elm.value)} />

                    <Button onClick={this.#onJoinClick.bind(this)} label="Save" />

                </div>
            </details>
            <details class="form-group" >
                <summary>Virtual Access Point {APStatusInfo}</summary>
                <div class=" form-v" >
                    <TextInput size={16} label="SSID" value={this.state.WIFIvirtualAccessPoint?.name} onChange={(elm: HTMLInputElement) => this.#patchWIFIField(true, "name", elm.value)} />
                    <DropDown label="Security" selectedItem={this.state.WIFIvirtualAccessPoint?.securityType} items={this.state.WIFIvirtualAccessPoint.supportedSecurityTypes ?? []} onChange={(val) => this.#patchWIFIField(true, "securityType", val)} />
                    <TextInput size={16} type="password" label="Passphrase" onChange={(elm: HTMLInputElement) => this.#patchWIFIField(true, "psk", elm.value)} />
                    <CheckBox label="Always Enabled" onChange={() => { }} />
                    <Button onClick={this.#onSaveClick.bind(this)} label="save" />
                </div>
            </details>
        </div>
    }
}