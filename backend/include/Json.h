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
#include "Response.h"

using SimpleHTTP::Request;
using SimpleHTTP::Response;
using SimpleHTTP::Result;

class Json
{
private:
    cJSON *json;
    bool managed;

public:
    Json() : json(cJSON_CreateObject()), managed(true) {};
    Json(cJSON *cJson) : json(cJson), managed(false) {}
    ~Json()
    {
        if (managed)
            cJSON_Delete(json);
    }
    // load json from a request body
    // this will write a bad request response if unable to parse
    static Json loadJsonFromRequest(Request *req, Response *resp);
    bool writeJsonToResponse(Response *resp);

    char *getStringField(const char *key);
    /*
     * add a string field
     */
    void addField(const char *key, const char *value);
    /**
     * add an int field
     */
    void addField(const char *key, int value);
    /**
     * add a boolean field
     */
    void addField(const char *key, bool value);
    /**
     * add an empty object and return the new instance
     */
    Json addObject(const char *key);
    /**
     * return a new instance with the named sub object
     * if the object does not exist isNull() will return true
     */
    Json getObject(const char *key);
    /**
     * returns true if the wrapped cJSON ptr is null
     */
    bool isNull();
};