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
#include "Json.h"

char *Json::getStringField(const char *key)
{
    auto obj = cJSON_GetObjectItemCaseSensitive(json, key);
    if (obj == nullptr)
    {
        return nullptr;
    }

    return cJSON_GetStringValue(obj);
}

void Json::addField(const char *key, const char *value)
{
    auto tmp = cJSON_CreateStringReference(value);
    cJSON_AddItemToObject(json, key, tmp);
}

void Json::addField(const char *key, int value)
{
    cJSON_AddNumberToObject(json, key, value);
}

void Json::addField(const char *key, bool value)
{
    cJSON_AddBoolToObject(json, key, value);
}

Json Json::loadJsonFromRequest(Request *req, Response *resp)
{
    char buffer[512] = "";
    int size = sizeof(buffer);

    auto bodyReadResult = req->readBody(buffer, &size);
    if (bodyReadResult != SimpleHTTP::OK)
    {
        // want to read the entire body in a single read
        if (bodyReadResult == SimpleHTTP::MoreData)
        {
            req->unReadBody();
        }
        return nullptr;
    }

    auto jsonRequest = cJSON_ParseWithLength(buffer, size);
    if (jsonRequest == nullptr)
    {
        return nullptr;
    }

    return Json(jsonRequest);
}

bool Json::writeJsonToResponse(Response *resp)
{
    if (json == nullptr)
    {
        resp->writeHeader(Response::InternalServerError);
        resp->write("null");
        return false;
    }

    resp->writeHeaderLine("Content-Type", "text/json");
    auto str = cJSON_PrintUnformatted(json);
    resp->write(str);
    delete str;

    return true;
}

bool Json::isNull()
{
    return json == nullptr;
}

Json Json::getObject(const char *key)
{
    auto obj = cJSON_GetObjectItemCaseSensitive(json, key);
    if (obj == nullptr)
    {
        return nullptr;
    }
    return obj;
}

Json Json::addObject(const char *key)
{
    return cJSON_AddObjectToObject(json, key);
}