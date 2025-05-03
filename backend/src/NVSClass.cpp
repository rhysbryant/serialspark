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
#include "NVS.h"
#include <nvs_flash.h>
#include <nvs.h>
#include "NVSClass.h"
#include "esp_log.h"

NVS::NVS(const char *namespace_name)
{
    // Store the namespace for future NVS operations
    _namespace = namespace_name;
    _handle = NullHandle;
    _is_open_for_write = false;
}

NVS::~NVS()
{
    // Ensure the NVS store is closed
    if (_handle != NullHandle)
    {
        close();
    }
}

esp_err_t NVS::openForRead()
{
    if (_handle == NullHandle)
    {
        esp_err_t err = nvs_open(_namespace, NVS_READONLY, &_handle);
        if (err != ESP_OK)
        {
            ESP_LOGW(__FUNCTION__, "failed code %d", (int)err);
            return err;
        }
    }
    return ESP_OK;
}

esp_err_t NVS::openForWrite()
{
    if (_handle == NullHandle)
    {
        esp_err_t err = nvs_open(_namespace, NVS_READWRITE, &_handle);
        if (err != ESP_OK)
        {
            return err;
        }
    }
    _is_open_for_write = true;
    return ESP_OK;
}

void NVS::close()
{
    if (_handle != NullHandle)
    {
        nvs_close(_handle);
        _handle = NullHandle;
    }
}

esp_err_t NVS::set(const char *name, const char *value)
{
    esp_err_t err = openForWrite();
    if (err != ESP_OK)
    {
        return err;
    }

    return nvs_set_str(_handle, name, value);
}

esp_err_t NVS::set(const char *name, const char *value, size_t length)
{
    esp_err_t err = openForWrite();
    if (err != ESP_OK)
    {
        return err;
    }

    return nvs_set_blob(_handle, name, value, length);
}

esp_err_t NVS::set(const char *name, int32_t value)
{
    esp_err_t err = openForWrite();
    if (err != ESP_OK)
    {
        return err;
    }

    return nvs_set_i32(_handle, name, value);
}

esp_err_t NVS::set(const char *name, int16_t value)
{
    esp_err_t err = openForWrite();
    if (err != ESP_OK)
    {
        return err;
    }

    return nvs_set_i16(_handle, name, value);
}

esp_err_t NVS::set(const char *name, int8_t value)
{
    esp_err_t err = openForWrite();
    if (err != ESP_OK)
    {
        return err;
    }

    return nvs_set_i8(_handle, name, value);
}

esp_err_t NVS::get(const char *name, char *value, size_t &length)
{
    esp_err_t err = openForRead();
    if (err != ESP_OK)
    {
        return err;
    }

    return nvs_get_blob(_handle, name, value, &length);
}

esp_err_t NVS::get(const char *name, int32_t &value)
{
    esp_err_t err = openForRead();
    if (err != ESP_OK)
    {
        return err;
    }

    return nvs_get_i32(_handle, name, &value);
}

esp_err_t NVS::get(const char *name, int16_t &value)
{
    esp_err_t err = openForRead();
    if (err != ESP_OK)
    {
        return err;
    }

    return nvs_get_i16(_handle, name, &value);
}

esp_err_t NVS::get(const char *name, int8_t &value)
{
    esp_err_t err = openForRead();
    if (err != ESP_OK)
    {
        return err;
    }

    return nvs_get_i8(_handle, name, &value);
}

esp_err_t NVS::getEntryCount(size_t &count)
{
    esp_err_t err = openForRead();
    if (err != ESP_OK)
    {
        return err;
    }

    return nvs_get_used_entry_count(_handle, &count);
}

esp_err_t NVS::commit()
{
    if (_handle != NullHandle)
    {
        esp_err_t err = nvs_commit(_handle);
        if (err != ESP_OK)
        {
            ESP_LOGE(__FUNCTION__, "failed code %d", (int)err);
        }
        return err;
    }
    return ESP_ERR_NVS_INVALID_HANDLE;
}
