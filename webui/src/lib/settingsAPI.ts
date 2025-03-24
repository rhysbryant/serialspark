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

export interface CertInfo {
    expiry?: string
    commonName?: string
    hasPK: boolean
}

export interface UserCreds {
    user: string
    password: string
}

export interface GetTokenResponse {
    token?: string
    sucsess: boolean
}

export class Auth {
    URL: string
    #token: string

    constructor(token: string) {
        this.#token = token
        this.URL = ""
    }

    get authHeader() {
        return {
            'authentication': `token ${this.#token}`
        };
    }

    static async getToken(user?: UserCreds) {
        return new Promise<GetTokenResponse>((resolve, reject) => {
            let fields = {}
            if (user != null) {
                fields = {
                    body: JSON.stringify(user),
                    method: "POST"
                }
            }
            fetch("/auth", fields).then(response => {
                if (response.ok) {
                    response.json().then(obj => {
                        resolve(obj as GetTokenResponse)
                    }).catch(reason => reject(reason));
                } else if (response.status == 401 || response.status == 403) {
                    resolve({ sucsess: false });
                } else {
                    resolve({ sucsess: true });
                    //reject("unexpected response");
                }
            }).catch(e => reject(e));
        });
    }
}

export class AuthSettings {
    #auth: Auth

    get #defaulOptions() {
        return {
            headers: this.#auth.authHeader
        }
    }

    constructor(auth: Auth) {
        this.#auth = auth;
    }

    async updateUser(newUser: UserCreds, currentUser?: UserCreds) {
        return new Promise<void>((resolve, reject) => {

            fetch(this.#auth.URL + "/auth/update", {
                method: "PUT", headers: this.#auth.authHeader,
                body: JSON.stringify({ 'current': currentUser, 'new': newUser })
            }).then(result => {
                if (result.ok) {
                    resolve();
                } else {
                    result.text().then(text => {
                        reject(text);
                    }).catch(e => reject(e));
                }
            }).catch(reason => reject(reason));
        })
    }

}

export class WiFiSettings {
    #auth: Auth

    get #defaulOptions() {
        return {
            headers: this.#auth.authHeader
        }
    }

    constructor(auth: Auth) {
        this.#auth = auth;
    }
    /**
     * runs a wifi scan on the server
     * @returns list of found wifi networks
     */
    async WifiScan() {
        return new Promise<Network[]>((resolve, reject) => {
            fetch(this.#auth.URL + "/wifi/scan", this.#defaulOptions).then(result => {
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
            fetch(this.#auth.URL + "/wifi", this.#defaulOptions).then(result => {
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

            fetch(this.#auth.URL + "/wifi", { method: "PUT", headers: this.#auth.authHeader, body: JSON.stringify({ [key]: network }) }).then(result => {
                if (result.ok) {
                    result.json().then(val => {
                        if (!val[key]) {
                            reject("unexpected response");
                            return;
                        }

                        const { success, message } = val[key];
                        if (!success) {
                            reject(message || "wifi config update failed");
                        } else {
                            resolve();
                        }
                    }).catch(reason => reject(reason))
                }
            }).catch(reason => reject(reason));
        })
    }
}

export class CertSettings {
    #auth: Auth

    constructor(auth: Auth) {
        this.#auth = auth
    }

    get #defaulOptions() {
        return {
            headers: this.#auth.authHeader
        }
    }

    async #putFile(path: string, file: ArrayBuffer) {
        return new Promise<void>((resolve, reject) => {
            fetch(this.#auth.URL + path, { method: "PUT", headers: this.#auth.authHeader, body: file }).then(result => {
                if (!result.ok) {
                    result.text().then(err => reject(err))
                } else {
                    resolve();
                }
            }).catch(reason => reject(reason));
        })
    }
    /**
     * upload the TLS cert chain
     * @param certFile TLS cert chain in PEM format
     * @returns 
     */
    async uploadCert(certFile: ArrayBuffer) {
        return this.#putFile("/tls/cert", certFile)
    }
    /**
     * upload the TLS private key
     * @param PKFile TLS private key in PEM format
     * @returns 
     */
    async uploadPK(PKFile: ArrayBuffer) {
        return this.#putFile("/tls/pk", PKFile)
    }
    /**
     * get information about the current TLS cert
     * @returns infra about the cert currently in use
     */
    async getTLSSetupInfo() {
        return new Promise<CertInfo>((resolve, reject) => {
            fetch(this.#auth.URL + "/tls", this.#defaulOptions).then(result => {
                if (result.ok) {
                    result.json().then(json => {
                        resolve(json);
                    }).catch(e => reject(e.toString()))
                } else {
                    result.text().then(err => reject(err))
                }
            }).catch(reason => reject(reason));
        });
    }

}