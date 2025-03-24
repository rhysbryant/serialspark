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
#include "CertManager.h"
#include "UserAuthSessionManager.h"
#include "Json.h"
extern "C"
{

#include "mbedtls/x509.h"
#include "mbedtls/error.h"
#include "mbedtls/debug.h"
}

#include "SecureServer.h"
#include "esp_log.h"

using SimpleHTTP::SecureServer;

void CertManager::certPutRequest(Request *req, Response *resp)
{
    if (!UserAuthSessionManager::checkTokenValid(req, resp))
    {
        return;
    }
    if (req->method != Request::PUT)
    {
        resp->writeHeader(Response::NotFound);
        resp->write("method not supported");
        return;
    }

    if (certBuffer == 0)
    {
        certBuffer = new char[4096];
        certBufferPos = certBuffer;
    }

    int certBufferSize = 4095 - (certBufferPos - certBuffer);
    auto hasMoreData = req->readBody(certBufferPos, &certBufferSize) == SimpleHTTP::MoreData;

    certBufferPos += certBufferSize;
    if (hasMoreData)
    {
        return;
    }

    nvs_handle_t nvsHandle = 0;
    auto result = nvs_open("SSL", NVS_READWRITE, &nvsHandle);
    if (result != ESP_OK)
    {
        writeErrorResponse(result, resp);
        return;
    }

    int size = certBufferPos - certBuffer;
    if (req->path == "/tls/cert")
    {
        mbedtls_x509_crt chain;
        mbedtls_x509_crt_init(&chain);
        certBuffer[size] = 0;
        auto parseResult = mbedtls_x509_crt_parse(&chain, (unsigned const char *)certBuffer, size + 1);
        mbedtls_x509_crt_free(&chain);
        if (parseResult)
        {
            writeMbedTLSErrorResponse(parseResult, resp);

            delete certBuffer;
            certBuffer = 0;
            return;
        }

        result = nvs_set_blob(nvsHandle, NVSKeyNameCertChain, certBuffer, size);
    }
    else if (req->path == "/tls/pk")
    {
        mbedtls_pk_context pk;
        mbedtls_pk_init(&pk);
        certBuffer[size] = 0;
        auto pkParseResult = mbedtls_pk_parse_key(&pk, (const unsigned char *)certBuffer, size + 1, NULL, 0,
                                                  mbedtls_ctr_drbg_random, 0);
        mbedtls_pk_free(&pk);
        if (pkParseResult)
        {
            writeMbedTLSErrorResponse(pkParseResult, resp);

            delete certBuffer;
            certBuffer = 0;
            return;
        }

        result = nvs_set_blob(nvsHandle, NVSKeyNamePrivateKey, certBuffer, size);
    }

    if (result != ESP_OK)
    {
        writeErrorResponse(result, resp);
        return;
    }

    result = nvs_commit(nvsHandle);
    if (result != ESP_OK)
    {
        writeErrorResponse(result, resp);
        return;
    }

    nvs_close(nvsHandle);
    resp->write("Saved");
    delete certBuffer;
    certBuffer = 0;
}

esp_err_t CertManager::getNVSBlob(nvs_handle_t nvs, const char *key, NVSBlobItem *item)
{
    size_t size = 0;
    auto result = nvs_get_blob(nvs, key, 0, &size);
    if (result != ESP_OK)
    {
        return result;
    }

    auto buf = new char[size + 1];
    buf[size] = 0;

    result = nvs_get_blob(nvs, key, buf, &size);
    if (result != ESP_OK)
    {
        return result;
    }

    item->data = buf;
    item->size = size + 1;

    return ESP_OK;
}

void CertManager::writeErrorResponse(esp_err_t err, Response *resp)
{
    resp->writeHeader(Response::BadRequest);
    auto msg = esp_err_to_name(err);
    if (msg)
    {
        resp->write(msg);
    }
    else
    {
        resp->write("error");
    }
}

void CertManager::writeMbedTLSErrorResponse(int err, Response *resp)
{
    auto errStr = mbedtls_high_level_strerr(err);
    if (errStr)
    {
        resp->writeHeader(Response::BadRequest);
        resp->write(errStr);
    }
    else
    {
        resp->write("error");
    }
}
/*
 * no auth required because this only returns info that could be gathered from the cert anyway
 */
void CertManager::certGETConfigRequest(Request *req, Response *resp)
{
    if (req->method != Request::GET)
    {
        resp->writeHeader(Response::NotFound);
        resp->write("method not supported");
        return;
    }
    nvs_handle_t nvsHandle = 0;
    auto result = nvs_open("SSL", NVS_READWRITE, &nvsHandle);
    if (result != ESP_OK)
    {
        writeErrorResponse(result, resp);
        return;
    }

    Json cfg;
    auto certInfo = SecureServer::getCertChain();

    char name[512] = "";
    if (certInfo)
    {
        auto result = mbedtls_x509_dn_gets(name, sizeof(name), &certInfo->subject);
        cfg.addField("certResult", result);
        cfg.addField("commonName", name);
    }

    cfg.writeJsonToResponse(resp);
}

esp_err_t CertManager::loadTLSCertAndPK()
{
    nvs_handle_t nvsHandle = 0;
    auto result = nvs_open("SSL", NVS_READONLY, &nvsHandle);
    if (result != ESP_OK)
    {
        ESP_LOGE(__FUNCTION__, "nvs_open failed error %d", (int)result);
        return result;
    }

    NVSBlobItem item = {};

    result = getNVSBlob(nvsHandle, NVSKeyNameCertChain, &item);
    if (result != ESP_OK)
    {
        nvs_close(nvsHandle);
        ESP_LOGE(__FUNCTION__, "get blob %s failed error %d", NVSKeyNameCertChain, (int)result);
        return result;
    }

    SimpleHTTP::SimpleString cert = {
        item.data,
        (int)item.size};

    auto certLoadResult = SecureServer::loadCert(&cert);
    delete cert.value;
    if (certLoadResult != 0)
    {
        nvs_close(nvsHandle);
        ESP_LOGE(__FUNCTION__, "load cert failed error %d", certLoadResult);
        return certLoadResult;
    }

    result = getNVSBlob(nvsHandle, NVSKeyNamePrivateKey, &item);
    nvs_close(nvsHandle);
    if (result != ESP_OK)
    {
        ESP_LOGE(__FUNCTION__, "get blob %s failed error %d", NVSKeyNamePrivateKey, (int)result);
        return result;
    }

    SimpleHTTP::SimpleString pk = {
        item.data,
        (int)item.size};

    auto pkLoadResult = SecureServer::loadPrivateKey(&pk);
    delete pk.value;
    if (pkLoadResult != 0)
    {
        ESP_LOGE(__FUNCTION__, "load key failed error %d", pkLoadResult);
        return pkLoadResult;
    }

    return 0;
}

char *CertManager::certBuffer = 0;
char *CertManager::certBufferPos = 0;
const char *CertManager::NVSKeyNameCertChain = "cert";
const char *CertManager::NVSKeyNamePrivateKey = "pk";