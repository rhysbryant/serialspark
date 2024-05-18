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
import { AbstractTab } from "./abstractTab";
import { DropDown, TextInput } from "../commonControls";
import { SerialModeNoParity, SerialModeOddParity, SerialModeEvenParity, SerialModeMarkParity, SerialModeSpaceParity, SerialMode } from "../lib/serialClient";

interface PortTabProps {
    portList: string[]
    bandRateList?: string[]
    parityList?: string[]
    dataBitsList?: string[]
}

interface OptionList {
    items: string[],
    enabled: boolean
}

interface State {
    dataBitsValue: string
    portValue: string
    bandRateValue: string
    parityValue: string

    portList: string[]
    connected: boolean
    pendingOperation: boolean
}

export class PortTab extends AbstractTab<State> {
    #bandRateList: string[];
    #dataBitsList: string[];
    #parityList: string[];
    #lastSerialMode

    #bitWidthMap = {
        "8 bits": 8,
        "7 bits": 7,
        "6 bits": 6,
        "5 bits": 5
    }

    #parityMap = {
        "None": SerialModeNoParity,
        "Odd": SerialModeOddParity,
        "Even": SerialModeEvenParity,
        "Mark": SerialModeMarkParity,
        "Space": SerialModeSpaceParity
    }

    constructor(props) {
        super(props);
        this.#bandRateList = ["9600", "57600", "115200"];
        this.#dataBitsList = ["8 bits", "7 bits", "6 bits", "5 bits"];
        this.#parityList = ["None", "Odd", "Even", "Mark", "Space"];

        this.state = {
            portValue: "",
            bandRateValue: this.#bandRateList[0],
            dataBitsValue: this.#dataBitsList[0],
            parityValue: this.#parityList[0],
            portList: [],
            connected: false,
            pendingOperation: false
        }

        const { serialClient } = props
        serialClient?.onConnected(() => {
            serialClient.getPortList().then(ports => {
                this.setState({ 'portList': ports, portValue: ports.length > 0 ? ports[0] : "" });
            })
        });
    }

    #getSerialMode(): SerialMode {
        const sm: SerialMode = {
            DataBits: this.#bitWidthMap[this.state.dataBitsValue],
            Parity: this.#parityMap[this.state.parityValue],
            BaudRate: parseInt(this.state.bandRateValue),
            StopBits: 0,
            InitialStatusBits: 0
        }
        return sm;
    }

    #setStatusBarState() {
        const { bandRateValue, portValue, connected } = this.state
        if (connected) {
            this.props.postStatusUpdate('port', "Open, " + portValue + " " + bandRateValue);
        } else {
            this.props.postStatusUpdate('port', "Closed");
        }

    }

    async #setMode() {
        this.setState({ pendingOperation: true })
        const mode = this.#getSerialMode()
        return this.props.serialClient.setMode(mode).then(() => {
            this.#lastSerialMode = mode;
            this.#setStatusBarState();
        }).finally(() => {
            this.setState({ pendingOperation: false })
        })
    }

    #reportError(message: string) {
        this.props.postStatusUpdate('port', message);
    }

    #openPort() {
        this.setState({ pendingOperation: true })

        this.props.serialClient.open(this.state.portValue).then(() => {
            this.setState({ connected: true, pendingOperation: false }, () => {
                this.#setStatusBarState();
            });

        }).catch((err) => {
            this.#reportError(err);

        }).finally(() => {
            this.setState({ pendingOperation: false });
        })
    }

    #openButtonClick() {
        const { connected } = this.state;
        if (!connected) {
            if (!this.#lastSerialMode) {
                this.#setMode().then(() => this.#openPort());
            } else {
                this.#openPort();
            }
        } else {
            this.props.serialClient.close()
                .catch(this.#reportError)
                .finally(() => {
                    this.setState({ connected: false, pendingOperation: false }, () => {
                        this.#setStatusBarState();
                    });

                })
        }
    }

    #onChange(listId: string, value: string) {
        const id = listId + 'Value';
        let state = {}
        state[id] = value;
        this.setState(state);

    }

    render() {
        const state: State = this.state as State;
        //<DropDown onChange={(value) => this.#onChange("bandRate", value)} label="Band Rate" items={this.#bandRateList} enabled={!state.pendingOperation} />
        return <div class="form-v">

            <DropDown onChange={(value) => this.#onChange("port", value)} label="Port" items={state.portList} enabled={!state.pendingOperation && !state.connected} />
            <TextInput type="number" value={state.bandRateValue} size={5} onChange={(elm) => this.#onChange("bandRate", elm.value)} label="Band Rate" valueList={this.#bandRateList} enabled={!state.pendingOperation} />
            <DropDown onChange={(value) => this.#onChange("parity", value)} label="Parity" items={this.#parityList} enabled={!state.pendingOperation} />
            <DropDown onChange={(value) => this.#onChange("dataBits", value)} label="Data Bits" items={this.#dataBitsList} enabled={!state.pendingOperation} />

            <div>
                <button onClick={() => this.#openButtonClick()}>{state.connected ? "Close" : "Open"}</button>
            </div>
        </div>
    }
}