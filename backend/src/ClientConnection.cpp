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

#include "PortManager.h"
#include "ClientConnection.h"
#include "string.h"
#include "memory.h"
#include "esp_log.h"
#include <string>

bool ClientConnection::applyMode(Port *port, MessageEncoding::ModeRequest r)
{
    bool successful = true;

    if (!port->setBandRate(r.baudRate))
    {
        ESP_LOGI(__FUNCTION__, "setBandRate failed");
        successful = false;
    }

    if (!port->setDataBitsLength(r.dataBits))
    {
        ESP_LOGI(__FUNCTION__, "setDataBitsLength failed");
        successful = false;
    }

    if (port->setParity((Port::PortParity)r.parity))
    {
        ESP_LOGI(__FUNCTION__, "setParity failed");
        successful = false;
    }

    if (!port->setStopBits((Port::PortStopBits)r.stopBits))
    {
        ESP_LOGI(__FUNCTION__, "setStopBits failed");
        successful = false;
    }

    return successful;
}

void ClientConnection::handleMessage(char *payload, int size)
{
    if (size == 0)
    {
        return;
    }

    MessageDecoder messageDecoder(payload, size);

    const char *failedToDecode = "MessageDecodeError";
    std::string errorMessage;

    ESP_LOGD(__FUNCTION__, "GOT MSG %d", messageDecoder.messageType);

    if (port == nullptr && (messageDecoder.messageType != MessageDecoder::MessageTypeSetMode && messageDecoder.messageType != MessageDecoder::MessageTypeOpen && messageDecoder.messageType != MessageDecoder::MessageTypeGetPortList))
    {
        errorMessage = "Operation not allowed when port is closed";
        writeErrorMessage(messageDecoder.messageType, errorMessage);
        return;
    }

    switch (messageDecoder.messageType)
    {
    case MessageDecoder::MessageTypeAuthenticate:
        //TODO
        break;
    case MessageDecoder::MessageTypeOpen:
    {
        MessageDecoder::OpenPortRequest r = {};
        if (!messageDecoder.readOpenPortRequest(&r))
        {
            errorMessage = failedToDecode;
            break;
        }

        char portName[256] = "";
        mempcpy(portName, r.portName, r.nameSize);

        auto p = PortManager::requestOwnershipTakeover(portName);
        if (p == nullptr)
        {
            errorMessage = "Port already inuse";
            break;
        }

        auto asyncSendDataCallback = [this](char *data, uint16_t length)
        {
            MessageEncoder response(MessageEncoder::MessageTypeAsyncDataRead, (char *)data, length);
            writeMessage(response.payloadBase, length + 1, true);
        };

        port = (Port *)p;
        port->setContinuesReadOnDataCallback(asyncSendDataCallback);
        if (!port->init())
        {
            PortManager::releaseOwnership(port);
            errorMessage = "Port setup failed";
            break;
        }

        applyMode(port, lastModeRequest);
        break;
    }
    case MessageDecoder::MessageTypeClose:
        if (!PortManager::releaseOwnership(port))
        {
            errorMessage = "Failed to release port";
        }

        port->stopContinuesRead();
        port = nullptr;
        break;
    case MessageDecoder::MessageTypeSetMode:
    {
        MessageDecoder::ModeRequest r;
        if (!messageDecoder.readSetModeRequest(&r))
        {
            errorMessage = failedToDecode;
            break;
        }
        lastModeRequest = r;

        if (port != nullptr && !applyMode(port, r))
        {
            errorMessage = "Failed to change mode";
        }
        break;
    }
    case MessageDecoder::MessageTypeGetMode:

        break;
    case MessageDecoder::MessageTypeReadData:
    {
        MessageDecoder::ReadDataRequest r = {};
        if (!messageDecoder.readReadDataRequest(&r))
        {
            errorMessage = failedToDecode;
            break;
        }
        char buff[512] = "";
        buff[0] = messageDecoder.messageType;

        if (r.length >= sizeof(buff) - 1)
        {
            errorMessage = "Port read request too large";
            break;
        }
        if (!port->read((char *)buff + 1, r.length, r.timeout))
        {
            errorMessage = "Port read failed";
            break;
        }

        writeMessage(buff, r.length + 1, false);
        return;
    }
    case MessageDecoder::MessageTypeStartAsyncDataRead:
        port->startContinuesRead();
        break;
    case MessageDecoder::MessageTypeAsyncDataRead:
        /* not applicable to server */
        break;
    case MessageDecoder::MessageTypeStopAsyncDataRead:
        port->stopContinuesRead();
        break;
    case MessageDecoder::MessageTypeWriteData:
    {
        MessageDecoder::WriteDataRequest r = {};
        if (!messageDecoder.readWriteDataRequest(&r))
        {
            errorMessage = failedToDecode;
            break;
        }
        int lenSent = port->write(r.payload, r.length);
        if (lenSent != r.length)
        {
            errorMessage = "Port write failed";
        }
        break;
    }
    case MessageDecoder::MessageTypeGetPortList:
    {
        char buff[255] = "";
        MessageEncoder response(messageDecoder.messageType, buff, sizeof(buff));
        response.writePortListHeader(PortManager::portCount);
        for (int i = 0; i < PortManager::portCount; i++)
        {
            auto p = &PortManager::ports[i];
            response.writePortListEntry(p->portName, strlen(p->portName));
        }

        writeMessage(response.payloadBase, response.payload - response.payloadBase, false);
        return;
    }
    default:
        errorMessage = "unknown message";
        break;
    }

    if (!errorMessage.empty())
    {
        writeErrorMessage(messageDecoder.messageType, errorMessage);
    }
    else
    {
        char buff[1] = "";
        MessageEncoder response(messageDecoder.messageType, buff, sizeof(buff));
        writeMessage(response.payloadBase, response.payload - response.payloadBase, false);
    }
}

ClientConnection::~ClientConnection()
{
    if (port != nullptr)
    {
        PortManager::releaseOwnership(port);
    }
}