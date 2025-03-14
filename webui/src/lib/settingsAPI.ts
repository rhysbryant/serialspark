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
export interface Network {
    securityType: string

    name: string
    psk?: string
    signalInfo?: string
    IPAddress?: string
    supportedSecurityTypes?: string[]
}

export enum NetworkType {
    Client, AP
}

export class WiFiSettings {
    #baseURL: string

    constructor(url: string) {
        this.#baseURL = url;
    }
    /**
     * runs a wifi scan on the server
     * @returns list of found wifi networks
     */
    async WifiScan() {
        return new Promise<Network[]>((resolve, reject) => {
            fetch(this.#baseURL + "/wifi/scan").then(result => {
                if (result.ok) {
                    result.json().then(obj => {
                        resolve(obj as Network[])
                    }).catch(reason => reject(reason));
                }
            }).catch(reason => reject(reason));
        })
    }

    /**
     * 
     * @returns the currently configured network on the server
     */
    async getSavedNetwork(networkType?: NetworkType) {
        return new Promise<Map<string, Network>>((resolve, reject) => {
            fetch(this.#baseURL + "/wifi").then(result => {
                if (result.ok) {
                    result.json().then(obj => {
                        resolve(obj)
                    }).catch(reason => reject(reason));
                }
            }).catch(reason => reject(reason));
        })
    }
    /**
     * set the network for the server to connect to
     * @param network 
     * @returns 
     */
    async setSavedNetwork(networkType: NetworkType, network: Network) {
        return new Promise<void>((resolve, reject) => {
            const key = networkType == NetworkType.AP ? "ap" : "sta";

            fetch(this.#baseURL + "/wifi", { method: "PUT", body: JSON.stringify({ [key]: network }) }).then(result => {
                if (result.ok) {
                    result.json().then(val => {
                        if (!val[key]) {
                            reject("unexpected response");
                            return;
                        }

                        const { success, message } = val[key];
                        if(!success){
                            reject(message||"wifi config update failed");
                        }else{
                            resolve();
                        }
                    }).catch(reason => reject(reason))
                }
            }).catch(reason => reject(reason));
        })
    }
}