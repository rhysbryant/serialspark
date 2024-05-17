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
import { SerialClient } from "./serialClient";

//this module is work in process intended to be a wrapper round serialClient
//that allows use with libraries that expect a SerialPort Object
// from chromes serialPort API

interface SerialOutputSignals {
    dataTerminalReady: boolean;
    requestToSend: boolean;
    break: boolean;
};


export default class SerialAPICompatibly {
    #serialClient:SerialClient
    constructor(serialClient: SerialClient) {
        this.#serialClient = serialClient;
    }

    set onconnect(Ev){

    }

    set ondisconnect(ev) {

    }

    start(controller) {

    }

    get readable(): ReadableStream {
        const sc= this.#serialClient
        return new ReadableStream<Uint8Array>({
            start(controller) {
                sc.onAsyncData((data) => controller.enqueue(new Uint8Array(data)))
                sc.startAsyncRead();
            },
            pull(controller: ReadableStreamDefaultController<Uint8Array>){
                
            }        
        });
    }

    get writable(): WritableStream {
        const sc= this.#serialClient
        return new WritableStream<Uint8Array>({
            start(controller: WritableStreamDefaultController){
                
            },
            write(chunk) {
                return new Promise((resolve, reject) => {
                        sc.write(chunk).then(()=> resolve())
                        .catch(reason => reject(reason));
                });
            }
        });
    }
}
