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
import { AbstractTab } from "./abstractTab";
import Stm32BootLoaderClient from "../lib/stm32bootloaderClient";
import { CheckBox, DropDown } from "../commonControls";

interface Stm32OptionsState {
    erase: boolean
    write: boolean
    verify: boolean
    run: boolean
}

interface Stm32OptionsProps {
    onChange: (elm: HTMLInputElement) => void
    onQueryClick: () => void
    enabled: boolean
}

class Stm32UploadControls extends Component<Stm32OptionsProps, Stm32OptionsState> {

    render() {
        const { enabled } = this.props;

        return <div>
            <button  {...(enabled && { disable: true })} onClick={this.props.onQueryClick.bind(this)} >Activate / Connection Check</button>

            <CheckBox label="Erase All" value="erase" onChange={this.props.onChange.bind(this)} enabled={enabled} />
            <CheckBox label="Write" value="write" onChange={this.props.onChange.bind(this)} enabled={enabled} />
            <CheckBox label="Verify" value="verify" onChange={this.props.onChange.bind(this)} enabled={enabled} />
            <CheckBox label="Run" value="run" onChange={this.props.onChange.bind(this)} enabled={enabled} />

        </div>
    }
}

interface UploadState {
    fileLoadInProgress: boolean
    uploadInProgress: boolean
    uploadProgressMax: number
    uploadProgressValue: number
    cancelRequested: boolean
    uploadType: string
}

interface FileUploadHandler {
    processUpload(buffer: ArrayBuffer, onProgressUpdate: (progress: number) => boolean) : Promise<any>
    getUIComponent(): any
}

class SimpleFileDumpUpload implements FileUploadHandler {
    #uploadTab: UploadTab
    constructor(uploadTab: UploadTab) {
        this.#uploadTab = uploadTab;
    }

    processUpload(buffer: ArrayBuffer, onProgressUpdate: (progress: number) => boolean): Promise<any> {
        return new Promise<void>(async (resolve, reject) => {
            try {
                const maxChunkSize = 2048;
                for (let i = 0; i < buffer.byteLength; i += maxChunkSize) {
                    let chunkSize = maxChunkSize;

                    await this.#uploadTab.props.serialClient.write(new Uint8Array(buffer.slice(i, i + chunkSize)))
                    if (onProgressUpdate(i + chunkSize)) {
                        return
                    }
                }
                resolve();
            }
            catch (e) {
                reject(e);
            }
        });
    }

    getUIComponent() {
        return null
    }
}

class Stm32FirmwareUpload implements FileUploadHandler {
    #uploadTab: UploadTab
    #actions = {
        erase: false,
        write: false,
        verify: false,
        run: false
    };
    #operationInProgress = false;
    
    constructor(uploadTab: UploadTab) {
        this.#uploadTab = uploadTab;
    }

    #onStm32QueryClick(event: Event) {
        const uploadTab = this.#uploadTab;
        const b = new Stm32BootLoaderClient(this.#uploadTab.props.serialClient);
        //ElementUtils.enableControl(event.target as Element, false);
        this.#operationInProgress = true;
        uploadTab.currentOperation = "attempting to query device"
        uploadTab.forceUpdate();//TODO fix this
        b.sendSyncByte().then(() => {
            b.getProductID().then(id => {
                uploadTab.currentOperation = "found STM32, PID " + id;
            }).catch((message) => {
                uploadTab.currentOperation = "failed to query STM32 PID, " + message;
            })
        }).catch((message) => {
            uploadTab.currentOperation = "STM32, activate failed, " + message;
        }).finally(() => {
            this.#operationInProgress = false;
            uploadTab.forceUpdate();//TODO fix this
        });
    }

    processUpload(buffer: ArrayBuffer, onProgressUpdate: (progress: number) => boolean) {
        const uploadTab = this.#uploadTab;
        return new Promise<void>(async (resolve, reject) => {
            const b = new Stm32BootLoaderClient(uploadTab.props.serialClient);

            const actions = this.#actions

            if (actions.erase) {
                uploadTab.currentOperation = " STM32, erase started";
                try {
                    await b.erase()
                } catch (e) {
                    uploadTab.currentOperation = " ";
                    reject("STM32, erase failed, " + e);
                    return;
                }
            }

            let startAddress = null;

            if (actions.write) {
                uploadTab.currentOperation = " STM32, write started";
                try {
                    startAddress = await b.writeFromIntelHEX(buffer, onProgressUpdate);
                } catch (e) {
                    reject("STM32, write failed " + e);
                    return;
                }
            }

            if (actions.verify) {
                uploadTab.currentOperation = " STM32, verify started";
                try {
                    startAddress = await b.verifyWithIntelHEX(buffer, onProgressUpdate);
                } catch (e) {
                    reject("STM32, verify failed " + e);
                    return;
                }
            }

            if (actions.run && startAddress != null) {
                uploadTab.currentOperation = " STM32, start sent";
                try {
                    await b.go(startAddress);
                } catch (e) {
                    reject("STM32, start failed " + e);
                }

            }

            resolve();
        });
    }

    #onActionsChange(elm: HTMLInputElement) {
        this.#actions[elm.value] = elm.checked;
    }

    getUIComponent() {
        return <Stm32UploadControls enabled={!this.#operationInProgress} onChange={this.#onActionsChange.bind(this)} onQueryClick={this.#onStm32QueryClick.bind(this)} />
    }
}

export default class UploadTab extends AbstractTab<UploadState> {
    #uploadTypes = ["STM32 (.hex) Firmware Upload", "Direct Dump"];
    #uploadTypeHandler = [Stm32FirmwareUpload, SimpleFileDumpUpload]
    #currentFileUploadHandler = new this.#uploadTypeHandler[0](this);
    #fileUploadInputElm: HTMLInputElement

    constructor(props) {
        super(props);
        this.state = {
            fileLoadInProgress: false,
            uploadInProgress: false,
            cancelRequested: false,
            uploadProgressMax: 1000,
            uploadProgressValue: 0,
            uploadType: this.#uploadTypes[0]
        }
    }

    componentDidMount(): void {
        this.#fileUploadInputElm = document.getElementById("fileUploadInput") as HTMLInputElement
    }

    #resetUI() {
        this.setState({
            fileLoadInProgress: false,
            uploadInProgress: false,
            cancelRequested: false,
            uploadProgressMax: 1000,
            uploadProgressValue: 0
        });
    }

    #onFileReaderReady(buffer: ArrayBuffer) {

        this.setState({
            fileLoadInProgress: false,
            uploadInProgress: true,
            uploadProgressMax: 100,
            uploadProgressValue: 1
        });

        

        const progressCallback = (value) => {
            const progress = value;
            this.setState({ uploadProgressValue: progress });

            if (this.state.cancelRequested) {
                this.#resetUI();
                return true;
            }
        }
        let p: Promise<any>;

        p = this.#currentFileUploadHandler.processUpload(buffer, progressCallback)

        this.currentOperation = "started";
        p.then(() => {
            this.currentOperation = "complete";
        }).catch((msg) => {
            this.currentOperation = "error " + msg;
        }).finally(() => this.#resetUI())
    }

    #onUploadClick(event: Event) {
        if (this.state.uploadInProgress) {
            this.setState({ cancelRequested: true });
        } else {
            const file = this.#fileUploadInputElm.files[0];
            const reader = new FileReader();
            reader.readAsArrayBuffer(file);
            reader.onload = () => this.#onFileReaderReady(reader.result as ArrayBuffer);
            this.setState({ fileLoadInProgress: true });
        }
    }

    #uploadTypeOnChange(value: string) {

        const index = this.#uploadTypes.findIndex((val) => val == value)
        this.#currentFileUploadHandler = new this.#uploadTypeHandler[index](this);
        this.setState({ uploadType: value })
    }

    render() {
        const { state } = this;

        return <div class="form-v">
            <DropDown enabled={!state.uploadInProgress} label="Upload Type" items={this.#uploadTypes}
                onChange={(value) => { this.#uploadTypeOnChange(value) }} />
            <div>
                <label >File</label>
                <input id="fileUploadInput" {...(state.uploadInProgress && { disabled: true })} type="file" />
            </div>
            <div>
                {this.#currentFileUploadHandler.getUIComponent()}
                <button {...(state.fileLoadInProgress && { disabled: true })} onClick={this.#onUploadClick.bind(this)}>
                    {state.cancelRequested ? "Trying to Cancel" : (state.uploadInProgress ? "Cancel" : "Upload")}
                </button>
            </div>
            <div>
                <label>Progress</label>
                <progress max={state.uploadProgressMax} value={state.uploadProgressValue} ></progress>
            </div>
        </div>
    }
}