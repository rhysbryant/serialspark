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
#include "memory.h"
#include "driver/uart.h"

const Port PortManager::ports[] = {Port(UART_NUM_0, "UART 0", 0, 0), Port(UART_NUM_1, "UART 1", 9, 10), Port(UART_NUM_2, "UART 2", 16,17)};
const int PortManager::portCount = (sizeof(PortManager::ports) / sizeof(Port));
bool PortManager::portLock[(sizeof(PortManager::ports) / sizeof(Port))] = {};

void PortManager::init()
{
    for (int i = 0; i < portCount; i++)
    {
        portLock[i] = false; // xSemaphoreCreateMutex();
    }
}

const Port *PortManager::requestOwnershipTakeover(const char *portName)
{
    int index = indexOfPort(portName);
    if (index == -1)
    {
        return nullptr;
    }

    // xSemaphoreTake(portLock[index], 10 / portTICK_PERIOD_MS) == pdTRUE
    if (!portLock[index])
    {
        portLock[index] = true;
        return &ports[index];
    }

    return nullptr;
}

bool PortManager::releaseOwnership(Port *port)
{
    int index = indexOfPort(port->portName);
    if (index == -1)
    {
        return false;
    }
    port->stopContinuesRead();
    port->setContinuesReadOnDataCallback(nullptr);
    portLock[index] = false;
    return true; // xSemaphoreGive(portLock[index]) == pdTRUE;
}

int PortManager::indexOfPort(const char *portName)
{
    for (int i = 0; i < portCount; i++)
    {
        if (strcmp(portName, ports[i].portName) == 0)
        {
            return i;
        }
    }

    return -1;
}