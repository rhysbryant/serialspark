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

#include "SimpleHTTPWebSocketClient.h"
#include "esp_log.h"
#include <string>
#include "common.h"
using SimpleHTTP::Result;
using SimpleHTTP::Websocket;

bool SimpleHTTPWebSocketClient::writeMessage(const char *msgPayload, const int payloadSize,bool block)
{
    auto c = (SimpleHTTP::ServerConnection *)conn;
    if(block){
        
        while(!c->hasAvailableSendBuffer()){
            sys_delay_ms(1);
        }
    }

    Websocket::Payload payload ={
        (const uint8_t *)msgPayload,
        (uint16_t)payloadSize,
        false,
        nullptr
    };

    auto result = Websocket::writeFrame(c, Websocket::FrameTypeBin, &payload) == SimpleHTTP::OK;
    if (!result)
    {
        ESP_LOGE(__FUNCTION__, "writeMessage:send fail");
    }
    return result;
}

bool SimpleHTTPWebSocketClient::writeErrorMessage(MessageDecoder::MessageType msgType,  std::string& erroMessage)
{

    Websocket::Payload payload ={
        (const uint8_t *)erroMessage.c_str(),
        erroMessage.size(),
        false,
        nullptr
    };    

    auto result = Websocket::writeFrame((SimpleHTTP::ServerConnection *)conn, Websocket::FrameTypeText, &payload) == SimpleHTTP::OK;
    if (!result)
    {
        ESP_LOGE(__FUNCTION__, "writeErrorMessage:send fail");
    }

    return result;
}