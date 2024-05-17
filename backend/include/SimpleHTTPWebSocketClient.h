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

#ifndef SIMPLEHTTPWEBSOCKETCLIENT
#define SIMPLEHTTPWEBSOCKETCLIENT
#include "ClientConnection.h"
#include "ServerConnection.h"
#include "Websocket.h"
using SimpleHTTP::ServerConnection;
using SimpleHTTP::Websocket;
//websocket message handling impl for SimpleHTTP lib
class SimpleHTTPWebSocketClient : public ClientConnection
{
private:
    const ServerConnection *conn;

    bool writeMessage(const char *payload, const int payloadSize,bool block);
    bool writeErrorMessage(MessageDecoder::MessageType msgType, std::string& erroMessage);

public:
    SimpleHTTPWebSocketClient(ServerConnection *_conn) :ClientConnection(), conn(_conn) {}
    ~SimpleHTTPWebSocketClient(){}
};
#endif