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
#include "UserAuthSessionManager.h"
#include <stdio.h>
#include "mbedtls/sha256.h"
#include "mbedtls/ctr_drbg.h"
#include "esp_log.h"
#include "common.h"

void UserAuthSessionManager::initSessionGenerator()
{

    mbedtls_entropy_init(&entropy);
    mbedtls_ctr_drbg_init(&ctr_drbg);

    int ret = mbedtls_ctr_drbg_seed(&ctr_drbg, mbedtls_entropy_func, &entropy, nullptr, 0);
    if (ret != 0)
    {
        ESP_LOGE(__FUNCTION__, "Failed to initialize CTR_DRBG: -0x%04x\n", -ret);
        return;
    }
}

char *UserAuthSessionManager::createSession()
{
    // Generate random data using CTR_DRBG
    unsigned char random_bytes[32] = ""; // SHA256 output size (256 bits)
    int ret = mbedtls_ctr_drbg_random(&ctr_drbg, random_bytes, sizeof(random_bytes));
    if (ret != 0)
    {
        ESP_LOGE(__FUNCTION__, "Random generation failed: -0x%04x\n", -ret);
        return nullptr;
    }

    // Compute SHA-256 hash of the random bytes
    unsigned char sha256_hash[32];
    mbedtls_sha256(random_bytes, sizeof(random_bytes), sha256_hash, 0); // 0 for SHA-256 (vs SHA-224)

    // Convert the SHA256 hash to a hexadecimal string
    auto session_token = (char *)malloc(65);
    if (!session_token)
    {
        return nullptr;
    }

    for (int i = 0; i < 32; ++i)
    {
        sprintf(&session_token[i * 2], "%02x", sha256_hash[i]);
    }

    sessions[session_token] = esp_log_timestamp();

    return session_token;
}

bool UserAuthSessionManager::updateSessionLastUse(const char *token)
{
    // Check if the token exists
    auto it = sessions.find(const_cast<char *>(token));
    if (it == sessions.end())
    {
        ESP_LOGE(__FUNCTION__, "token %s not known", token);
        return false;
    }

    // Update the last use time with the current time
    it->second = esp_log_timestamp();

    return true;
}

void UserAuthSessionManager::removeExpiredSessions()
{
    uint32_t currentTime = esp_log_timestamp();

    // Iterate through the map and remove expired sessions
    for (auto it = sessions.begin(); it != sessions.end();)
    {
        if (currentTime - it->second > sessionMaxIdleTime)
        {
            // Session has expired, remove it
            free(it->first);
            it = sessions.erase(it);
        }
        else
        {
            ++it;
        }
    }
}

bool UserAuthSessionManager::checkTokenValid(const char *token)
{
    return updateSessionLastUse(token);
}

bool UserAuthSessionManager::checkTokenValid(Request *req, Response *resp)
{
    auto authHeader = req->headers["AUTHENTICATION"];
    if (authHeader.empty() || authHeader.length() < 60 || !authHeader.starts_with("token"))
    {
        resp->writeHeader(Response::Unauthorized);
        resp->write("no auth provided");
        return false;
    }

    auto index = authHeader.find(' ');
    if (index == std::string::npos || !(updateSessionLastUse(authHeader.substr(index + 1).c_str())))
    {
        resp->writeHeader(Response::Forbidden);
        resp->write("auth invalid");
        return false;
    }
    return true;
}

std::map<char *, uint32_t, UserAuthSessionManager::cmp_str> UserAuthSessionManager::sessions;

const uint32_t UserAuthSessionManager::sessionMaxIdleTime;

mbedtls_ctr_drbg_context UserAuthSessionManager::ctr_drbg;
mbedtls_entropy_context UserAuthSessionManager::entropy;
