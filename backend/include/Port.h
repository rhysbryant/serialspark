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

#ifndef PORT_H
#define PORT_H
#include <stdint.h>
#include <functional>
extern "C"
{
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/semphr.h"
}
//ESP UART Port Wrapper
class Port
{
private:
    bool continuesReadEnabled;
    TaskHandle_t readTask;
    SemaphoreHandle_t readLock;
    char readBuffer[1024];

    void resumeRead();
    void suspendRead();

    void readLoop();
    static void readLoop(void *arg);
    bool ready;
    std::function<void(char *, uint16_t)> callback;
public:


    const int portNum;
    const char *portName;
    static const int reservedBufferHeadSpace = 1;
    Port(const int portNum, const char *name, int RXPin, int TXPin);
    
    int read(char *buf, uint32_t bufLen, int timeout);
    
    int write(char *src, uint32_t len);
    
    void startContinuesRead();
    
    void stopContinuesRead();

    bool setDataBitsLength(uint8_t size);
    
    bool setBandRate(uint32_t value);

    void setContinuesReadOnDataCallback(std::function<void(char *, uint16_t)>  cb)
    {
        callback = cb;
    };
    bool init();

    enum PortParity
    {
        ParityNone = 0,
        ParityOdd,
        ParityEven,
        ParityMark,
        ParitySpace
    };

    bool setParity(PortParity parity);

    enum PortStopBits
    {
        PortStopBitsOne = 0,
        PortStopBitsTwo = 1,
    };

    bool setStopBits(PortStopBits portStopBits);
};
#endif