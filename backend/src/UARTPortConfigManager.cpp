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
#include "UARTPortConfigManager.h"
#include "PortManager.h"
#include "UserAuthSessionManager.h"
#include "NVSClass.h"
#include "esp_log.h"
#include "driver/gpio.h"

void UARTPortConfigManager::portConfigRequest(Request *req, Response *resp)
{
    if (!UserAuthSessionManager::checkTokenValid(req, resp))
    {
        return;
    }

    if (req->method == Request::GET)
    {
        portConfigGETRequest(req, resp);
        return;
    }
    else if (req->method == Request::PUT)
    {
        portConfigPUTRequest(req, resp);
    }
    else
    {
        resp->writeHeader(Response::MethodNotAllowed);
    }
}

void UARTPortConfigManager::portConfigGETRequest(Request *req, Response *resp)
{

    Json response = Json::createArray();

    for (int i = 0; i < NumUARTs; i++)
    {

        UARTPortConfig cfg;
        if (getPortConfig(i, &cfg))
        {
            Json entry = response.addArrayObjectItem();
            auto defaultsObject = entry.addObject("defaults");

            toJSON(&cfg, entry);
            toJSON(&defaults[i], defaultsObject);
        }
    }

    response.writeJsonToResponse(resp);
}

void UARTPortConfigManager::portConfigPUTRequest(Request *req, Response *resp)
{

    Json json = Json::loadJsonFromRequest(req, resp);
    if (json.isNull())
    {
        return;
    }

    UARTPortConfig uartCfg;
    if (!fromJSON(json, &uartCfg))
    {
        resp->writeHeader(Response::BadRequest);
        resp->write("missing fields");
        return;
    }

    int gpio[] = {uartCfg.TXIONum, uartCfg.RXIONum, uartCfg.RTSIONum, uartCfg.CTSIONum};
    const char *fields[] = {JsonFieldTXIONum, JsonFieldRXIONum, JsonFieldRTSIONum, JsonFieldCTSIONum};

    Json response;
    Json invalidFields = response.addArray("invalidFields");
    string errorMesssage;
    int invalidCount = 0;

    for (int i = 0; i < (sizeof(gpio) / sizeof(gpio[0])); i++)
    {
        if (gpio[i] != -1 && !GPIO_IS_VALID_GPIO(gpio[i]))
        {
            auto str = Json::createString(fields[i]);
            invalidFields.addArrayItem(str);
            invalidCount++;
        }
    }

    if (invalidCount > 0)
    {
        errorMesssage = "some GPIO numbers are invalid";
    }
    else if (uartCfg.num < 0 || uartCfg.num >= PortManager::portCount)
    {
        errorMesssage = "invalid uart num";
    }
    else if (!applyPortChange(true, uartCfg.num, &uartCfg))
    {
        errorMesssage = "GPIO change apply failed";
    }
    else if (!setPortConfig(uartCfg.num, &uartCfg))
    {
        resp->writeHeader(Response::InternalServerError);
        errorMesssage = "save failed";
    }

    if (errorMesssage.length() > 0)
    {
        resp->writeHeader(Response::BadRequest);
        response.addField("message", errorMesssage.c_str());
        response.writeJsonToResponse(resp);
    }
}

bool UARTPortConfigManager::fromJSON(Json &json, UARTPortConfig *cfg)
{
    double tmp = 0;
    if (!json.getNumberField(JsonFieldRXIONum, &tmp))
    {
        return false;
    }

    cfg->RXIONum = tmp;

    if (!json.getNumberField(JsonFieldTXIONum, &tmp))
    {
        return false;
    }

    cfg->TXIONum = tmp;

    if (!json.getNumberField(JsonFieldCTSIONum, &tmp))
    {
        return false;
    }

    cfg->CTSIONum = tmp;

    if (!json.getNumberField(JsonFieldRTSIONum, &tmp))
    {
        return false;
    }

    cfg->RTSIONum = tmp;

    if (!json.getNumberField(JsonFieldNum, &tmp))
    {
        return false;
    }

    cfg->num = tmp;

    bool enabled;

    if (!json.getBoolField(JsonFieldEnabled, &enabled))
    {
        return false;
    }

    cfg->enabled = enabled;

    return true;
}

bool UARTPortConfigManager::toJSON(const UARTPortConfig *cfg, Json &json)
{

    json.addField(JsonFieldName, cfg->name);
    json.addField(JsonFieldNum, cfg->num);
    json.addField(JsonFieldEnabled, cfg->enabled);
    json.addField(JsonFieldRXIONum, cfg->RXIONum);
    json.addField(JsonFieldTXIONum, cfg->TXIONum);
    json.addField(JsonFieldCTSIONum, cfg->CTSIONum);
    json.addField(JsonFieldRTSIONum, cfg->RTSIONum);

    return true;
}

bool UARTPortConfigManager::getPortConfig(int uartNum, UARTPortConfig *cfg)
{

    if (uartNum >= NumUARTs)
    {
        return false;
    }

    // start with default
    *cfg = defaults[uartNum];

    // try to load any overrides
    NVS uartSavedConfig("UART");
    char buf[6] = "";
    size_t size = sizeof(buf);

    // ensure the name always remains the same by using the default
    auto name = defaults[uartNum].name;

    auto err = uartSavedConfig.get(name, buf, size);

    if (err == ESP_OK)
    {
        cfg->TXIONum = buf[0];
        cfg->RXIONum = buf[1];
        cfg->RTSIONum = buf[3];
        cfg->CTSIONum = buf[4];
        cfg->enabled = buf[5];

        ESP_LOGI(__FUNCTION__, "loaded saved UART GPIO config for UART %s", cfg->name);
    }
    else if (err != ESP_ERR_NVS_NOT_FOUND)
    {
        ESP_LOGE(__FUNCTION__, "got error code %d trying to load saved UART GPIO config for UART %s", (int)err, cfg->name);
    }

    return true;
}

bool UARTPortConfigManager::setPortConfig(int uartNum, const UARTPortConfig *cfg)
{
    if (uartNum >= NumUARTs)
    {
        return false;
    }

    // try to load any overrides
    NVS uartSavedConfig("UART");
    char buf[6] = "";
    size_t size = sizeof(buf);
    buf[5] = cfg->enabled;
    buf[4] = cfg->CTSIONum;
    buf[3] = cfg->RTSIONum;
    buf[1] = cfg->RXIONum;
    buf[0] = cfg->TXIONum;

    // ensure the name always remains the same by using the default
    auto name = defaults[uartNum].name;

    return uartSavedConfig.set(name, buf, size) == ESP_OK && uartSavedConfig.commit() == ESP_OK;
}

bool UARTPortConfigManager::applyPortChange(bool apply, int uartNum, const UARTPortConfig *cfg)
{
    if (uartNum >= PortManager::portCount)
    {
        return false;
    }

    esp_err_t result = 0;
    Port *port = (Port *)&PortManager::ports[uartNum];
    if (apply)
    {
        result = port->applyGPIOPinChange(cfg->TXIONum, cfg->RXIONum, cfg->RTSIONum, cfg->CTSIONum);
    }
    else
    {
        result = port->setGPIOPins(cfg->TXIONum, cfg->RXIONum, cfg->RTSIONum, cfg->CTSIONum);
    }

    return result == ESP_OK;
}

void UARTPortConfigManager::init()
{

    for (int i = 0; i < NumUARTs; i++)
    {

        UARTPortConfig cfg;
        if (getPortConfig(i, &cfg))
        {

            bool valid = true;

            int gpio[] = {cfg.TXIONum, cfg.RXIONum, cfg.RTSIONum, cfg.CTSIONum};

            for (int g = 0; i < (sizeof(gpio) / sizeof(gpio[0])); g++)
            {
                if (gpio[g] != -1 && !GPIO_IS_VALID_GPIO(gpio[g]))
                {
                    ESP_LOGE(__FUNCTION__, "uart %d has invalid GPIO %d skipping", i, gpio[g]);
                    valid = false;
                    break;
                }
            }

            // setting invalid pins in main appears to result in a bootloop
            //  so the first pin cage will be applied when the port is opened
            // edit may be fixed by above but will keep this approch anyway
            if (valid && !applyPortChange(false, i, &cfg))
            {
                ESP_LOGE(__FUNCTION__, "setting GPIO pins for uart %d failed", i);
            }
        }
    }
}

const char *UARTPortConfigManager::JsonFieldNum = "num";
const char *UARTPortConfigManager::JsonFieldName = "name";
const char *UARTPortConfigManager::JsonFieldEnabled = "enabled";
const char *UARTPortConfigManager::JsonFieldTXIONum = "TXIONum";
const char *UARTPortConfigManager::JsonFieldRXIONum = "RXIONum";
const char *UARTPortConfigManager::JsonFieldRTSIONum = "RTSIONum";
const char *UARTPortConfigManager::JsonFieldCTSIONum = "CTSIONum";