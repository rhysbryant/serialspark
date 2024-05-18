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

#include "ClientMessageEncoding.h"
#include "memory.h"

MessageDecoder::MessageDecoder(const char *_payload, int _size) : messageType((MessageType)_payload[0]), payload(_payload + messageHeaderSize), payloadSize(_size - messageHeaderSize)
{
}

bool MessageDecoder::readOpenPortRequest(OpenPortRequest *out)
{
    out->nameSize = (uint8_t)payload[0];
    if (out->nameSize > payloadSize)
    {
        return false;
    }
    out->portName = payload + 1;

    return true;
}

bool MessageDecoder::readSetModeRequest(ModeRequest *out)
{
    if (payloadSize < 8)
    {
        return false;
    }

    /*
        uint32_t baudRate;
        uint8_t dataBits;
        uint8_t parity;
        uint8_t stopBits;
        uint8_t initialStatusBits;
    */
    out->baudRate = payload[0] | (payload[1] << 8) | (payload[2] << 16) | (payload[3] << 24);
    out->dataBits = payload[4];
    out->parity = payload[5];
    out->stopBits = payload[6];
    out->initialStatusBits = payload[7];

    return true;
}

bool MessageDecoder::readReadDataRequest(ReadDataRequest *out)
{
    /**
     uint16_t length
     uint16_t timeout
    */
    if (payloadSize < sizeof(uint16_t) + sizeof(uint16_t))
    {
        return false;
    }
    out->length = payload[0] | (payload[1] << 8);
    out->timeout = payload[2] | (payload[3] << 8);

    return true;
}

bool MessageDecoder::readWriteDataRequest(WriteDataRequest *out)
{
    if (payloadSize < sizeof(uint16_t))
    {
        return false;
    }
    out->length = payload[0] | (payload[1] << 8);
    if (out->length + sizeof(uint16_t) < payloadSize)
    {
        return false;
    }
    out->payload = (char *)payload + 2;

    return true;
}

MessageEncoder::MessageEncoder(MessageType msgType, const char *_payload, int payloadSize)
{
    payloadBase = (char *)_payload;
    payload = (char *)_payload;
    payload[0] = msgType;
    payload++;
}

bool MessageEncoder::writePortListHeader(int portCount)
{
    (*payload) = portCount;
    payload++;
    return true;
}

bool MessageEncoder::writePortListEntry(const char *portName, const uint8_t portNameSize)
{
    *(payload++) = portNameSize;
    memcpy(payload, portName, portNameSize);
    payload += portNameSize;

    return true;
}