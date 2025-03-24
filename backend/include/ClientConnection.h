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

#pragma once
#include "Port.h"
#include "ClientMessageEncoding.h"
#include "esp_http_server.h"
#include <string>
//WebSocket Message Handling
class ClientConnection
{
protected:
    enum OperationResult
    {
        OperationResultOk = 0,
        OperationResultErrDecode,
        OperationResultErrBuffer,
        OperationResultFailed,
        OperationNotPermitted
    };
    Port *port;
    bool authenticated;

public:
    ClientConnection() : port(nullptr),authenticated(false), lastModeRequest({}){};
    virtual ~ClientConnection();
    void handleMessage(char *payload, int size);

private:
    MessageEncoding::ModeRequest lastModeRequest;

    virtual bool writeMessage(const char *payload, const int payloadSize, bool block) = 0;
    virtual bool writeErrorMessage(MessageDecoder::MessageType msgType, std::string& erroMessage) = 0;
    bool applyMode(Port *port, MessageEncoding::ModeRequest mode);
};
