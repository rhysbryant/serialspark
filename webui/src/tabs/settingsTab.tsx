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
import { AuthSettings, CertSettings, WiFiSettings } from "../lib/settingsAPI";
import { AbstractTab } from "./abstractTab";
import { AuthSettingsForm } from "./settings/auth";
import { CertSettingsForm } from "./settings/cert";
import { WifiSettingsForm } from "./settings/wifi";

interface SettingsTabState {

}

export default class SettingsTab extends AbstractTab<SettingsTabState> {
    #wifiSettings: WiFiSettings;
    #certSettings: CertSettings;
    #authSettings: AuthSettings
    constructor(props) {
        super(props);

        this.#wifiSettings = new WiFiSettings(props.auth);
        this.#certSettings = new CertSettings(props.auth);
        this.#authSettings = new AuthSettings(props.auth);
    }

    render() {
        const { state } = this;

        return <div>
            <h3>Secuerty</h3>
            <CertSettingsForm settingsAPI={this.#certSettings} onStatusChange={msg => this.currentOperation = msg} />
            <AuthSettingsForm settingsAPI={this.#authSettings} onStatusChange={msg => this.currentOperation = msg} />
            <h3>Wifi Settings</h3>
            <WifiSettingsForm settingsAPI={this.#wifiSettings} onStatusChange={msg => this.currentOperation = msg} />

        </div>
    }
}
