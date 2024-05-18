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

#include <stdio.h>
extern "C"
{
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/uart.h"
#include "driver/gpio.h"
#include "sdkconfig.h"
#include "esp_log.h"
#include "esp_netif.h"
#include "esp_eth.h"
#include "esp_wifi.h"
#include <nvs_flash.h>
#include <sys/param.h>
    void app_main(void);
}

#include "PortManager.h"
#include "Server.h"
#include "SimpleHTTPWebSocketClient.h"
#include <esp_task_wdt.h>
#include "WebsocketManager.h"
#include "WifiManager.h"
#include "EmbeddedFiles.h"
// using SimpleHTTP::Server;
using SimpleHTTP::Websocket;
using SimpleHTTP::WebsocketManager;
#include "webui_files.h"

#include <map>


static void start_stop_handler(void *arg, esp_event_base_t event_base,
                               int32_t event_id, void *event_data)
{
    if (event_id == IP_EVENT_STA_GOT_IP)
    {
       // Server::start();
        esp_wifi_set_ps(WIFI_PS_NONE);
        SimpleHTTP::Server::listen(81);
    }
    else
    {
      //  Server::stop();
    }
}

uint32_t os_getUnixTime()
{
    return esp_log_timestamp();
}

void http_server_thread(void *arg)
{

    while (1)
    {
        SimpleHTTP::Server::process();
        SimpleHTTP::WebsocketManager::process();
        vTaskDelay(1);
    }
}

int s_retry_num = 0;
#define TAG "test"
static void event_handler(void *arg, esp_event_base_t event_base,
                          int32_t event_id, void *event_data)
{
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START)
    {
        esp_wifi_connect();
    }
    else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED)
    {
        if (s_retry_num < 20)
        {
            esp_wifi_connect();
            s_retry_num++;
            ESP_LOGI(TAG, "retry to connect to the AP");
        }
        else
        {
        }
        ESP_LOGI(TAG, "connect to the AP fail");
    }
    else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP)
    {
        ip_event_got_ip_t *event = (ip_event_got_ip_t *)event_data;
        ESP_LOGI(TAG, "got ip:" IPSTR, IP2STR(&event->ip_info.ip));
        // Server::start();
        s_retry_num = 0;
    }
    else
    {
        ESP_LOGI(TAG, "got event %d", (int)event_id);
    }
}

void app_main(void)
{

    PortManager::init();
    esp_log_level_set("*", ESP_LOG_DEBUG);
    ESP_ERROR_CHECK(nvs_flash_init());

    ESP_ERROR_CHECK(esp_netif_init());

    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();
    esp_netif_create_default_wifi_ap();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    SimpleHTTP::Server::listen(81);

    ESP_ERROR_CHECK(esp_event_handler_register(WIFI_EVENT, ESP_EVENT_ANY_ID, event_handler, 0));

    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_APSTA));
    ESP_ERROR_CHECK(esp_wifi_start());

    ESP_ERROR_CHECK(esp_event_handler_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &start_stop_handler, 0));
    ESP_ERROR_CHECK(esp_event_handler_register(WIFI_EVENT, WIFI_EVENT_STA_DISCONNECTED, &start_stop_handler, 0));

    xTaskCreate(http_server_thread, "Server::loop()", configMINIMAL_STACK_SIZE * 20, nullptr, 2, nullptr);

    SimpleHTTP::EmbeddedFilesHandler::addFiles((SimpleHTTP::EmbeddedFile *)files,
     sizeof(files) / sizeof(FileContent),(SimpleHTTP::EmbeddedFileType*)filesType);
    
    SimpleHTTP::Server::setDefaultHandler(SimpleHTTP::EmbeddedFilesHandler::embeddedFilesHandler);
    SimpleHTTP::Server::addHandler("/wifi", WIfiManager::wifiConfigRequest);
    SimpleHTTP::Server::addHandler("/wifi/scan", WIfiManager::wifiScanRequest);

    SimpleHTTP::Server::addHandler("/ws", [](SimpleHTTP::Request *req, SimpleHTTP::Response *resp)
    {
       auto c = new SimpleHTTPWebSocketClient(resp->hijackConnection());
       resp->setSessionArg(c);
       resp->setSessionArgFreeHandler([](void* arg){
            delete static_cast<SimpleHTTPWebSocketClient*>(arg);
       });

        WebsocketManager::upgradeHandler(req,resp); 
    });

    WebsocketManager::setFrameReceivedHandler([](Websocket *sock, SimpleHTTP::Websocket::Frame *frame)
    {
        if( frame->frameType == Websocket::FrameTypeBin ){
            static_cast<SimpleHTTPWebSocketClient*>(sock->getConnection()->sessionArg)->handleMessage((char*)frame->payload,frame->payloadLength);
        } 
    });
    
    
    return;

}