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
import { SerialClient } from './serialClient.js'

export enum IntelHEXRecordType {
    Data = 0,
    EndOfFile = 1,
    ExtendedSegmentAddress = 2,
    StartSegmentAddress = 3,
    ExtendedLinearAddress = 4,
    StartLinearAddress = 5
}

export interface IntelHEXRecord {
    data: Uint8Array
    address: number
    type: IntelHEXRecordType
}

export class IntelHEXDecoder {
    #buffer: ArrayBuffer
    #strDecoder = new TextDecoder();
    #currentRecord: IntelHEXRecord
    #initialLength: number
    #readLength: number
    constructor(buffer: ArrayBuffer) {
        this.#buffer = buffer;
        this.#initialLength = buffer.byteLength;
        this.#readLength = 0;
    }

    get record(): IntelHEXRecord {
        return this.#currentRecord;
    }
    /**
     * the number of bytes read
     */
    get lengthRead(): number {
        return this.#readLength;
    }
    /**
     * reads the next data record
     * @returns true if record property was updated
     */
    next(): boolean {
        const buf = new Uint8Array(this.#buffer)
        let startOffset = buf.findIndex(val => val == 58)

        if (startOffset == -1) {
            return false;
        }
        startOffset++;

        const length = parseInt(this.#strDecoder.decode(new DataView(this.#buffer, startOffset, 2)), 16);
        //address type data checksum
        const lengthToLoad = 2 + 4 + 2 + (length * 2) + 2;
        const recordBytes = new Uint8Array(lengthToLoad / 2);
        const recordStr = this.#strDecoder.decode(new DataView(this.#buffer, startOffset, lengthToLoad));

        let bOffset = 0;
        let checkSum = 0;
        for (let i = 0; i < lengthToLoad; i += 2) {
            const tmp = parseInt(recordStr.substring(i, i + 2), 16);
            checkSum += tmp;
            recordBytes[bOffset++] = tmp;
        }

        //return false;
        const dv = new DataView(recordBytes.buffer);
        const address = dv.getUint16(1, false);
        const type = <IntelHEXRecordType>dv.getUint8(3);

        let record: IntelHEXRecord = {
            data: new Uint8Array(recordBytes.subarray(4, 4 + length)),
            address: address,
            type: type
        }

        if ((checkSum & 255) != 0) {
            throw "checksum error";
        }

        this.#readLength += startOffset;

        this.#buffer = this.#buffer.slice(startOffset);
        this.#currentRecord = record;
        return true;
    }

    static addressFromData(record: IntelHEXRecord): number {
        return (new DataView(record.data.buffer)).getUint16(0, true) << 24;;
    }
}

export default class Stm32BootLoaderClient {
    #GetVersionCommandID = [0x01];
    #GetIDCommandID = [0x02];
    #ReadMemoryCommandID = [0x11];
    #GoCommandID = [0x21];
    #WriteMemoryCommandID = [0x31];
    #ExtendedEraseCommandID = [0x44];
    #WriteProtectCommandID = [0x63];
    #WriteCommandID = [0x31];
    #eraseMemoryCommandID = [0x43]

    #ACK = 0x79;
    #NACK = 0x1F;

    #SyncByte = 0x7F;

    #timeout = 5000;
    #client: SerialClient

    constructor(client: SerialClient) {
        this.#client = client;
    }

    #getCheckSum(data: Array<any> | Uint8Array, initial = 0xFF): number {
        let sum = initial;
        data.forEach(item => {
            sum ^= item;
        })
        return sum;
    }

    /**
     * 
     * @param payload the command payload
     * @param expectedResponseLength the length of data to read if an Ack is received
     * @returns the read payload
     */
    async #sendAndWaitAck(payload: Array<any> | Uint8Array, expectedResponseLength?: number, checksum = 255): Promise<ArrayBuffer> {
        return new Promise<null | ArrayBuffer>(async (resolve, reject) => {
            try {
                const data = new Uint8Array(1 + payload.length);
                const dv = new DataView(data.buffer);
                data.set(payload, 0);
                dv.setUint8(payload.length, this.#getCheckSum(payload, checksum));


                await this.#client.write(data)
                const ackResponse = new Int8Array(await this.#read(1));
                if (ackResponse[0] != this.#ACK) {
                    throw "expected ACK got " + (ackResponse[0] == this.#NACK ? "NACK" : ackResponse[0]);
                }
                if (expectedResponseLength != undefined && expectedResponseLength > 0) {
                    resolve(await this.#read(expectedResponseLength));
                } else {
                    resolve(null);
                }
            } catch (e) {
                reject(e);
            }
        })
    }

    async #read(length: number) {
        return this.#client.read(length, this.#timeout)
    }

    async #write(payload: any[] | Uint8Array) {
        return this.#client.write(payload)
    }

    /**
     * get the STM32 product ID
     * @returns the pid
     */
    async getProductID() {
        return new Promise<string>(async (resolve, reject) => {

            try {
                const response = await this.#sendAndWaitAck(this.#GetIDCommandID, 4);
                const dv = new DataView(response);
                if (dv.getInt8(3) != this.#ACK) {
                    throw "expected ACK";
                }

                resolve(dv.getInt8(1).toString(16) + dv.getInt8(2).toString(16));
            } catch (e) {
                reject(e);
            }

        });
    }

    async getVersion() {
        return new Promise<number>(async (resolve, reject) => {
            try {
                const data = new Uint8Array(await this.#sendAndWaitAck(this.#GetVersionCommandID, 4));
                if (data.length != 4 || data[3] != this.#ACK) {
                    throw "expected ACK";
                }
                resolve(data[0]);

            } catch (e) {
                reject(e);
            }

        });
    }

    #getUint32AsBytes(value: number): Uint8Array {

        const buffer = new ArrayBuffer(4);
        new DataView(buffer).setUint32(0, value, false);
        return new Uint8Array(buffer);
    }
    /**
     * read the memory at the given address
     * @param address the stm32 memory address
     * @param length the number of bytes to read up to 255
     * @returns the data
     */
    async readMemory(address: number, length: number) {
        return new Promise<ArrayBuffer>(async (resolve, reject) => {
            try {
                if (length > 255) {
                    throw "length must be under 255";
                }

                await this.#sendAndWaitAck(this.#ReadMemoryCommandID);
                await this.#sendAndWaitAck(this.#getUint32AsBytes(address), 0, 0);

                resolve(await this.#sendAndWaitAck([length - 1], length));
            } catch (e) {
                reject(e);
            }
        });
    }
    /**
     * erase memory
     * @param pageNumbers the pages to erase null to erase all pages
     * @returns 
     */
    async erase(pageNumbers?: Array<number>, extended?: boolean) {
        return new Promise<void>(async (resolve, reject) => {
            try {
                if (pageNumbers?.some(value => value >= 255)) {
                    throw "page number must be < 255";
                }

                if (extended == undefined) {
                    extended = await this.getVersion() >= 3;
                }

                const cmd = extended ? this.#ExtendedEraseCommandID : this.#eraseMemoryCommandID;
                await this.#sendAndWaitAck(cmd)

                if (pageNumbers == undefined) {
                    if (extended) {
                        await this.#sendAndWaitAck([0xFF, 0xFF], 0, 0);
                    } else {
                        await this.#write([0xFF, 0x00]);
                        const result = new Uint8Array(await this.#read(1));
                        if (result.length != 1 || (result[0] != this.#ACK && result[0] != this.#NACK)) {
                            throw "erase failed";
                        }
                    }

                } else {
                    const dataForSend = new Uint8Array(pageNumbers.length);

                    if (extended) {
                        const dv = new DataView(dataForSend.buffer, 0);
                        dv.setUint16(0, pageNumbers.length, true)
                        pageNumbers.forEach((val, index) => dv.setUint16(2 + (index * 2), val, true));
                    } else {
                        dataForSend.set([pageNumbers.length], 0)
                        dataForSend.set(pageNumbers, 1);
                    }

                    await this.#sendAndWaitAck(new Uint8Array(dataForSend.buffer));
                }
                resolve();
            } catch (e) {
                reject(e);
            }
        });

    }
    /**
     * write to the given memory address
     * @param address the stm32 memory address
     * @param payload the data to write must be 255 or less
     * @returns the data
     */
    async writeMemory(address: number, payload: ArrayBuffer) {
        return new Promise<void>(async (resolve, reject) => {
            try {
                if (payload.byteLength > 255) {
                    throw "length must be under 255";
                }

                await this.#sendAndWaitAck(this.#WriteCommandID);
                await this.#sendAndWaitAck(this.#getUint32AsBytes(address), 0, 0);

                const dataForSend = new Uint8Array(payload.byteLength + 1);
                const payloadByteArray = new Uint8Array(payload);

                dataForSend.set([payload.byteLength - 1], 0);
                dataForSend.set(payloadByteArray, 1);

                await this.#sendAndWaitAck(dataForSend, 0, 0);

                resolve();
            } catch (e) {
                reject(e);
            }
        });
    }
    /**
     * parses and uploads contents of a intel .hex file
     * @param buffer buffer containing the contents of an intel hex formatted file
     * @param progressCallback called once a record is processed
     * @returns the startup address found
     */
    async writeFromIntelHEX(buffer: ArrayBuffer, progressCallback: (percent: number) => void) {
        return new Promise<number>(async (resolve, reject) => {
            const intelHEXDecoder = new IntelHEXDecoder(buffer);
            let extendedAddress = 0;
            let startAddress = 0;
            try {
                while (intelHEXDecoder.next()) {
                    const record = intelHEXDecoder.record
                    switch (record.type) {
                        case IntelHEXRecordType.Data:
                            await this.writeMemory(extendedAddress + record.address, record.data);
                            break;
                        case IntelHEXRecordType.ExtendedLinearAddress:
                            extendedAddress = IntelHEXDecoder.addressFromData(record);
                            break;
                        case IntelHEXRecordType.StartLinearAddress:
                            startAddress = IntelHEXDecoder.addressFromData(record);
                            break;
                        case IntelHEXRecordType.EndOfFile:

                            break;
                        default:
                            throw "record type not supported";
                    }
                    progressCallback(intelHEXDecoder.lengthRead);
                }
                resolve(startAddress);
            } catch (e) {
                reject(e);
            }
        });
    }

    async verifyWithIntelHEX(buffer: ArrayBuffer, progressCallback: (percent: number) => void) {
        return new Promise<number>(async (resolve, reject) => {
            const intelHEXDecoder = new IntelHEXDecoder(buffer);
            let extendedAddress = 0;
            let startAddress = 0;
            try {
                while (intelHEXDecoder.next()) {
                    const record = intelHEXDecoder.record
                    switch (record.type) {
                        case IntelHEXRecordType.Data:
                            const data = new Uint8Array(await this.readMemory(extendedAddress + record.address, record.data.byteLength));
                            if (data.length != record.data.byteLength || data.some((value, index) => record.data[index] != value)) {
                                reject("mismatch at address " + (extendedAddress + record.address));
                                return;
                            }
                            break;
                        case IntelHEXRecordType.ExtendedLinearAddress:
                            extendedAddress = IntelHEXDecoder.addressFromData(record);
                            break;
                        case IntelHEXRecordType.StartLinearAddress:
                            startAddress = IntelHEXDecoder.addressFromData(record);
                            break;
                        case IntelHEXRecordType.EndOfFile:

                            break;
                        default:
                            reject("record type not supported");
                            return;
                    }
                    progressCallback(intelHEXDecoder.lengthRead);
                }
                resolve(startAddress);
            } catch (e) {
                reject(e);
            }
        });
    }
    /**
     * sends the GO command to the device being programmed
     * jumps to the passed memory address and starts executing
     * @param address the program start address
     * @returns 
     */
    async go(address: number) {
        return new Promise<void>(async (resolve, reject) => {
            try {
                await this.#sendAndWaitAck(this.#GoCommandID);
                await this.#sendAndWaitAck(this.#getUint32AsBytes(address), 0, 0);
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    }
    /**
     * sendSyncByte()
     */
    async sendSyncByte() {
        return new Promise<void>(async (resolve, reject) => {
            try {
                await this.#write([this.#SyncByte])
                const result = new Uint8Array(await this.#read(1))
                if (result.length != 1 || (result[0] != this.#ACK && result[0] != this.#NACK)) {
                    reject("not in sync");
                    return;
                }
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    }
}
