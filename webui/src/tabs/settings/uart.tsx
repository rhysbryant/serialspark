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
import { UARTConfig, UARTConfigErrorResonse, UARTSettings } from "../../lib/settingsAPI";
import { Button, CheckBox, DropDown, TextInput } from "../../commonControls";

interface SelectedItemState extends UARTConfig {
    invalidFields?: string[]
}

interface UARTSettingsState {
    ports: UARTConfig[]
    selectedPort: SelectedItemState
    saveInProgress: boolean
}

interface UARTSettingsProps {
    settingsAPI: UARTSettings
    onStatusChange: (msg: string) => void

}

export class UARTSettingsForm extends Component<UARTSettingsProps, UARTSettingsState> {

    #UARTIOProps = "TXIONum|RXIONum|RTSIONum|CTSIONum".split("|")
    constructor(props) {
        super(props);
        this.state = {
            ports: [],
            selectedPort: null,
            saveInProgress: false
        }
    }
    componentDidMount() {

        this.props.settingsAPI.getUARTConfig().then(ports => {
            this.setState({ ports: ports }, () => {
                const port = this.state.ports[0];
                this.setState({ selectedPort: { invalidFields: [], ...port } });
            })
        }).catch(r => {
            this.props.onStatusChange("UART Config Error" + r.toString());
        })

    }

    #saveOnClick() {
        this.setState({ saveInProgress: true });
        const portCfg = Object.assign({}, this.state.selectedPort);
        portCfg.defaults = null;

        const messagePrefix = "UART Config Update Error ";

        this.props.settingsAPI.setUARTConfig(portCfg).then(
            () => {
                this.props.onStatusChange("UART Config Update Sucsessful");
            }
        ).catch(r => {
            if (typeof (r) == 'string') {
                this.props.onStatusChange(messagePrefix + r.toString());
            } else {
                const errObj = r as UARTConfigErrorResonse;

                const selectedPort = this.state.selectedPort;
                selectedPort.invalidFields = errObj.invalidFields;

                this.setState({ selectedPort });
                this.props.onStatusChange(messagePrefix + errObj.message);
            }

        }).finally(() => {
            this.setState({ saveInProgress: false });
        });
    }

    #enabledChange(elm: HTMLInputElement) {
        let { selectedPort } = this.state;
        this.state.selectedPort.enabled = elm.checked;
        this.setState({ selectedPort: selectedPort });
    }

    #updateSelectedItemNumberField(field: string, value: string) {

        const iValue = parseInt(value);
        let { selectedPort } = this.state;
        selectedPort[field] = iValue;
        //clear the current field from the invalid fields list
        const fields = selectedPort.invalidFields;
        if(fields != null){
            selectedPort.invalidFields = fields.filter(item => item != field);
        }
        
        this.setState({ selectedPort: selectedPort });
    }

    #updateSelectedItemFieldToUnused(field: string) {
        let { selectedPort } = this.state;
        selectedPort[field] = -1;
        this.setState({ selectedPort: selectedPort });
    }

    render() {
        const { state } = this;
        const hasSelected = state.selectedPort != null;
        const { saveInProgress } = this.state;

        return <div>
            <details class="form-group" >
                <summary>UART IO Config</summary>
                <small>Note: Setting to pins already in use or unsupported by the chip can cause undefined behavur  </small>
                <div class=" form-v" >
                    <DropDown enabled={!saveInProgress} label="Port" items={state.ports?.length > 0 ? state.ports.map(n => n.name) : []}
                        onChange={elm => this.setState({ selectedPort: state.ports[elm.selectedIndex] })} >
                        <CheckBox label="Enabled" inline={true} onChange={this.#enabledChange.bind(this)} enabled={hasSelected} checked={hasSelected && state.selectedPort.enabled} />
                    </DropDown>

                    {
                        hasSelected ? this.#UARTIOProps.map(item => <TextInput
                            hasError={state.selectedPort.invalidFields?.includes(item)}
                            enabled={state.selectedPort.enabled && !saveInProgress}
                            type="number"
                            title={`default is ${state.selectedPort.defaults[item]}`}
                            onChange={elm => this.#updateSelectedItemNumberField(item, elm.value)}
                            label={item.replace("IONum", " GPIO Num")} value={state.selectedPort[item]} >
                            <Button label="Set as Unused" onClick={() => this.#updateSelectedItemFieldToUnused(item)} inline={true} enabled={!saveInProgress}
                            />
                        </TextInput>) :
                            <span>No port selected</span>
                    }
                    <Button label="Save"  onClick={this.#saveOnClick.bind(this)} enabled={hasSelected && !saveInProgress} />
                </div>
            </details>
        </div>
    }

}
