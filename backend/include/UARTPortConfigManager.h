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
#include "Response.h"
#include "Request.h"
#include "Json.h"
#ifndef UART2_DEFAULT_GPIO_TX
#define UART2_DEFAULT_GPIO_TX -1
#endif
#ifndef UART2_DEFAULT_GPIO_RX
#define UART2_DEFAULT_GPIO_RX -1
#endif
#ifndef UART2_DEFAULT_GPIO_RTS
#define UART2_DEFAULT_GPIO_RTS -1
#endif
#ifndef UART2_DEFAULT_GPIO_CTS
#define UART2_DEFAULT_GPIO_CTS -1
#endif

#ifndef UART0_DEFAULT_GPIO_RTS
#define UART0_DEFAULT_GPIO_RTS -1
#endif
#ifndef UART0_DEFAULT_GPIO_CTS
#define UART0_DEFAULT_GPIO_CTS -1
#endif

#ifndef UART1_DEFAULT_GPIO_RTS
#define UART1_DEFAULT_GPIO_RTS -1
#endif
#ifndef UART1_DEFAULT_GPIO_CTS
#define UART1_DEFAULT_GPIO_CTS -1
#endif

class UARTPortConfigManager
{
private:
    struct UARTPortConfig
    {
        int num;
        const char *name;
        bool enabled;
        int8_t TXIONum;
        int8_t RXIONum;
        int8_t RTSIONum;
        int8_t CTSIONum;
    };

    static constexpr UARTPortConfig defaults[] = {
        {0, "UART 0",
         true,
         UART0_DEFAULT_GPIO_TX,
         UART0_DEFAULT_GPIO_RX,
         UART0_DEFAULT_GPIO_RTS,
         UART0_DEFAULT_GPIO_CTS},
#if (SOC_UART_HP_NUM >= 1)
        {1, "UART 1",
         true,
         UART1_DEFAULT_GPIO_TX,
         UART1_DEFAULT_GPIO_RX,
         UART1_DEFAULT_GPIO_RTS,
         UART1_DEFAULT_GPIO_CTS},
#endif
#if (SOC_UART_HP_NUM > 2)
        {2, "UART 2",
         true,
         UART2_DEFAULT_GPIO_TX,
         UART2_DEFAULT_GPIO_RX,
         UART2_DEFAULT_GPIO_RTS,
         UART2_DEFAULT_GPIO_CTS},
#endif
    };

    static const char *JsonFieldNum;
    static const char *JsonFieldName;
    static const char *JsonFieldEnabled;
    static const char *JsonFieldTXIONum;
    static const char *JsonFieldRXIONum;
    static const char *JsonFieldRTSIONum;
    static const char *JsonFieldCTSIONum;

    static const int NumUARTs = sizeof(defaults) / sizeof(defaults[0]);

    static void getDefaultUARTPortConfig(int uartNum, UARTPortConfig &cfg);
    static void portConfigGETRequest(Request *req, Response *resp);
    static void portConfigPUTRequest(Request *req, Response *resp);

    static bool toJSON(const UARTPortConfig *cfg, Json &json);
    static bool fromJSON(Json &json, UARTPortConfig *cfg);

    static bool getPortConfig(int uartNum, UARTPortConfig *cfg);
    static bool setPortConfig(int uartNum, const UARTPortConfig *cfg);

    static bool applyPortChange(bool apply, int uartNum, const UARTPortConfig *cfg);

public:
    static void portConfigRequest(Request *req, Response *resp);
    static void init();
};
