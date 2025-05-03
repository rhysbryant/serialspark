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
#include <stdint.h>
#include <nvs_flash.h>
/**
 * wrapper for the esp32 idf NVS API
 */
class NVS
{
public:
    NVS(const char *nameSpace);
    /**
     * open the NVS store for reading
     *
     * implicitly called if not open on first call to get
     */
    esp_err_t openForRead();
    /**
     * open the NVS store for writing
     *
     * implicitly called if not open on first call to set
     */
    esp_err_t openForWrite();
    /**
     * closes the NVS store
     * implicitly called in deconstructor if not already closed
     */
    void close();

    ~NVS();
    /**
     * set a string value in the NVS store
     */
    esp_err_t set(const char *name, const char *value);
    /**
     * set a blob type in the NVS store
     */
    esp_err_t set(const char *name, const char *value, size_t length);
    /**
     * set a i32 type in the NVS store
     */
    esp_err_t set(const char *name, int32_t value);
    /**
     * set a i16 type in the NVS store
     */
    esp_err_t set(const char *name, int16_t value);
    /**
     * set a i8 type in the NVS store
     */
    esp_err_t set(const char *name, int8_t value);
    /**
     * get a blob type from the NVS store
     */
    esp_err_t get(const char *name, char *value, size_t &length);
    /**
     * get a i32 type from the NVS store
     */
    esp_err_t get(const char *name, int32_t &value);
    /**
     * get a i16 type from the NVS store
     */
    esp_err_t get(const char *name, int16_t &value);
    /**
     * get a i8 type from the NVS store
     */
    esp_err_t get(const char *name, int8_t &value);

    /**
     * commits any changes to the NVS store
     */
    esp_err_t commit();
    /**
     * get the entry count in the namespace
     */
    esp_err_t getEntryCount(size_t &count);

private:
    const char *_namespace; // Namespace name for the NVS store
    nvs_handle _handle;     // Handle for the NVS store
    const nvs_handle NullHandle = 0;
    bool _is_open_for_write; // Flag to track if NVS is open for writing
};