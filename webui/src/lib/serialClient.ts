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
export const SerialModeNoParity = 0
export const SerialModeOddParity = 1
export const SerialModeEvenParity = 2
export const SerialModeMarkParity = 3
export const SerialModeSpaceParity = 4

export interface SerialMode {
    BaudRate: number
    DataBits: number
    Parity: number,
    StopBits: number,//1 stop bit
    InitialStatusBits: number
}

interface ResponseCallback {
    onSuccess: (buff: ArrayBuffer) => void
    onError: (msg: string) => void
}

type AsyncResponse = (response: ArrayBuffer) => void
/**
 * client interface to the serial server
 * uses a websocket
 */
export class SerialClient {
    #CmdOpen = 1
    #CmdClose = 2
    #CmdSetMode = 3
    #CmdGetMode = 4
    #CmdReadData = 5
    #CmdStartAsyncDataRead = 6
    #CmdAsyncData = 7
    #CmdStopAsyncDataRead = 8
    #CmdWriteData = 9
    #CmdGetPortList = 10
    #headerSize = 3
    #RequestProtocolVersion = 1

    #websocket: WebSocket
    #responseQueue = new Array<ResponseCallback>();
    #readyEvents = []
    #asyncNewDataEvent = new Array<AsyncResponse>();
    constructor(address: string) {
        this.#websocket = new WebSocket(address);
        this.#websocket.onopen = this.#onOpen.bind(this);
        this.#websocket.onmessage = this.#onData.bind(this);
        this.#websocket.onerror = this.#onError.bind(this);
        this.#websocket.onclose = this.#onClose.bind(this);
    }

    onSocketError: (message: string) => void = null;
    onSocketClose: (reason: string) => void = null;

    #onError(event: ErrorEvent) {
        if (this.onSocketError != null) {
            this.onSocketError(event.message);
        }
    }

    #onClose(event: CloseEvent) {
        if (this.onSocketClose != null) {
            this.onSocketClose(event.reason);
        }
    }

    #onData(event: MessageEvent<any>) {

        if (typeof (event.data) == "string") {
            const next = this.#responseQueue.shift()
            if (next === undefined) {
                console.log("data unexpected", event);
                return;
            }
            next.onError(event.data)
        } else {
            event.data.arrayBuffer().then(buff => {
                const dv = new DataView(buff)
                const firstByte = dv.getUint8(0);
                if (firstByte === this.#CmdAsyncData) {
                    this.#asyncNewDataEvent.forEach((item) => item(buff.slice(1)))
                } else {
                    const next = this.#responseQueue.shift()
                    if (next === undefined) {
                        console.log("data unexpected", event, firstByte);
                        return;
                    }

                    next.onSuccess(buff.slice(1))
                }
            });
        }
    }

    #onOpen(event: Event) {
        this.#readyEvents.forEach((item) => item())
    }

    async #send(data: ArrayBuffer | Uint8Array) {
        return new Promise<ArrayBuffer>((resolve, reject) => {
            try {
                if (this.#websocket.readyState != WebSocket.OPEN) {
                    throw "not connected"
                }
                this.#websocket.send(data);
                this.#responseQueue.push({ onSuccess: resolve, onError: reject });
            } catch (e) {
                reject(e);
            }
        });
    }

    async #sendCommand(cmdId: number, payload?: Uint8Array | Array<any>) {
        if (payload === undefined) {
            payload = []
        }
        const data = new Uint8Array(2 + payload.length);
        const dv = new DataView(data.buffer);
        dv.setUint8(0, cmdId)
        dv.setUint8(1, this.#RequestProtocolVersion)
        data.set(payload, 2)

        return this.#send(data)
    }

    #sendCommandVoidResponse(cmdId: number, payload?: Uint8Array | Array<any>) {
        return new Promise<void>((resolve, reject) => {
            this.#sendCommand(cmdId,payload)
            .then(r => resolve())
            .catch(e => reject(e))
        })
    }
    /**
     * closes the port
     * @returns 
     */
    async close() {
        return this.#sendCommandVoidResponse(this.#CmdClose, [])
    }
    /**
     * 
     * @param length the number of bytes to read
     * @param timeout the max time to wait
     * @returns Array buffer
     */
    async read(length: number, timeout: number): Promise<ArrayBuffer> {
        return new Promise(async (resolve, reject) => {
            const data = new Uint8Array(4);
            const dv = new DataView(data.buffer);
            dv.setUint16(0, length, true);
            dv.setUint16(2, timeout, true);
            try {
                resolve(await this.#sendCommand(this.#CmdReadData, data))
            } catch (e) {
                reject(e);
            }
        })
    }

    onConnected(f) {
        this.#readyEvents.push(f);
    }
    /**
     * add a callback to be called on new data in async mode
     * started by calling startAsyncRead()
     * @param f the function
     */
    async onAsyncData(f: AsyncResponse) {
        this.#asyncNewDataEvent.push(f);
    }
    /**
     * starts async sending of data
     * @returns void
     */
    async startAsyncRead() {
        return this.#sendCommandVoidResponse(this.#CmdStartAsyncDataRead)
    }
    /**
     * stops async sending of data
     * @returns void
     */
    async stopAsyncRead() {
        return this.#sendCommandVoidResponse(this.#CmdStopAsyncDataRead)
    }
    /**
     * write data to the serial port
     * @param payload the string to send
     * @returns 
     */
    async write(payload: Array<any> | Uint8Array) {
        const data = new Uint8Array(2 + payload.length);
        const dv = new DataView(data.buffer);
        dv.setUint16(0, payload.length, true);
        data.set(payload, 2)

        return this.#sendCommandVoidResponse(this.#CmdWriteData, data)
    }
    /**
     * write a string to the serial port
     * @param str the string to send
     * @returns 
     */
    async writeString(str: string) {
        const encoder = new TextEncoder();
        return this.write(encoder.encode(str))
    }
    /**
     * send the serial port configuration
     * @param mode the serial port config
     * @returns 
     */
    async setMode(mode: SerialMode) {

        const data = new Uint8Array(8);
        const dv = new DataView(data.buffer);
        var offset = 0;

        dv.setUint32(offset, mode.BaudRate, true);
        offset += 4
        dv.setUint8(offset++, mode.DataBits);
        dv.setUint8(offset++, mode.Parity);
        dv.setUint8(offset++, mode.StopBits);
        dv.setUint8(offset++, mode.InitialStatusBits);

        return this.#sendCommandVoidResponse(this.#CmdSetMode, data)
    }
    /**
     * opens the port
     * @param portName the name of the port to open
     * @returns 
     */
    async open(portName: string) {

        const buffer = new ArrayBuffer(portName.length + 1);
        const dv = new DataView(buffer);
        dv.setUint8(0, portName.length)

        const encoder = new TextEncoder();
        encoder.encodeInto(portName, new Uint8Array(buffer, 1, portName.length))

        return this.#sendCommandVoidResponse(this.#CmdOpen, new Uint8Array(buffer));
    }

    /**
     * get the list of available ports on the server 
     * @returns 
     */
    async getPortList(): Promise<Array<string>> {
        return new Promise(resolve => {

            this.#sendCommand(this.#CmdGetPortList, []).then((buff) => {

                const dv = new DataView(buff)
                const portCount = dv.getUint8(0);
                var offset = 1;
                const decoder = new TextDecoder();
                const portList = new Array();

                for (var i = 0; i < portCount; i++) {
                    const strLen = dv.getUint8(offset)
                    offset++;
                    const strPortName = decoder.decode(new DataView(buff, offset, strLen));
                    offset += strLen;
                    portList.push(strPortName);
                }

                resolve(portList);
            })
        })
    }
}
