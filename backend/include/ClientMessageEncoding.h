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

#ifndef CLIENT_MESSAGE_ENCODING_H
#define CLIENT_MESSAGE_ENCODING_H
#include <stdint.h>

class MessageEncoding
{
public:
    struct OpenPortRequest
    {
        const char *portName;
        uint8_t nameSize;
    };
    struct ModeRequest
    {
        uint32_t baudRate;         // The serial port bitrate (aka Baudrate)
        uint8_t dataBits;          // Size of the character (must be 5, 6, 7 or 8)
        uint8_t parity;            // Parity (see Parity type for more info)
        uint8_t stopBits;          // Stop bits (see StopBits type for more info)
        uint8_t initialStatusBits; // Initial output modem bits status (if nil defaults to DTR=true and RTS=true)
    };
    struct ReadDataRequest
    {
        uint16_t length;
        uint16_t timeout;
    };

    struct WriteDataRequest
    {
        uint16_t length;
        char *payload;
    };

    enum MessageType : uint8_t
    {
        MessageTypeAuthenticate = 0,
        MessageTypeOpen = 1,
        MessageTypeClose = 2,
        MessageTypeSetMode = 3,
        MessageTypeGetMode = 4,
        MessageTypeReadData = 5,
        MessageTypeStartAsyncDataRead = 6,
        MessageTypeAsyncDataRead = 7,
        MessageTypeStopAsyncDataRead = 8,
        MessageTypeWriteData = 9,
        MessageTypeGetPortList = 10
    };

    static const int messageHeaderSize = 2;
};

class MessageDecoder : public MessageEncoding
{
public:
    MessageDecoder(const char *_payload, int _size);
    const MessageType messageType;

    bool readOpenPortRequest(OpenPortRequest *);
    bool readSetModeRequest(ModeRequest *);
    bool readReadDataRequest(ReadDataRequest *);
    bool readWriteDataRequest(WriteDataRequest *);

private:
    const char *payload;
    const int payloadSize;
};

class MessageEncoder : public MessageEncoding
{
public:
    char *payload;
    char *payloadBase;
    int payloadSize;
    MessageEncoder(MessageType msgType, const char *_payload, int payloadSize);
    bool writePortListHeader(int portCount);
    bool writePortListEntry(const char *portName, const uint8_t portNameSize);
};
#endif