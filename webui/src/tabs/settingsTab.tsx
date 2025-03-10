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
import { CheckBox, DropDown, FileInput, TextInput } from "../commonControls";
import { CertInfo, CertSettings, Network, NetworkType, WiFiSettings } from "../lib/settingsAPI";
import { AbstractTab } from "./abstractTab";

interface SettingsTabState {
    wifiList: Network[]
    scanInProgress: boolean
    busy: boolean
    WIFIClient: Network
    WIFIvirtualAccessPoint: Network
    TLScertFile?: ArrayBuffer
    TLSPKFile?: ArrayBuffer
    certUploadInProgress: boolean
    certInfo?: CertInfo
}

export default class SettingsTab extends AbstractTab<SettingsTabState> {
    #wifiSettings = new WiFiSettings("");
    #certSettings = new CertSettings("");
    constructor(props) {
        super(props);
        this.state = {
            wifiList: [],
            scanInProgress: false,
            busy: false,
            WIFIClient: { psk: "", name: "", securityType: "" },
            WIFIvirtualAccessPoint: { psk: "", name: "", securityType: "" },
            certUploadInProgress: false
        }
    }

    componentDidMount(): void {

        this.#wifiSettings.getSavedNetwork().then(val => {
            this.setState({
                WIFIClient: val["sta"],
                WIFIvirtualAccessPoint: val["ap"]
            })
        }).catch(e => {
            this.props.postStatusUpdate('operation', e.toString());
        })

        this.#certSettings.getTLSSetupInfo().then(info => {
            this.setState({ certInfo: info });
        }).catch(e => {
            this.currentOperation = e;
        });
    }

    #doScan() {
        this.setState({ scanInProgress: true })
        this.#wifiSettings.WifiScan().then(val => {
            this.setState({ wifiList: val })
        }).catch(r => {
            this.props.postStatusUpdate('operation', r.toString());
        }).finally(() => {
            this.setState({ scanInProgress: false })
        });
    }

    #onScanClick() {
        this.#doScan();
    }

    #onJoinClick() {
        this.setState({ busy: true })
        this.#wifiSettings.setSavedNetwork(NetworkType.Client, this.state.WIFIClient).then(() => {
            this.props.postStatusUpdate('operation', "completed");
        }).catch(e => this.props.postStatusUpdate('operation', e.toString()))
            .finally(() => {
                this.setState({ busy: false });
            });
    }

    #onSaveClick() {
        this.setState({ busy: true })

        const { name, psk, securityType } = this.state.WIFIvirtualAccessPoint;
        const payload = { name, psk, securityType };

        this.#wifiSettings.setSavedNetwork(NetworkType.AP, payload).then(() => {
            this.props.postStatusUpdate('operation', "completed");
        }).catch(e => this.props.postStatusUpdate('operation', "Error: " + e.toString()))
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

    #uploadCertClick() {

        const { TLSPKFile, TLScertFile } = this.state

        const doUpload = (cb: () => Promise<void>) => {
            this.setState({ certUploadInProgress: true });
            this.currentOperation = "Uploading";

            cb().then(() => {
                this.setState({ certUploadInProgress: false });
                this.currentOperation = "Cert Upload Complete";
            }).catch(err => this.currentOperation = "Uploading Cert Failed: " + err)
                .finally(() => this.setState({ certUploadInProgress: false }));
        }

        let result = null;

        if (TLSPKFile) {
            result = doUpload(() => this.#certSettings.uploadPK(TLSPKFile));
        }

        if (TLScertFile != null) {
            const f = () => doUpload(() => this.#certSettings.uploadCert(TLScertFile));
            if (result != null) {
                result.then(f);
            } else {
                f();
            }

        }
    }

    #certFileSelected(name: string, e: HTMLInputElement) {
        const set = (val) => {
            if (name == "pk") {
                this.setState({ TLSPKFile: val });
            } else {
                this.setState({ TLScertFile: val });
            }
        }

        if(e.files.length == 0){
            set(null);
        }else{
            e.files[0].arrayBuffer().then(buf => set(buf));
        }
    }

    #certStatusSummary() {
        const keys = [
            "commonName",
            "expiry",
            "hasPK"
        ]
        const { certInfo } = this.state;
        if (certInfo == null) {
            return <span>TLS not configured</span>
        }

        return keys.map(key => {
            if (certInfo[key]) {
                return (<div>
                    <span>{key}:</span>
                    <span>{certInfo[key]}</span>
                </div>
                )
            } else {
                return null;
            }
        })
    }

    #getStatusSummay(network: Network) {
        let IPAddress = network.IPAddress;
        if( IPAddress != null){
            return <span className="extraInfo" >(ESP Address: {IPAddress})</span>
        }
        return <span></span>

    }

    render() {
        const { state } = this;
        let clientStatusInfo = this.#getStatusSummay(this.state.WIFIClient);
        let APStatusInfo = this.#getStatusSummay(this.state.WIFIvirtualAccessPoint);

        return <div>
            <h3>Wifi Settings</h3>
            <details class="form-group" >
                <summary>Client {clientStatusInfo}</summary>
                <div class="form-v" >
                    <TextInput size={10} label="SSID" value={this.state.WIFIClient?.name} valueList={state.wifiList.map(list => list.name)} onChange={(elm) => this.#patchWIFIField(false, "name", elm.value)} >
                        <button onClick={this.#onScanClick.bind(this)} {...((state.scanInProgress || state.busy) && { disabled: true })} >{state.scanInProgress ? "Scanning" : "Scan"}</button>
                    </TextInput>

                    <TextInput size={16} type="password" label="Passphrase" onChange={(elm: HTMLInputElement) => this.#patchWIFIField(false, "psk", elm.value)} />
                    <div>
                        <button onClick={this.#onJoinClick.bind(this)}>Save</button>
                    </div>
                </div>
            </details>
            <details class="form-group" >
                <summary>Virtual Access Point {APStatusInfo}</summary>
                <div class=" form-v" >
                    <TextInput size={16} label="SSID" value={this.state.WIFIvirtualAccessPoint?.name} onChange={(elm: HTMLInputElement) => this.#patchWIFIField(true, "name", elm.value)} />
                    <DropDown label="Security" selectedItem={this.state.WIFIvirtualAccessPoint?.securityType} items={this.state.WIFIvirtualAccessPoint.supportedSecurityTypes ?? []} onChange={(val) => this.#patchWIFIField(true, "securityType", val)} />
                    <TextInput size={16} type="password" label="Passphrase" onChange={(elm: HTMLInputElement) => this.#patchWIFIField(true, "psk", elm.value)} />
                    <CheckBox label="Always Enabled" onChange={() => { }} />
                    <div>
                        <button onClick={this.#onSaveClick.bind(this)}>Save</button>
                    </div>
                </div>
            </details>
            <details class="form-group" >
                <summary>SSL Certificate</summary>
                {this.#certStatusSummary()}
                <div class=" form-v" >
                    <FileInput enabled={!state.certUploadInProgress} label="Private Key" onChange={(elm) => this.#certFileSelected("pk", elm)} />
                    <FileInput enabled={!state.certUploadInProgress} label="Certificate Chain" onChange={(elm) => this.#certFileSelected("cert", elm)} />
                    <div>
                        <button {...(((state.TLSPKFile == null && state.TLScertFile == null) || state.certUploadInProgress) && { disabled: true })} onClick={this.#uploadCertClick.bind(this)}>Save</button>
                    </div>
                </div>
            </details>
        </div>
    }
}
