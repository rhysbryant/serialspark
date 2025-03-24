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
#include "Router.h"
#include <nvs_flash.h>
#include "Json.h"
#include <functional>

using SimpleHTTP::Request;
using SimpleHTTP::Response;

class UserAuthManager
{
private:
    struct User
    {
        const char *userName;
        const char *password;
    };
    static int cachedUserCount;

public:
    static void getTokenloginPOSTRequest(Request *req, Response *resp);
    static void updateLoginPOSTRequest(Request *req, Response *resp);
    static bool assertTokenValid(Request *req, Response *resp);
    static bool fromJSON(Json &json, User *user);
    static bool fromJSONRequest(Request *req, Response *resp, User *user);

    static bool userNameStringIsValid(const char *value);
    static bool userPasswordStringIsValid(const char *value);
    static bool getAuthHash(const User *user, uint8_t *hashOut);
    static bool checkUserCreds(const User *user);
    static bool storeUserCreds(const User *user);
    static int getUserCount();
};