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
#include "UserAuthManager.h"
#include "UserAuthSessionManager.h"
#include "json.h"
#include "esp_log.h"
#include <nvs_flash.h>
// #include "esp_dis.h"
#include "mbedtls/md.h"

bool UserAuthManager::userNameStringIsValid(const char *name)
{
    auto nameLen = strlen(name);
    if (nameLen > 16)
    {
        return false;
    }

    for (int i = 0; i < nameLen; i++)
    {
        if (!((name[i] >= 'a' && name[i] <= 'z') || (name[i] >= 'A' && name[i] <= 'Z') || (name[i] >= '0' && name[i] <= '9')))
        {
            ESP_LOGI(__FUNCTION__, "user name  contains chars other then 0-9 and a-z(A-Z)");
            return false;
        }
    }

    return true;
}

bool UserAuthManager::userPasswordStringIsValid(const char *value)
{
    auto valueLen = strlen(value);
    if (valueLen > 64)
    {
        return false;
    }

    for (int i = 0; i < valueLen; i++)
    {
        if (!(value[i] >= 32 && value[i] <= 126))
        {
            return false;
        }
    }

    return true;
}

bool UserAuthManager::getAuthHash(const User *user, uint8_t *hmacOut)
{

    /**
     * include some kind of variable saddle in the hash
     * in an attempt to make the hash less useful if it's leaked -:)
     * TODO: bcrypt instead of SHA256
     */
    char buf[255] = "";
    char *serialNum;
    // esp_ble_dis_get_serial_number(&serialNum);
    // strcat(buf, serialNum);
    strcat(buf, user->userName);

    mbedtls_md_context_t hmac_ctx;

    mbedtls_md_init(&hmac_ctx);
    if (mbedtls_md_setup(&hmac_ctx, mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), 1) != 0)
    {
        ESP_LOGE(__FUNCTION__, "Failed to setup HMAC context");
        return false;
    }

    if (mbedtls_md_hmac_starts(&hmac_ctx, (const unsigned char *)user->password, strlen(user->password)) != 0)
    {
        ESP_LOGE(__FUNCTION__, "Failed to start HMAC");
        return false;
    }

    if (mbedtls_md_hmac_update(&hmac_ctx, (unsigned char *)buf, strlen(buf)) != 0)
    {
        ESP_LOGE(__FUNCTION__, "Failed to update HMAC");
        return false;
    }

    if (mbedtls_md_hmac_finish(&hmac_ctx, hmacOut) != 0)
    {
        ESP_LOGE(__FUNCTION__, "Failed to finish HMAC");
        return false;
    }

    // Cleanup mbedtls context
    mbedtls_md_free(&hmac_ctx);
    return true;
}

bool UserAuthManager::checkUserCreds(const User *user)
{
    if (!userNameStringIsValid(user->userName))
    {
        return false;
    }

    nvs_handle_t nvsHandle = 0;
    auto result = nvs_open("users", NVS_READONLY, &nvsHandle);
    if (result != ESP_OK)
    {
        ESP_LOGE(__FUNCTION__, "nvs_open failed error %d", (int)result);
        return false;
    }

    char buffer[255] = "";
    size_t length = 33;

    result = nvs_get_blob(nvsHandle, user->userName, buffer, &length);
    nvs_close(nvsHandle);

    if (result != ESP_OK)
    {
        ESP_LOGE(__FUNCTION__, "get str failed error %d", (int)result);
        return false;
    }

    if (length != 33) // 32 byte hash + null
    {
        return false;
    }
    length--;

    uint8_t hmac[32] = {};
    if (getAuthHash(user, hmac) && memcmp(hmac, buffer, length) == 0)
    {
        ESP_LOGI(__FUNCTION__, "length %d", (int)length);
        return true;
    }

    return false;
}

bool UserAuthManager::storeUserCreds(const User *user)
{
    if (!userNameStringIsValid(user->userName) || !userPasswordStringIsValid(user->password))
    {
        return false;
    }

    nvs_handle_t nvsHandle = 0;
    auto result = nvs_open("users", NVS_READWRITE, &nvsHandle);
    if (result != ESP_OK)
    {
        ESP_LOGE(__FUNCTION__, "nvs_open failed error %d", (int)result);
        return result;
    }

    uint8_t hmac[33] = "";
    if (!getAuthHash(user, hmac))
    {
        ESP_LOGE(__FUNCTION__, "failed to get auth hash");
        return false;
    }

    result = nvs_set_blob(nvsHandle, user->userName, hmac, sizeof(hmac));

    if (result != ESP_OK)
    {
        ESP_LOGE(__FUNCTION__, "set str failed error %d", (int)result);
        nvs_close(nvsHandle);
        return false;
    }

    result = nvs_commit(nvsHandle);
    nvs_close(nvsHandle);
    if (result != ESP_OK)
    {
        ESP_LOGE(__FUNCTION__, "nvs commit failed error %d", (int)result);

        return false;
    }

    ESP_LOGI(__FUNCTION__, "updated user %s", user->userName);

    return true;
}

void UserAuthManager::getTokenloginPOSTRequest(Request *req, Response *resp)
{

    if (req->method == Request::GET)
    {
        auto authDisabled = getUserCount() == 0;
        Json j;
        j.addField("sucsess", authDisabled);

        if (authDisabled)
        {
            j.addField("token", UserAuthSessionManager::createSession());
            resp->writeHeader(Response::Ok);
        }
        else
        {
            resp->writeHeader(Response::Unauthorized);
        }
        j.writeJsonToResponse(resp);

        return;
    }

    auto jsonInput = Json::loadJsonFromRequest(req, resp);
    if (jsonInput.isNull())
    {
        resp->writeHeader(Response::BadRequest);
        resp->write("Unable to parse Json");
        return;
    }

    User user = {};
    if (!fromJSON(jsonInput, &user))
    {
        resp->writeHeader(Response::BadRequest);
        resp->write("missing fields");
        return;
    }

    auto testCredsResult = checkUserCreds(&user);

    Json j;
    if (testCredsResult)
    {
        j.addField("token", UserAuthSessionManager::createSession());
    }
    else
    {
        resp->writeHeader(Response::Forbidden);
    }

    j.addField("sucsess", testCredsResult);
    j.writeJsonToResponse(resp);
}

bool UserAuthManager::fromJSON(Json &json, User *user)
{
    user->userName = json.getStringField("user");
    user->password = json.getStringField("password");

    return user->userName != nullptr && user->password != nullptr;
}

void UserAuthManager::updateLoginPOSTRequest(Request *req, Response *resp)
{
    if (!UserAuthSessionManager::checkTokenValid(req, resp))
    {
        return;
    }

    auto jsonInput = Json::loadJsonFromRequest(req, resp);
    if (jsonInput.isNull())
    {
        resp->writeHeader(Response::BadRequest);
        resp->write("Unable to parse Json");
        return;
    }

    auto currentUserObj = jsonInput.getObject("current");
    auto newUserObj = jsonInput.getObject("new");

    if (currentUserObj.isNull() || newUserObj.isNull())
    {
        resp->writeHeader(Response::BadRequest);
        resp->write("required field objects missing");
        return;
    }

    User currentUser = {};
    User newUser = {};
    if (!fromJSON(currentUserObj, &currentUser) || !fromJSON(newUserObj, &newUser))
    {
        resp->writeHeader(Response::BadRequest);
        resp->write("missing fields");
        return;
    }

    // allow for the instal user creation
    if (getUserCount() > 0 && !checkUserCreds(&currentUser))
    {
        resp->writeHeader(Response::Unauthorized);
        resp->write("incorrect existing creds");
        return;
    }

    resp->write("Ok");
}

int UserAuthManager::getUserCount()
{
    nvs_handle_t nvsHandle = 0;
    auto result = nvs_open("users", NVS_READONLY, &nvsHandle);
    if (result != ESP_OK)
    {
        ESP_LOGE(__FUNCTION__, "nvs_open failed error %d", (int)result);
        return 0;
    }

    size_t count = -1;
    result = nvs_get_used_entry_count(nvsHandle, &count);
    nvs_close(nvsHandle);

    return count;
}
int UserAuthManager::cachedUserCount = getUserCount();
