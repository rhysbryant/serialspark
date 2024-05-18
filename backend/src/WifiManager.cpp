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

#include "WifiManager.h"
#include "esp_log.h"

using SimpleHTTP::Request;
using SimpleHTTP::Response;

WIfiManager::JsonOutput::JsonOutput(Response *resp, TopLevelType type) : response(resp), topLevelType(type)
{
    sentFirst = false;
}

bool WIfiManager::JsonOutput::sendHeaders()
{

    response->writeHeaderLine("Content-Type", "text/json");
    response->write(topLevelType == JsonOutput::ARRAY ? "[" : "{", 1);

    return true;
}

bool WIfiManager::JsonOutput::outputJSON(cJSON *json)
{
    if (!sentFirst)
    {
        sendHeaders();
    }
    else
    {
        response->write(",", 1);
    }

    auto str = cJSON_PrintUnformatted(json);
    auto length = strlen(str);
    response->write(str, length);
    delete str;
    sentFirst = true;
    return true;
}
bool WIfiManager::JsonOutput::end()
{
    if (!sentFirst)
    {
        sendHeaders();
    }

    response->write(topLevelType == JsonOutput::ARRAY ? "]" : "}", 1);

    return true;
}

const WIfiManager::WIFISecurityType *WIfiManager::findWIFISecurityTypeByTypeID(wifi_auth_mode_t securityType)
{
    for (int i = 0; i < WIFISecurityTypesCount; i++)
    {
        auto current = &WIFISecurityTypes[i];
        if (current->securityType == securityType)
        {
            return current;
            break;
        }
    }
    return nullptr;
}

const WIfiManager::WIFISecurityType *WIfiManager::findWIFISecurityTypeByTypeName(char *securityTypeName)
{
    for (int i = 0; i < WIFISecurityTypesCount; i++)
    {
        auto current = &WIFISecurityTypes[i];
        if (strcmp(securityTypeName, current->name) == 0)
        {
            return current;
            break;
        }
    }
    return nullptr;
}

void WIfiManager::wifiConfigRequest(Request *req, Response *resp)
{
    if (req->method == Request::GET)
    {
        wifiConfigRequestGET(req, resp);
    }
    else if (req->method == Request::PUT)
    {
        wifiConfigRequestPUT(req, resp);
    }
    else
    {
        resp->writeHeader(Response::BadRequest);
        const char msg[] = "Unsupported Method";
        resp->write(msg, sizeof(msg) - 1);
    }
}

void WIfiManager::wifiConfigRequestGET(Request *req, Response *resp)
{
    auto root = cJSON_CreateObject();

    wifi_config_t staCfg;
    if (esp_wifi_get_config(WIFI_IF_STA, &staCfg) == ESP_OK)
    {

        auto sta = cJSON_CreateObject();
        auto n = WifiNetwork{ssid : (const char *)staCfg.sta.ssid, authType : -1};

        writeWifiNetworkToJSON(sta, &n);
        cJSON_AddItemToObjectCS(root, "sta", sta);
    }

    wifi_config_t apCfg;
    if (esp_wifi_get_config(WIFI_IF_AP, &apCfg) == ESP_OK)
    {
        auto ap = cJSON_CreateObject();
        auto n = WifiNetwork{ssid : (const char *)apCfg.ap.ssid, authType : apCfg.ap.authmode};
        writeWifiNetworkToJSON(ap, &n);

        auto supportedAuthModes = cJSON_AddArrayToObject(ap, "supportedSecurityTypes");
        for (int i = 0; i < WIFISecurityTypesCount; i++)
        {
            auto current = &WIFISecurityTypes[i];
            auto item = cJSON_CreateStringReference(current->name);
            cJSON_AddItemToArray(supportedAuthModes, item);
        }

        cJSON_AddNumberToObject(ap, "channel", apCfg.ap.channel);
        cJSON_AddItemToObjectCS(root, "ap", ap);
    }

    resp->writeHeaderLine("Content-Type", "text/json");
    auto str = cJSON_PrintUnformatted(root);
    auto length = strlen(str);
    resp->write(str, length);
    delete str;
    cJSON_Delete(root);
}

void WIfiManager::writeWifiNetworkToJSON(cJSON *json, WifiNetwork *network)
{
    if (network->ssid != nullptr)
    {
        cJSON_AddStringToObject(json, "name", network->ssid);
    }

    auto t = findWIFISecurityTypeByTypeID((wifi_auth_mode_t)network->authType);
    if (t != nullptr)
    {
        cJSON_AddStringToObject(json, "securityType", t->name);
    }
}

bool WIfiManager::readWifiNetworkFromJSON(cJSON *json, WifiNetwork *network)
{
    if (json == nullptr)
    {
        return false;
    }

    auto nameObj = cJSON_GetObjectItemCaseSensitive(json, "name");
    if (nameObj == nullptr)
    {
        return false;
    }
    network->ssid = cJSON_GetStringValue(nameObj);

    auto pskObj = cJSON_GetObjectItemCaseSensitive(json, "psk");
    if (pskObj == nullptr)
    {
        return false;
    }
    network->psk = cJSON_GetStringValue(pskObj);

    auto securityTypeObj = cJSON_GetObjectItemCaseSensitive(json, "securityType");
    if (securityTypeObj != nullptr)
    {
        auto strType = cJSON_GetStringValue(securityTypeObj);
        auto t = findWIFISecurityTypeByTypeName(strType);
        if (t == nullptr)
        {
            return false;
        }
        network->authType = t->securityType;
    }
    else
    {
        network->authType = -1;
    }

    return true;
}

void WIfiManager::wifiConfigRequestPUT(Request *req, Response *resp)
{

    char buffer[512] = "";
    int size = sizeof(buffer);

    auto bodyReadResult = req->readBody(buffer, &size);
    if (bodyReadResult != SimpleHTTP::OK)
    {
        // want to read the entire body in a single read
        // wifiConfigRequestPUT() will be called again once more data is in the buffer
        if (bodyReadResult == SimpleHTTP::MoreData)
        {
            req->unReadBody();
        }
        return;
    }

    auto jsonRequest = cJSON_ParseWithLength(buffer, size);
    if (jsonRequest == nullptr)
    {
        resp->writeHeader(Response::BadRequest);
        return;
    }

    auto jsonResponse = cJSON_CreateObject();

    auto sta = cJSON_GetObjectItemCaseSensitive(jsonRequest, "sta");
    if (sta != nullptr)
    {
        string staError;
        WifiNetwork network = {0};
        if (readWifiNetworkFromJSON(sta, &network))
        {
            wifi_config_t staCfg;
            if (esp_wifi_get_config(WIFI_IF_STA, &staCfg) == ESP_OK)
            {
                if (network.ssid != 0)
                {
                    strcpy((char *)staCfg.sta.ssid, network.ssid);
                }

                if (network.psk != 0)
                {
                    strcpy((char *)staCfg.sta.password, network.psk);
                }

                auto setConfigResult = esp_wifi_set_config(WIFI_IF_STA, &staCfg);
                if (setConfigResult != ESP_OK)
                {
                    staError = esp_err_to_name(setConfigResult);
                }
            }
            else
            {
                staError = "get config failed";
            }
        }
        else
        {
            staError = "fields missing";
        }

        auto staResponse = cJSON_AddObjectToObject(jsonResponse, "sta");
        if (staError.empty())
        {
            cJSON_AddTrueToObject(staResponse, "success");
        }
        else
        {
            cJSON_AddFalseToObject(staResponse, "success");
            cJSON_AddStringToObject(staResponse, "message", staError.c_str());
        }
    }

    auto ap = cJSON_GetObjectItemCaseSensitive(jsonRequest, "ap");
    if (ap != nullptr)
    {
        string apError;
        WifiNetwork network = {};
        if (readWifiNetworkFromJSON(ap, &network))
        {
            wifi_config_t apCfg;
            if (esp_wifi_get_config(WIFI_IF_AP, &apCfg) == ESP_OK)
            {
                if (network.ssid != 0)
                {
                    strcpy((char *)apCfg.ap.ssid, network.ssid);
                }

                if (network.psk != 0)
                {
                    strcpy((char *)apCfg.ap.password, network.psk);
                }

                if (network.authType != -1)
                {
                    apCfg.ap.authmode = (wifi_auth_mode_t)network.authType;
                }

                auto setConfigResult = esp_wifi_set_config(WIFI_IF_AP, &apCfg);
                if (setConfigResult != ESP_OK)
                {
                    apError = esp_err_to_name(setConfigResult);
                }
            }
            else
            {
                apError = "get config failed";
            }
        }
        else
        {
            apError = "fields missing";
        }

        auto apResponse = cJSON_AddObjectToObject(jsonResponse, "ap");
        if (apError.empty())
        {
            cJSON_AddTrueToObject(apResponse, "success");
        }
        else
        {
            cJSON_AddFalseToObject(apResponse, "success");
            cJSON_AddStringToObject(apResponse, "message", apError.c_str());
        }
    }

    cJSON_Delete(jsonRequest);

    resp->writeHeaderLine("Content-Type", "text/json");
    auto str = cJSON_PrintUnformatted(jsonResponse);
    auto length = strlen(str);
    resp->write(str, length);
    delete str;
    cJSON_Delete(jsonResponse);
}

void WIfiManager::wifiScanRequest(Request *req, Response *resp)
{
    JsonOutput jsonOutput(resp, JsonOutput::ARRAY);
    esp_wifi_scan_start(NULL, true);
    uint16_t foundCount = 0;
    if (esp_wifi_scan_get_ap_num(&foundCount) != ESP_OK)
    {
        resp->writeHeader(Response::InternalServerError);
        return;
    }

    if (foundCount > 500)
    {
        foundCount = 500;
    }

    ESP_LOGI(__FUNCTION__, "found %d networks", (int)foundCount);

    wifi_ap_record_t records[10];

    uint16_t returned = 10;
    while (foundCount > 0)
    {
        returned = 10;
        if (esp_wifi_scan_get_ap_records(&returned, records) == ESP_OK)
        {
            ESP_LOGI(__FUNCTION__, "got %d networks", (int)returned);
            foundCount -= returned;
            for (int i = 0; i < returned; i++)
            {
                auto wifiEntry = cJSON_CreateObject();

                auto n = WifiNetwork{ssid : (const char *)(const char *)records[i].ssid,
                                     authType : records[i].authmode};
                writeWifiNetworkToJSON(wifiEntry, &n);

                cJSON_AddNumberToObject(wifiEntry, "signalInfo", records[i].rssi);

                jsonOutput.outputJSON(wifiEntry);
                cJSON_Delete(wifiEntry);
            }
            break;
        }
        else
        {
            break;
        }
    }
    jsonOutput.end();
}