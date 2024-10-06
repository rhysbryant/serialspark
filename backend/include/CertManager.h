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
#include <nvs_flash.h>

using SimpleHTTP::Request;
using SimpleHTTP::Response;

class CertManager
{
public:
    static void certPutRequest(Request *req, Response *resp);
    static void certGETConfigRequest(Request *req, Response *resp);
    static int loadTLSCertAndPK();

private:
    typedef struct
    {
        char *data;
        size_t size;
    } NVSBlobItem;
    static esp_err_t getNVSBlob(nvs_handle_t, const char *, NVSBlobItem *);
    static const char *NVSKeyNameCertChain;
    static const char *NVSKeyNamePrivateKey;
    static void writeErrorResponse(esp_err_t err, Response *resp);
    static void writeMbedTLSErrorResponse(int err, Response *resp);
    static char *certBuffer;
    static char *certBufferPos;
};