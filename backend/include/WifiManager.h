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
#include "cJSON.h"
#include "esp_wifi.h"
#include "Response.h"
#include "Request.h"
#include "cJSON.h"
#include <map>

using SimpleHTTP::Request;
using SimpleHTTP::Response;
//HTTP API for wifi config
class WIfiManager
{
public:
    static void wifiConfigRequest(Request *req, Response *resp);
    static void wifiScanRequest(Request *req, Response *resp);

private:
    static void wifiConfigRequestGET(Request *req, Response *resp);
    static void wifiConfigRequestPUT(Request *req, Response *resp);

    struct WifiNetwork {
        const char* ssid;
        int authType;
        const char* psk;
        const char* IPAddr;
    };

    static char* getIPAddress(const char* IFname);
    static bool readWifiNetworkFromJSON(cJSON *json,WifiNetwork* network);
    static void writeWifiNetworkToJSON(cJSON *json,WifiNetwork* network);
    struct WIFISecurityType {
        const char* name;
        const wifi_auth_mode_t securityType;
    } ;
    
    static constexpr const WIFISecurityType WIFISecurityTypes[] = {
    {"Open",WIFI_AUTH_OPEN},
    {"WEP",WIFI_AUTH_WEP},
    {"WPA",WIFI_AUTH_WPA_PSK},
    {"WPA2",WIFI_AUTH_WPA2_PSK},
    {"WPA/WPA2",WIFI_AUTH_WPA_WPA2_PSK},
    //"ENTERPRISE",
    //"WPA2-ENTERPRISE",
    {"WPA3",WIFI_AUTH_WPA3_PSK},
    {"WPA2/WPA3",WIFI_AUTH_WPA2_WPA3_PSK},
    //"WAPI-PSK",
    //"OWE",
    //"WPA3-ENT-192",
    {"Highest",WIFI_AUTH_MAX}
    };

    static const int WIFISecurityTypesCount = sizeof(WIFISecurityTypes) / sizeof(WIFISecurityType);

    static const WIFISecurityType* findWIFISecurityTypeByTypeID(wifi_auth_mode_t securityType);
    static const WIFISecurityType* findWIFISecurityTypeByTypeName(char* securityTypeName);
    class JsonOutput
    {
    public:
        enum TopLevelType
        {
            ARRAY,
            OBJECT
        };

    private:
        bool sentFirst;
        Response *response;
        const TopLevelType topLevelType;

    public:
        JsonOutput(Response *resp, TopLevelType type);
        bool sendHeaders();
        bool outputJSON(cJSON *json);

        bool end();
    };
};