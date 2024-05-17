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

interface DisplayTabState {
    sendInProgress: boolean
    colsPerRow: number
}

export default class DisplayTab extends AbstractTab<DisplayTabState> {

    #colCount = 0;
    #currentRow: HTMLDivElement = null
    #table: Element
    #textForSendElm: HTMLInputElement

    #displayMode = {
        dataWidth: 1,
        base: 10,
        byteOrderLittleEndian: false
    }

    #displayModeList = ["ASCII", "Hex", "UInt8", "UInt16", "UInt32", "UInt64"];

    #displayModeMap = {
        "ASCII": {
            dataWidth: 1,
            base: 0,
            byteOrderLittleEndian: false
        },
        "Hex": {
            dataWidth: 1,
            base: 16,
            byteOrderLittleEndian: false
        },
        "UInt8": {
            dataWidth: 1,
            base: 10,
            byteOrderLittleEndian: false
        },
        "UInt16": {
            dataWidth: 2,
            base: 10,
            byteOrderLittleEndian: false
        },
        "UInt32": {
            dataWidth: 4,
            base: 10,
            byteOrderLittleEndian: false
        },
        "UInt64": {
            dataWidth: 8,
            base: 10,
            byteOrderLittleEndian: false
        }
    }

    #addRow() {

        this.#currentRow = document.createElement("div");
        this.#currentRow.className = "row";
        this.#table.appendChild(this.#currentRow);
    }

    #addColumn(value) {
        const colDiv = document.createElement("div");
        colDiv.className = "col";


        if (this.#displayMode.base == 0) {
            colDiv.innerText = String.fromCharCode(value)
        } else {
            colDiv.innerText = value.toString(this.#displayMode.base);
        }

        if (this.#colCount > this.state.colsPerRow) {
            this.#addRow();
            this.#colCount = 0;
        }

        this.#currentRow.appendChild(colDiv);
        this.#colCount ++;
    }

    #clearTable() {
        const table = this.#table;
        while (table.firstChild) {
            table.removeChild(table.lastChild);
        }
        this.#addRow();
    }

    #onDisplayModeSelectionChange(value) {
        let displayMode = this.#displayModeMap[value];

        if (this.#displayMode != displayMode) {
            this.#clearTable();
        }

        this.#displayMode = displayMode;
    }

    constructor(props) {
        super(props);
        this.#displayMode = this.#displayModeMap[this.#displayModeList[0]];
        this.state ={
            sendInProgress: false,
            colsPerRow: 50
        }
    }

    componentDidMount(): void {
        this.#addRow();
        this.props.dataUpdateFunc(this.#onAsyncData.bind(this));
    }

    #onAsyncData(buffer: ArrayBuffer) {
        const dataView = new DataView(buffer)
        let getFunc = (index) => { }
        const { dataWidth, byteOrderLittleEndian } = this.#displayMode;
        switch (dataWidth) {
            case 1:
                getFunc = (index) => dataView.getUint8(index);
                break;
            case 2:
                getFunc = (index) => dataView.getUint16(index, byteOrderLittleEndian)
                break;
            case 4:
                getFunc = (index) => dataView.getUint32(index, byteOrderLittleEndian)
                break;
            case 8:
                getFunc = (index) => dataView.getBigUint64(index, byteOrderLittleEndian)
                break;
        }

        for (let i = 0; i < (buffer.byteLength / dataWidth); i += dataWidth) {
            if (i + dataWidth <= buffer.byteLength) {
                this.#addColumn(getFunc(i))
            }
        }
    }

    #onSendTextClick(event: Event) {
        const { value } = this.#textForSendElm;

        this.setState({ sendInProgress: true });
        this.props.serialClient.writeString(value).finally(() => {
            this.setState({ sendInProgress: false });
        })
    }

    #onSendNumbersClick(event: Event) {
        const { value } = this.#textForSendElm;
        const data = new Uint8Array(value.split(" ").map(val => {
            return parseInt(val)
        }));

        this.setState({ sendInProgress: true });
        this.props.serialClient.write(data).finally(() => {
            this.setState({ sendInProgress: false });
        })
    }

    #onMaxColsCountChange(elm: HTMLInputElement) {
        this.setState({colsPerRow: parseInt(elm.value)});
    }

    render() {
        return <div>
            <div class="form-v">
                <div>
                    <DropDown label="display As" items={this.#displayModeList} onChange={this.#onDisplayModeSelectionChange.bind(this)} />
                    <TextInput value={this.state.colsPerRow.toString()} size={10} label="Columns Per Row" enabled={!this.state.sendInProgress} type="number" onChange={this.#onMaxColsCountChange.bind(this)} />
                    <TextInput size={20} label="Text For Send"  enabled={!this.state.sendInProgress} onChange={(elm) => { }} inputRef={(r) => this.#textForSendElm = r} >
                        <button {...(this.state.sendInProgress && { disable: true })} onClick={this.#onSendNumbersClick.bind(this)} >Send Numbers</button>
                        <button {...(this.state.sendInProgress && { disable: true })} onClick={this.#onSendTextClick.bind(this)} >Send Text</button>
                    </TextInput>
                </div>
            </div>
            <button onClick={this.#clearTable.bind(this)}>Clear</button>
            <div ref={(r) => this.#table = r} >

            </div>
            <div>

            </div>
        </div>;
    }
}