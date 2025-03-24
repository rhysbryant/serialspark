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
import { CertInfo, CertSettings } from "../../lib/settingsAPI";
import { Button, FileInput } from "../../commonControls";

interface CertSettingsState {
    TLScertFile?: ArrayBuffer
    TLSPKFile?: ArrayBuffer
    certUploadInProgress: boolean
    certInfo?: CertInfo
}

interface CertSettingsProps {
    settingsAPI: CertSettings
    onStatusChange: (msg: string) => void

}

export class CertSettingsForm extends Component<CertSettingsProps, CertSettingsState> {

    set currentOperation(status: string) {
        this.props.onStatusChange(status);
    }

    componentDidMount() {
        this.props.settingsAPI.getTLSSetupInfo().then(info => {
            this.setState({ certInfo: info });
        }).catch(e => {
            this.currentOperation = e;
        });
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
        const { settingsAPI } = this.props;

        if (TLSPKFile) {
            result = doUpload(() => settingsAPI.uploadPK(TLSPKFile));
        }

        if (TLScertFile != null) {
            const f = () => doUpload(() => settingsAPI.uploadCert(TLScertFile));
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

        if (e.files.length == 0) {
            set(null);
        } else {
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

    render() {
        const { state } = this;
        return <div>
            <details class="form-group" >
                <summary>SSL Certificate</summary>
                {this.#certStatusSummary()}
                <div class=" form-v" >
                    <FileInput enabled={!state.certUploadInProgress} label="Private Key" onChange={(elm) => this.#certFileSelected("pk", elm)} />
                    <FileInput enabled={!state.certUploadInProgress} label="Certificate Chain" onChange={(elm) => this.#certFileSelected("cert", elm)} />
                    <Button enabled={!(state.TLSPKFile == null && state.TLScertFile == null) || !state.certUploadInProgress} onClick={this.#uploadCertClick.bind(this)} label="Save" />
                </div>
            </details>
        </div>
    }
}