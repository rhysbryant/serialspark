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

#include "Port.h"
#include "esp_log.h"
Port::Port(uart_port_t _portNum, const char *_name, int RXPin, int TXPin) : portNum(_portNum), portName(_name)
{
    ready = false;
    readLock = xSemaphoreCreateMutex();
    if (_portNum)
    {
        uart_set_pin(_portNum, TXPin, RXPin, -1, -1);
    }
}

bool Port::init()
{
    if (!ready)
    {
        auto result = uart_is_driver_installed(portNum) || uart_driver_install(portNum, 1024 * 2, 0, 20, 0, 0) == ESP_OK;
        ESP_LOGI("SETUP","result %d",(int)result);

        if (result && xTaskCreate(Port::readLoop, "Port::loop()", configMINIMAL_STACK_SIZE * 5, this, 2, &readTask) == pdPASS)
        {
            ready = true;
            return true;
        }
        return false;
    }
    return true;
}

int Port::read(char *buf, uint32_t bufLen, int timeout)
{
    /*if (xSemaphoreTake(readLock, 20 / portTICK_PERIOD_MS) != pdTRUE)
    {
        return false;
    }*/

    int bytesToRead = bufLen;
    while (bytesToRead > 0)
    {
        ESP_LOGD(__FUNCTION__, "read %d bytes", (int)bytesToRead);
        int read = uart_read_bytes(portNum, buf, bytesToRead, timeout / portTICK_PERIOD_MS);
        if (read <= 0)
        {
            ESP_LOGD(__FUNCTION__, "read returned %d", (int)(read));
            // xSemaphoreGive(readLock);
            return 0;
        }
        bytesToRead -= read;
        buf += read;
    }

    auto result = bufLen - bytesToRead;

    // xSemaphoreGive(readLock);
    return result;
}

int Port::write(char *src, uint32_t len)
{
    auto sent = uart_write_bytes(portNum, src, len);
    if (sent)
    {
        // uart_wait_tx_done(portNum, 1000 / portTICK_PERIOD_MS);
    }
    return sent;
}

void Port::resumeRead()
{
    // vTaskResume(readTask);
}

void Port::suspendRead()
{
    // vTaskSuspend(readTask);
}

void Port::readLoop(void *arg)
{
    static_cast<Port *>(arg)->readLoop();
}

void Port::readLoop()
{
    ESP_LOGD(__FUNCTION__, "starting");

    while (1)
    {
        if (continuesReadEnabled && xSemaphoreTake(readLock, 20 / portTICK_PERIOD_MS) == pdTRUE)
        {

            int readLength = uart_read_bytes(portNum, readBuffer + reservedBufferHeadSpace, sizeof(readBuffer) - reservedBufferHeadSpace, 10 / portTICK_PERIOD_MS);

            if (readLength > 0)
            {
                ESP_LOGD(__FUNCTION__, "read returned %d bytes", (int)readLength);
                callback(readBuffer, readLength);
            }

            xSemaphoreGive(readLock);
        }
        else if (!continuesReadEnabled)
        {
            vTaskDelay(100 / portTICK_PERIOD_MS);
        }
    }
}

void Port::startContinuesRead()
{
    if (!continuesReadEnabled)
    {
        resumeRead();
    }
    continuesReadEnabled = true;
}

void Port::stopContinuesRead()
{
    if (!continuesReadEnabled)
    {
        return;
    }

    continuesReadEnabled = false;
    if (xSemaphoreTake(readLock, 1000 / portTICK_PERIOD_MS) == pdTRUE)
    {
        xSemaphoreGive(readLock);
    }
}

bool Port::setDataBitsLength(uint8_t size)
{
    uart_word_length_t wl;
    switch (size)
    {
    case 8:
        wl = UART_DATA_8_BITS;
        break;
    case 7:
        wl = UART_DATA_7_BITS;
        break;
    case 6:
        wl = UART_DATA_6_BITS;
        break;
    case 5:
        wl = UART_DATA_5_BITS;
        break;
    default:
        return false;
    }

    return uart_set_word_length(portNum, wl) == ESP_OK;
}

bool Port::setBandRate(uint32_t value)
{
    return uart_set_baudrate(portNum, value) == ESP_OK;
}

bool Port::setParity(PortParity parity)
{
    uart_parity_t upp;
    switch (parity)
    {
    case ParityNone:
        upp = UART_PARITY_DISABLE;
        break;
    case ParityEven:
        upp = UART_PARITY_EVEN;
        break;
    case ParityOdd:
        upp = UART_PARITY_ODD;
        break;
    default:
        return false;
    }

    return uart_set_parity(portNum, upp) == ESP_OK;
}

bool Port::setStopBits(PortStopBits portStopBits)
{
    return uart_set_stop_bits(portNum, portStopBits == PortStopBitsOne ? UART_STOP_BITS_1 : UART_STOP_BITS_2) == ESP_OK;
}